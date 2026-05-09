import XLSX from 'xlsx';

const workbook = XLSX.readFile('C:/Users/hdavi/Downloads/cuvinte word wave.xlsx');
console.log("SheetNames:", workbook.SheetNames);
for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(ws);
    console.log(`Sheet: ${name}, Rows: ${data.length}`);
    if (data.length > 0) {
        console.log(`Headers (${name}):`, Object.keys(data[0]));
    }
}
