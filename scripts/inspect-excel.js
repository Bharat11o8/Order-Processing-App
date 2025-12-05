const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'build data for antigravity.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('Headers:', data[0]);
console.log('First 5 rows:');
data.slice(1, 6).forEach(row => console.log(row));
