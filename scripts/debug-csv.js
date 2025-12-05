const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'autoform (2).csv');
const fileContent = fs.readFileSync(filePath, 'utf-8');
const lines = fileContent.split('\n');
const headers = lines[0].split(',').map(h => h.trim());

console.log('Headers:', headers);

for (let i = 1; i < 5; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    headers.forEach((h, index) => {
        row[h] = values[index];
    });

    const oemName = row["OEM's"] || row["OEM's\r"];
    const modelName = row['ITEMS'];

    if (oemName) {
        const cleanOem = oemName.replace(/['"]+/g, '').trim();
        console.log(`Row ${i}: OEM='${oemName}' Clean='${cleanOem}' Model='${modelName}'`);

        if (cleanOem === 'OTHER') {
            console.log('  -> Matches OTHER');
        } else {
            console.log('  -> Does NOT match OTHER');
            console.log('  -> Char codes:', cleanOem.split('').map(c => c.charCodeAt(0)));
        }
    }
}
