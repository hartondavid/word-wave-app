# Category word lists

JSON-urile din acest folder **nu** sunt servite ca fișiere statice. Toate cuvintele pentru joc vin **doar** de aici (Server Actions: Practice / multiplayer). Nu se mai folosește Open Trivia sau `/api/words`.

Nu muta aceste fișiere înapoi în `public/` — ar deveni din nou vizibile integral în rețea.

## Limba engleză (UI)

Pentru fiecare intrare poți adăuga opțional:

- `word_en` — cuvântul în engleză (folosit când jucătorul alege limba engleză)
- `definition_en` — definiția în engleză

Dacă lipsesc, serverul folosește `word` și `definition` (română).

### Traducere în masă (~1000 de intrări)

```bash
npm run translate:categories
```

Folosește **`OPENAI_API_KEY`** din `.env.local` dacă e setată (recomandat: ~20 apeluri, calitate bună). Altfel folosește **MyMemory** (mai lent, limită zilnică); poți seta **`MYMEMORY_EMAIL`** pentru limită mai mare.

Opțional: `node scripts/translate-all-categories-en.mjs --force` rescrie și câmpurile EN existente.
