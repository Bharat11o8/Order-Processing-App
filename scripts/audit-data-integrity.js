const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Normalization helpers
const clean = (str) => str ? str.replace(/['"]+/g, '').trim() : '';
const cleanUpper = (str) => clean(str).toUpperCase();

// Map for "OTHER" models (from import-new-data.js)
const TARGET_MODELS = [
    'BAG', 'BACK REST PAD', 'BODY COVER', 'CHEST GUARD', 'DOCUMENT FOLDER',
    'GLOVES', 'HELMET CAP', 'KEY CHAIN', 'LED', 'MICROFIBER CLOTH',
    'MOBILE HOLDER', 'NET', 'QUILTED SPIKE', 'QUILTING MAT', 'ROPES',
    'SHOE COVER', 'TANK COVER', 'WASHING SPONGE'
];

function mapToTargetModel(csvItemName) {
    const upper = cleanUpper(csvItemName);
    if (TARGET_MODELS.includes(upper)) return upper;
    if (upper.includes('NET')) return 'NET';
    if (upper.includes('BAG')) return 'BAG';
    if (upper.includes('ROPE')) return 'ROPES';
    if (upper.includes('GLOVE')) return 'GLOVES';
    if (upper.includes('CHEST GUARD')) return 'CHEST GUARD';
    if (upper.includes('BODY COVER')) return 'BODY COVER';
    if (upper.includes('BACK REST')) return 'BACK REST PAD';
    if (upper.includes('DOCUMENT')) return 'DOCUMENT FOLDER';
    if (upper.includes('LED')) return 'LED';
    if (upper.includes('CLOTH')) return 'MICROFIBER CLOTH';
    if (upper.includes('HOLDER')) return 'MOBILE HOLDER';
    if (upper.includes('SPIKE')) return 'QUILTED SPIKE';
    if (upper.includes('MAT')) return 'QUILTING MAT';
    if (upper.includes('TANK COVER')) return 'TANK COVER';
    return upper;
}

async function main() {
    console.log('Starting Full Data Integrity Audit...');

    // 1. Load DB Data
    console.log('Loading database records...');
    const variants = await prisma.productVariant.findMany({
        include: {
            design: {
                include: {
                    model: {
                        include: { oem: true }
                    }
                }
            },
            color: true
        }
    });

    const dbMap = new Map(); // ProductCode -> Variant
    variants.forEach(v => dbMap.set(v.productCode, v));
    console.log(`Loaded ${variants.length} variants from DB.`);

    const errors = [];
    let totalChecked = 0;

    // 2. Check DB 1.csv
    await checkFile('DB 1.csv', dbMap, errors, false);

    // 3. Check autoform (2).csv
    await checkFile('autoform (2).csv', dbMap, errors, true);

    // 4. Report
    console.log('\n' + '='.repeat(50));
    console.log(`AUDIT COMPLETE: Checked ${totalChecked} rows.`);
    console.log('='.repeat(50));

    if (errors.length === 0) {
        console.log('✅ SUCCESS: 100% Match! No discrepancies found.');
    } else {
        console.log(`❌ FOUND ${errors.length} DISCREPANCIES:`);
        errors.slice(0, 50).forEach(e => console.log(e));
        if (errors.length > 50) console.log(`...and ${errors.length - 50} more.`);
    }

    // Helper function to check a file
    async function checkFile(filename, dbMap, errors, isOtherFile) {
        console.log(`\nAuditing ${filename}...`);
        const filePath = path.join(__dirname, '..', filename);
        if (!fs.existsSync(filePath)) {
            console.log(`Skipping ${filename} (not found)`);
            return;
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = lines[i].split(',').map(v => v.trim());
            const row = {};
            headers.forEach((h, index) => {
                row[h] = values[index];
            });

            const code = clean(row['CODE']);
            if (!code) continue;

            totalChecked++;
            const dbRecord = dbMap.get(code);

            if (!dbRecord) {
                errors.push(`[MISSING] Code: ${code} (in ${filename}) not found in DB.`);
                continue;
            }

            // Compare Fields
            const csvOem = isOtherFile ? 'OTHER' : clean(row["OEM's"] || row["OEM's\r"]);
            const csvModelRaw = clean(isOtherFile ? row['PART NO.'] : row['ITEMS']); // Note: Swapped in Other file
            const csvDesignRaw = clean(isOtherFile ? row['ITEMS'] : row['PART NO.']); // Note: Swapped in Other file
            const csvColor = clean(row['COLOUR'] || 'Generic');
            const csvSeat = cleanUpper(row['SEAT'] || 'N/A');

            // Normalize CSV Model Name
            let csvModel = csvModelRaw;
            if (isOtherFile) {
                csvModel = mapToTargetModel(csvModelRaw);
            }

            // 1. OEM Check
            if (dbRecord.design.model.oem.name !== csvOem) {
                errors.push(`[MISMATCH] ${code}: OEM '${dbRecord.design.model.oem.name}' (DB) != '${csvOem}' (CSV)`);
            }

            // 2. Model Check
            // Allow fuzzy match or exact match depending on normalization
            if (dbRecord.design.model.name !== csvModel) {
                // Special case: CSV might have extra spaces or slight variations
                if (dbRecord.design.model.name.trim() !== csvModel.trim()) {
                    errors.push(`[MISMATCH] ${code}: Model '${dbRecord.design.model.name}' (DB) != '${csvModel}' (CSV)`);
                }
            }

            // 3. Design Check
            if (dbRecord.design.name !== csvDesignRaw) {
                // Special case: CSV might have extra spaces
                if (dbRecord.design.name.trim() !== csvDesignRaw.trim()) {
                    errors.push(`[MISMATCH] ${code}: Design '${dbRecord.design.name}' (DB) != '${csvDesignRaw}' (CSV)`);
                }
            }

            // 4. Color Check
            const dbColor = dbRecord.color ? dbRecord.color.name : 'Generic';
            if (dbColor !== csvColor) {
                // Case insensitive check
                if (dbColor.toLowerCase() !== csvColor.toLowerCase()) {
                    errors.push(`[MISMATCH] ${code}: Color '${dbColor}' (DB) != '${csvColor}' (CSV)`);
                }
            }

            // 5. Seat Check
            // DB: null (N/A), SINGLE, DOUBLE
            // CSV: N/A, SINGLE, DOUBLE
            const dbSeat = dbRecord.seatType || 'N/A';
            let csvSeatNormalized = csvSeat;
            if (csvSeat === '' || csvSeat === 'N/A') csvSeatNormalized = 'N/A';
            if (csvSeat === 'DUAL') csvSeatNormalized = 'DOUBLE';

            if (dbSeat !== csvSeatNormalized) {
                errors.push(`[MISMATCH] ${code}: Seat '${dbSeat}' (DB) != '${csvSeatNormalized}' (CSV)`);
            }
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
