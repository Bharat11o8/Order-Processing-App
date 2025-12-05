const fs = require('fs');
const path = require('path');

function main() {
    const filePath = path.join(__dirname, '..', 'DB 1.csv');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    const naSeatDesigns = new Set();
    const otherSeatDesigns = new Set();

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((h, index) => {
            row[h] = values[index];
        });

        const designName = row['PART NO.'] ? row['PART NO.'].replace(/['"]+/g, '').trim() : '';
        const seatRaw = row['SEAT'] ? row['SEAT'].replace(/['"]+/g, '').trim().toUpperCase() : '';

        if (designName) {
            if (seatRaw === 'N/A' || seatRaw === '') {
                naSeatDesigns.add(designName);
            } else {
                otherSeatDesigns.add(designName);
            }
        }
    }

    console.log('--- Designs with N/A Seat ---');
    const naList = Array.from(naSeatDesigns).sort();
    naList.forEach(d => console.log(d));

    console.log('\n--- Overlap Check (Designs with both N/A and Specific Seats) ---');
    const overlap = naList.filter(d => otherSeatDesigns.has(d));
    if (overlap.length === 0) {
        console.log('None. All designs are consistently N/A or Specific.');
    } else {
        console.log(overlap);
    }
}

main();
