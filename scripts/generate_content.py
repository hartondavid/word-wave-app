"""
O singură „postare” logică pe rulare: articol în engleză, apoi traducere în română
(același conținut / structură), salvat ca două fișiere cu același slug:
  content/en/<slug>.md  și  content/ro/<slug>.md

Necesită secret repo GEMINI_API_KEY. Folosește SDK-ul google-genai (API Gemini actuală).
Env: GEMINI_MODEL (implicit gemini-1.5-flash), GEMINI_MODEL_FALLBACK opțional (ex. gemini-2.5-flash).
"""

from __future__ import annotations

import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from google import genai
from google.genai import errors, types

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise SystemExit("GEMINI_API_KEY is missing")

# ID-uri fără prefix „models/”. SDK-ul nou folosește REST-ul actual (nu v1beta vechi).
PRIMARY_MODEL_ID = (os.getenv("GEMINI_MODEL") or "gemini-1.5-flash").strip() or "gemini-1.5-flash"
FALLBACK_MODEL_ID = (os.getenv("GEMINI_MODEL_FALLBACK") or "").strip()

client = genai.Client(api_key=api_key)

now = datetime.now(timezone.utc)
date_str = now.strftime("%Y-%m-%d")
base_slug = f"{date_str}-wordwave-daily"

keywords_en = ["daily word puzzle", "brain teaser", "vocabulary game"]
keywords_ro = ["puzzle zilnic cuvinte", "joc de vocabular", "antrenament minte"]

_GEN_CONFIG = types.GenerateContentConfig(max_output_tokens=8192)


def _model_chain() -> list[str]:
    out: list[str] = []
    for m in (PRIMARY_MODEL_ID, FALLBACK_MODEL_ID):
        if m and m not in out:
            out.append(m)
    return out


def _retry_sleep_seconds(exc: BaseException) -> float:
    m = re.search(r"retry in ([\d.]+)\s*s", str(exc), re.IGNORECASE)
    if m:
        return min(float(m.group(1)) + 3.0, 180.0)
    return 45.0


def generate_with_retry(
    model_id: str,
    prompt: str,
    *,
    max_attempts: int = 8,
    what: str = "generate_content",
) -> Any:
    """429 → pauză și reîncearcă. Alte ClientError → propagă imediat."""
    last: BaseException | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            return client.models.generate_content(
                model=model_id,
                contents=prompt,
                config=_GEN_CONFIG,
            )
        except errors.ClientError as e:
            last = e
            if e.code != 429:
                raise
            wait = _retry_sleep_seconds(e)
            print(
                f"[Gemini] {what} ({model_id}): 429 (încercare {attempt}/{max_attempts}), "
                f"pauză {wait:.0f}s…",
                flush=True,
            )
            time.sleep(wait)
    assert last is not None
    raise last


def generate_with_model_fallback(prompt: str, what: str) -> tuple[Any, str]:
    """Încearcă lanțul de modele la 404 sau după epuizarea reîncercărilor pe 429."""
    chain = _model_chain()
    if not chain:
        raise SystemExit("Niciun model Gemini configurat.")
    last_err: BaseException | None = None
    for i, mid in enumerate(chain):
        try:
            resp = generate_with_retry(mid, prompt, what=f"{what} [{mid}]")
            return resp, mid
        except errors.ClientError as e:
            last_err = e
            if e.code in (404, 429) and i < len(chain) - 1:
                print(
                    f"[Gemini] «{mid}» a eșuat ({e.code}). Încerc: «{chain[i + 1]}»…",
                    flush=True,
                )
                continue
            raise
    assert last_err is not None
    raise last_err


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
    a = "".join(strip_frontmatter(en_md).lower().split())
    b = "".join(strip_frontmatter(ro_md).lower().split())
    if len(a) < 80 or len(b) < 80:
        return True
    n = min(len(a), len(b), 2000)
    if n == 0:
        return True
    same = sum(1 for i in range(n) if a[i] == b[i])
    return (same / n) >= min_ratio


def _response_text(response: Any) -> str:
    t = getattr(response, "text", None)
    if t is not None:
        return str(t)
    return ""


def main() -> None:
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
        en_response, active_model = generate_with_model_fallback(prompt_en, "Articol EN")
    except errors.ClientError as e:
        raise SystemExit(
            f"Gemini a eșuat ({e.code}): {e.message or e}. "
            "Setează GEMINI_MODEL / GEMINI_MODEL_FALLBACK la un model din AI Studio. "
            "Vezi https://ai.google.dev/gemini-api/docs/models"
        ) from None

    en_text = _response_text(en_response)
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

    ro_response = generate_with_retry(active_model, prompt_ro, what="Traducere RO")
    ro_text = _response_text(ro_response)
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
            active_model,
            prompt_ro
            + "\n\nATENȚIE: Răspunsul anterior era prea asemănător cu engleza. "
            "Retradu COMPLET în română, fără a copia fraze în engleză.",
            what="Retraducere RO",
        )
        ro_text2 = _response_text(retry).strip()
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

    print(f"EN (engleză): {path_en.relative_to(root)}")
    print(f"RO (română):  {path_ro.relative_to(root)}")
    print(f"Slug comun:     {base_slug}")
    print(f"Model folosit:  {active_model}", flush=True)


if __name__ == "__main__":
    main()
