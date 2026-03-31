import os
from datetime import date

import frontmatter
import google.generativeai as genai

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

today = date.today().strftime("%Y-%m-%d")
keywords = ["puzzle cuvinte zilnic", "cryptograms bible", "word games română"]

model = genai.GenerativeModel("gemini-1.5-flash")

prompt = f"""
Generează YAML frontmatter + markdown articol SEO română 1200+ cuvinte: Puzzle zilnic {today}.
Keywords: {", ".join(keywords)}.
Frontmatter:
---
title: Puzzle Cuvinte Zilnic - {today}
description: Soluții și ghiduri pentru puzzle-uri daily. Îmbunătățește-ți vocabularul!
slug: {today}-puzzle-zilnic
keywords: {",".join(keywords)}
date: {today}
---

Continut: Fara H1 in corp (titlul paginii e deja H1). Intro ~200 cuvinte, apoi 5 H2 cu liste bullet, imagini placeholder ![alt], concluzie, FAQ 3 intrebari/raspunsuri.
Optimizat Google/AI search.
"""

response = model.generate_content(prompt)
content = response.text

filename = f"posts/{today}-puzzle-zilnic.md"
os.makedirs("posts", exist_ok=True)

# Conținutul de la Gemini include de obicei frontmatter + body; normalizăm cu python-frontmatter
post = frontmatter.loads(content)
with open(filename, "w", encoding="utf-8") as f:
    f.write(frontmatter.dumps(post))

print(f"Creat {filename} cu Gemini")
