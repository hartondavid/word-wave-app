"""
O singură „postare” logică pe rulare: articol în engleză, apoi traducere în română
(același conținut / structură), salvat ca două fișiere cu același slug:
  content/en/<slug>.md  și  content/ro/<slug>.md

Necesită secret repo GEMINI_API_KEY. Pentru 1 pereche/zi, folosește workflow-ul
GitHub „Auto Dual Language Content” cu cron zilnic (vezi .github/workflows).
"""

from __future__ import annotations

import os
import re
import time
import warnings
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

warnings.filterwarnings(
    "ignore",
    message="All support for the `google.generativeai` package",
    category=FutureWarning,
)

import google.generativeai as genai
from google.api_core import exceptions as google_api_exceptions

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise SystemExit("GEMINI_API_KEY is missing")

# Implicit: gemini-1.5-flash-002 (ID stabil pe v1beta; aliniat cu cotele din AI Studio „Rate limits”).
# gemini-1.5-flash fără sufix poate da 404; gemini-2.0-flash a avut uneori cotă free tier 0.
# Suprascrie cu GEMINI_MODEL / GEMINI_MODEL_FALLBACK în env sau în GitHub Variables.
genai.configure(api_key=api_key)
PRIMARY_MODEL_ID = (os.getenv("GEMINI_MODEL") or "gemini-1.5-flash-002").strip() or "gemini-1.5-flash-002"
FALLBACK_MODEL_ID = (os.getenv("GEMINI_MODEL_FALLBACK") or "").strip()


def make_model(model_id: str) -> genai.GenerativeModel:
    return genai.GenerativeModel(model_id)


def _retry_sleep_seconds(exc: BaseException) -> float:
    """Extrage „Please retry in 53.3s” din mesajul API sau folosește backoff."""
    m = re.search(r"retry in ([\d.]+)\s*s", str(exc), re.IGNORECASE)
    if m:
        return min(float(m.group(1)) + 3.0, 180.0)
    return 45.0


def generate_with_retry(
    m: genai.GenerativeModel,
    prompt: str,
    *,
    max_attempts: int = 8,
    what: str = "generate_content",
) -> Any:
    last: BaseException | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            return m.generate_content(prompt)
        except google_api_exceptions.ResourceExhausted as e:
            last = e
            wait = _retry_sleep_seconds(e)
            print(
                f"[Gemini] {what}: quota/rate limit (încercare {attempt}/{max_attempts}), "
                f"pauză {wait:.0f}s…",
                flush=True,
            )
            time.sleep(wait)
    assert last is not None
    raise last

now = datetime.now(timezone.utc)
date_str = now.strftime("%Y-%m-%d")
# Un slug pe zi (același articol EN+RO). Rulare manuală repetată aceeași zi suprascrie fișierele.
base_slug = f"{date_str}-wordwave-daily"

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
    model = make_model(PRIMARY_MODEL_ID)

    prompt_en = f"""
Write a high-quality SEO article in English for a word game website.
Topic: daily word puzzle / vocabulary and WordWave-style multiplayer tips.
Target keywords: {", ".join(keywords_en)}.
Length: 900 to 1200 words.

Requirements:
- Output valid markdown only.
- Do NOT use H1 (#) in the body (the page template already shows the title as H1).
- Start with a short intro paragraph, then 4 H2 (##) sections, bullet lists where useful, and a short FAQ (use H2 for FAQ or ### for each question).
- Make the content useful and natural, not robotic.
- Do not wrap the answer in code fences.
"""

    try:
        en_response = generate_with_retry(model, prompt_en, what="Articol EN")
    except google_api_exceptions.ResourceExhausted:
        if not FALLBACK_MODEL_ID:
            raise SystemExit(
                f"Gemini: cotă epuizată pentru «{PRIMARY_MODEL_ID}». "
                "Încearcă GEMINI_MODEL cu alt model, setează GEMINI_MODEL_FALLBACK, "
                "sau verifică billing / cote în Google AI Studio: "
                "https://ai.google.dev/gemini-api/docs/rate-limits"
            ) from None
        print(f"[Gemini] folosesc model rezervă: {FALLBACK_MODEL_ID}", flush=True)
        model = make_model(FALLBACK_MODEL_ID)
        en_response = generate_with_retry(model, prompt_en, what="Articol EN (fallback)")
    en_text = en_response.text or ""
    en_body = ensure_frontmatter(
        en_text,
        title=f"Daily Word Puzzle — {date_str}",
        description="Solve today's word puzzle and improve your vocabulary with a fresh daily challenge.",
        slug=base_slug,
        lang="en",
        date_value=now.isoformat(),
        keywords=keywords_en,
    )

    prompt_ro = f"""
Tradu în limba română articolul de mai jos. Reguli stricte:
- Tot conținutul vizibil (titluri H2/H3, paragrafe, liste, FAQ) trebuie să fie în ROMÂNĂ.
- Nu lăsa propoziții sau paragrafe în engleză.
- Păstrează structura markdown (aceleași niveluri de titluri, liste).
- Ton natural pentru cititori români interesați de jocuri cu cuvinte.
- Ieșire: doar markdown valid, fără blocuri ```.

ARTICOL ENGLEZĂ:
{en_body}
"""

    ro_response = generate_with_retry(model, prompt_ro, what="Traducere RO")
    ro_text = ro_response.text or ""
    ro_body = ensure_frontmatter(
        ro_text,
        title=f"Puzzle zilnic de cuvinte — {date_str}",
        description="Rezolvă puzzle-ul zilnic de cuvinte și antrenează-ți vocabularul în fiecare zi.",
        slug=base_slug,
        lang="ro",
        date_value=now.isoformat(),
        keywords=keywords_ro,
    )

    if bodies_too_similar(en_body, ro_body):
        retry = generate_with_retry(
            model,
            prompt_ro
            + "\n\nATENȚIE: Răspunsul anterior era prea asemănător cu engleza. "
            "Retradu COMPLET în română, fără a copia fraze în engleză.",
            what="Retraducere RO",
        )
        ro_text2 = (retry.text or "").strip()
        if ro_text2:
            ro_body = ensure_frontmatter(
                ro_text2,
                title=f"Puzzle zilnic de cuvinte — {date_str}",
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
