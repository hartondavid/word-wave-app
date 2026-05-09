import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const EXCEL_PATH = 'C:/Users/hdavi/Downloads/cuvinte word wave.xlsx';
const JSON_DIR = 'data/categories/definitions';

async function run() {
    console.log("Reading Excel...");
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${rows.length} words in Excel.`);

    // 1. Get all existing category files
    const categoryFiles = fs.readdirSync(JSON_DIR).filter(f => f.endsWith('.json'));
    const categories = categoryFiles.map(f => f.replace('.json', ''));
    
    if (categories.length === 0) {
        categories.push('general');
    }

    console.log(`Clearing and repopulating ${categories.length} category files: ${categories.join(', ')}`);

    // 2. Clear existing data
    for (const cat of categories) {
        fs.writeFileSync(path.join(JSON_DIR, `${cat}.json`), JSON.stringify([], null, 2));
    }

    // 3. Map Excel rows
    const words = rows.map(row => ({
        word: String(row['Cuvânt'] || '').toLowerCase().trim(),
        definition: String(row['Definiție reformulată'] || '').trim(),
        word_en: '',
        definition_en: ''
    })).filter(w => w.word && w.definition);

    // 4. Distribute
    const distribution = {};
    categories.forEach(cat => distribution[cat] = []);

    words.forEach((w, index) => {
        const cat = categories[index % categories.length];
        distribution[cat].push(w);
    });

    // 5. Write to files
    for (const [cat, data] of Object.entries(distribution)) {
        const filePath = path.join(JSON_DIR, `${cat}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`Wrote ${data.length} words to ${cat}.json`);
    }

    console.log("Success! Data replaced.");
}

run().catch(console.error);
