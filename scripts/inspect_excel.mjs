import XLSX from 'xlsx';

const workbook = XLSX.readFile('C:/Users/hdavi/Downloads/cuvinte word wave.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log("Headers:", Object.keys(data[0] || {}));
console.log("First row:", data[0]);
