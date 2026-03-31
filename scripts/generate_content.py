"""
Generează articole markdown EN + RO în content/en și content/ro (același slug).
Necesită secret repo GEMINI_API_KEY.
"""

from __future__ import annotations

import os
import re
from datetime import datetime, timezone
from pathlib import Path

import google.generativeai as genai

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise SystemExit("GEMINI_API_KEY is missing")

genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-1.5-flash")

now = datetime.now(timezone.utc)
date_str = now.strftime("%Y-%m-%d")
time_str = now.strftime("%H%M")
base_slug = f"{date_str}-{time_str}-word-puzzle"

keywords_en = ["daily word puzzle", "brain teaser", "vocabulary game"]
keywords_ro = ["puzzle zilnic cuvinte", "joc de vocabular", "antrenament minte"]


def clean_markdown(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:markdown|md|yaml)?\n", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\n```\s*$", "", text)
    return text.strip()


def yaml_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


def ensure_frontmatter(
    content: str,
    title: str,
    description: str,
    slug: str,
    lang: str,
    date_value: str,
    keywords: list[str],
) -> str:
    content = clean_markdown(content)
    if content.startswith("---"):
        return content
    t = yaml_escape(title)
    d = yaml_escape(description)
    s = yaml_escape(slug)
    frontmatter = (
        "---\n"
        f'title: "{t}"\n'
        f'description: "{d}"\n'
        f'slug: "{s}"\n'
        f'path_en: "/en/blog/{s}"\n'
        f'path_ro: "/ro/blog/{s}"\n'
        f'lang: "{lang}"\n'
        f'date: "{date_value}"\n'
        "keywords:\n"
        + "".join(f'  - "{yaml_escape(k)}"\n' for k in keywords)
        + "---\n\n"
    )
    return frontmatter + content


def strip_frontmatter(md: str) -> str:
    md = md.strip()
    if not md.startswith("---"):
        return md
    parts = md.split("---", 2)
    if len(parts) >= 3:
        return parts[2].strip()
    return md


def bodies_too_similar(en_md: str, ro_md: str, min_ratio: float = 0.92) -> bool:
    """True dacă corpul RO e aproape identic cu EN (modelul a copiat engleza)."""
    a = "".join(strip_frontmatter(en_md).lower().split())
    b = "".join(strip_frontmatter(ro_md).lower().split())
    if len(a) < 80 or len(b) < 80:
        return True
    # similitudine simplă pe prefix
    n = min(len(a), len(b), 2000)
    if n == 0:
        return True
    same = sum(1 for i in range(n) if a[i] == b[i])
    return (same / n) >= min_ratio


def main() -> None:
    prompt_en = f"""
Write a high-quality SEO article in English for a word game website.
Topic: daily word puzzle.
Target keywords: {", ".join(keywords_en)}.
Length: 900 to 1200 words.

Requirements:
- Output valid markdown only.
- Start with an H1 title.
- Add an intro, 4 H2 sections, bullet lists, and a short FAQ.
- Make the content useful and natural, not robotic.
- Do not wrap the answer in code fences.
"""

    en_response = model.generate_content(prompt_en)
    en_text = en_response.text or ""
    en_body = ensure_frontmatter(
        en_text,
        title=f"Daily Word Puzzle - {date_str} {time_str}",
        description="Solve today's word puzzle and improve your vocabulary with a fresh daily challenge.",
        slug=base_slug,
        lang="en",
        date_value=now.isoformat(),
        keywords=keywords_en,
    )

    prompt_ro = f"""
Tradu în limba română articolul de mai jos. Reguli stricte:
- Tot conținutul vizibil (titluri H1/H2, paragrafe, liste, FAQ) trebuie să fie în ROMÂNĂ.
- Nu lăsa propoziții sau paragrafe în engleză.
- Păstrează structura markdown (aceleași H1/H2, liste).
- Ton natural pentru cititori români interesați de jocuri cu cuvinte.
- Ieșire: doar markdown valid, fără blocuri ```.

ARTICOL ENGLEZĂ:
{en_body}
"""

    ro_response = model.generate_content(prompt_ro)
    ro_text = ro_response.text or ""
    ro_body = ensure_frontmatter(
        ro_text,
        title=f"Puzzle zilnic de cuvinte - {date_str} {time_str}",
        description="Rezolvă puzzle-ul zilnic de cuvinte și antrenează-ți vocabularul în fiecare zi.",
        slug=base_slug,
        lang="ro",
        date_value=now.isoformat(),
        keywords=keywords_ro,
    )

    if bodies_too_similar(en_body, ro_body):
        retry = model.generate_content(
            prompt_ro
            + "\n\nATENȚIE: Răspunsul anterior era prea asemănător cu engleza. "
            "Retradu COMPLET în română, fără a copia fraze în engleză."
        )
        ro_text2 = (retry.text or "").strip()
        if ro_text2:
            ro_body = ensure_frontmatter(
                ro_text2,
                title=f"Puzzle zilnic de cuvinte - {date_str} {time_str}",
                description="Rezolvă puzzle-ul zilnic de cuvinte și antrenează-ți vocabularul în fiecare zi.",
                slug=base_slug,
                lang="ro",
                date_value=now.isoformat(),
                keywords=keywords_ro,
            )
        if bodies_too_similar(en_body, ro_body):
            raise SystemExit(
                "Eșec: varianta RO e prea asemănătoare cu EN. Verifică modelul / promptul."
            )

    root = Path(__file__).resolve().parent.parent
    en_dir = root / "content" / "en"
    ro_dir = root / "content" / "ro"
    en_dir.mkdir(parents=True, exist_ok=True)
    ro_dir.mkdir(parents=True, exist_ok=True)

    path_en = en_dir / f"{base_slug}.md"
    path_ro = ro_dir / f"{base_slug}.md"
    path_en.write_text(en_body, encoding="utf-8")
    path_ro.write_text(ro_body, encoding="utf-8")

    # O pereche = același slug: 1 articol în engleză + 1 articol în română (conținut echivalent).
    print(f"EN (engleză): {path_en.relative_to(root)}")
    print(f"RO (română):  {path_ro.relative_to(root)}")
    print(f"Slug comun:     {base_slug}")


if __name__ == "__main__":
    main()
