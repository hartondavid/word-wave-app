import fs from 'fs';
import path from 'path';

const JSON_DIR = 'data/categories/definitions';
const PROGRESS_FILE = 'scripts/.translate_progress.json';
const DELAY_MS = 200; // ms between requests to avoid rate limiting
const BATCH_SIZE = 10; // words to translate per batch before saving

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function translateText(text, from = 'ro', to = 'en') {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // Response: [[[translated, original, ...], ...], ...]
    const translated = data[0]?.map(seg => seg[0]).join('') ?? '';
    return translated.trim();
  } catch (e) {
    console.error(`  ⚠ Translate error for "${text.slice(0, 30)}...": ${e.message}`);
    return '';
  }
}

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    } catch { /* ignore */ }
  }
  return {};
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function translateFile(filePath, progress) {
  const fileName = path.basename(filePath);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  if (!Array.isArray(data) || data.length === 0) {
    console.log(`  Skipping ${fileName} (empty)`);
    return;
  }

  let changed = false;
  let count = 0;
  const total = data.filter(e => !e.word_en || !e.definition_en).length;

  if (total === 0) {
    console.log(`  ✓ ${fileName} already fully translated.`);
    return;
  }

  console.log(`\n📄 ${fileName}: ${total} entries to translate`);

  for (let i = 0; i < data.length; i++) {
    const entry = data[i];
    const key = `${fileName}:${i}`;

    // Skip if already translated (check both memory and file)
    if (entry.word_en && entry.definition_en) continue;

    // Translate word
    if (!entry.word_en && entry.word) {
      await sleep(DELAY_MS);
      const translated = await translateText(entry.word);
      if (translated) {
        data[i].word_en = translated;
        changed = true;
      }
    }

    // Translate definition
    if (!entry.definition_en && entry.definition) {
      await sleep(DELAY_MS);
      const translated = await translateText(entry.definition);
      if (translated) {
        data[i].definition_en = translated;
        changed = true;
      }
    }

    count++;
    if (count % BATCH_SIZE === 0) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      process.stdout.write(`  → ${count}/${total} done\r`);
    }
  }

  // Final save
  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`  ✓ ${fileName}: ${count} entries translated.`);
  }
}

async function run() {
  const progress = loadProgress();
  const files = fs.readdirSync(JSON_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();

  console.log(`🚀 Starting translation of ${files.length} category files...`);
  console.log(`   Translating RO → EN using Google Translate\n`);

  let filesDone = 0;
  for (const file of files) {
    const filePath = path.join(JSON_DIR, file);
    await translateFile(filePath, progress);
    filesDone++;
    console.log(`[${filesDone}/${files.length}] ${file} complete`);
  }

  console.log('\n✅ All files translated!');
  if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
