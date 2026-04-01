"""
O singură „postare” logică pe rulare: articol în engleză, apoi traducere în română
(același conținut / structură), salvat ca două fișiere cu același slug:
  content/en/<slug>.md  și  content/ro/<slug>.md
  Slug: derivat din titlul EN (slugify), fără prefix/sufix; dacă fișierul există deja, scriptul se oprește.

Necesită secret repo GEMINI_API_KEY. SDK google-genai.
Lanțul de modele: GEMINI_MODEL (opțional), GEMINI_MODEL_FALLBACK, GEMINI_EXTRA_MODELS
(coma), apoi mulți candidați stabili; opțional GEMINI_DISCOVER_MODELS=1 adaugă modele
disponibile din API. La erori de model/cotă/server (nu 401/403), se trece la următorul.
"""

from __future__ import annotations

import os
import re
import time
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from google import genai
from google.genai import errors, types

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise SystemExit("GEMINI_API_KEY is missing")

# Ordine: rapide/ieftine întâi; sufixe alternative pentru conturi/regiuni diferite.
_GEMINI_MODEL_CANDIDATES: tuple[str, ...] = (
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash-8b",
    "gemini-1.5-flash",
    "gemini-1.5-flash-002",
    "gemini-2.5-pro",
    "gemini-1.5-pro",
    "gemini-1.5-pro-002",
)

client = genai.Client(api_key=api_key)

_model_chain_cache: list[str] | None = None

keywords_en = ["daily word puzzle", "brain teaser", "vocabulary game"]
keywords_ro = ["puzzle zilnic cuvinte", "joc de vocabular", "antrenament minte"]

_GEN_CONFIG = types.GenerateContentConfig(max_output_tokens=8192)


def _extra_models_from_env() -> list[str]:
    raw = (os.getenv("GEMINI_EXTRA_MODELS") or "").strip()
    if not raw:
        return []
    return [x.strip() for x in raw.split(",") if x.strip()]


def _discovered_generate_model_ids() -> list[str]:
    flag = (os.getenv("GEMINI_DISCOVER_MODELS") or "").strip().lower()
    if flag not in ("1", "true", "yes", "on"):
        return []
    found: list[str] = []
    try:
        for item in client.models.list():
            name = getattr(item, "name", None) or ""
            if "gemini" not in name.lower():
                continue
            short = name.rsplit("/", 1)[-1]
            methods = getattr(item, "supported_generation_methods", None)
            if methods is not None and "generateContent" not in methods:
                continue
            found.append(short)
    except Exception as e:
        print(f"[Gemini] list models (descoperire) a eșuat: {e}", flush=True)
        return []
    return found


def _model_chain() -> list[str]:
    global _model_chain_cache
    if _model_chain_cache is not None:
        return _model_chain_cache
    primary = (os.getenv("GEMINI_MODEL") or "").strip()
    fb = (os.getenv("GEMINI_MODEL_FALLBACK") or "").strip()
    out: list[str] = []
    for m in (primary, fb, *_extra_models_from_env(), *_GEMINI_MODEL_CANDIDATES):
        if m and m not in out:
            out.append(m)
    for m in _discovered_generate_model_ids():
        if m not in out:
            out.append(m)
    _model_chain_cache = out
    return out


def _should_try_next_model(exc: errors.ClientError) -> bool:
    """401/403 = cheie sau permisiuni — schimbarea modelului nu ajută."""
    c = getattr(exc, "code", None)
    if c in (401, 403):
        return False
    return True


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
    """Parcurge lanțul de modele la erori ClientError (excl. 401/403), inclusiv după 429 epuizat."""
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
            if _should_try_next_model(e) and i < len(chain) - 1:
                nxt = chain[i + 1]
                print(
                    f"[Gemini] «{mid}» a eșuat ({getattr(e, 'code', '?')}). Încerc: «{nxt}»…",
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


def _take_meta_line(prefix: str, line: str) -> str | None:
    s = line.strip()
    if s.upper().startswith(prefix.upper()):
        return s[len(prefix) :].strip()
    return None


def slug_from_title(title: str, *, max_len: int = 80) -> str:
    """URL slug din titlu: litere/cifre, cratime, fără diacritice."""
    t = sanitize_title_no_dates(title).strip().lower()
    t = unicodedata.normalize("NFKD", t)
    t = "".join(ch for ch in t if not unicodedata.combining(ch))
    t = re.sub(r"[^a-z0-9]+", "-", t)
    t = re.sub(r"-{2,}", "-", t).strip("-")
    if not t:
        t = "article"
    if len(t) > max_len:
        t = t[:max_len].rstrip("-")
    return t


def assert_new_slug_from_title(title: str, en_dir: Path, ro_dir: Path) -> str:
    base = slug_from_title(title)
    if (en_dir / f"{base}.md").exists() or (ro_dir / f"{base}.md").exists():
        raise SystemExit(
            f"Slug «{base}» (din titlul EN) există deja în content/en sau content/ro. "
            "Folosește un TITLE_LINE care să producă alt URL, sau șterge/redenumește articolul vechi."
        )
    return base


def sanitize_title_no_dates(title: str) -> str:
    """Fără date în titlu: scoate yyyy-mm-dd și forme similare rămase accidental."""
    t = title.strip()
    t = re.sub(r"\b\d{4}-\d{2}-\d{2}\b", "", t)
    t = re.sub(r"\b\d{1,2}/\d{1,2}/\d{2,4}\b", "", t)
    t = re.sub(r"\s+", " ", t).strip(" \t-–—·")
    return t if t else title.strip()


def split_article_response(
    raw: str,
    *,
    fallback_title: str,
    fallback_description: str,
) -> tuple[str, str, str]:
    """
    Așteaptă la început:
      TITLE_LINE: ...
      DESC_LINE: ...
    apoi corp markdown. Returnează (title, description, body).
    """
    text = raw.strip()
    lines = text.split("\n")
    i = 0
    while i < len(lines) and not lines[i].strip():
        i += 1
    title = fallback_title
    desc = fallback_description
    if i < len(lines):
        t = _take_meta_line("TITLE_LINE:", lines[i])
        if t is not None:
            title = sanitize_title_no_dates(t)[:200]
            i += 1
    while i < len(lines) and not lines[i].strip():
        i += 1
    if i < len(lines):
        d = _take_meta_line("DESC_LINE:", lines[i])
        if d is not None:
            desc = d.strip()[:400]
            i += 1
    while i < len(lines) and not lines[i].strip():
        i += 1
    body = "\n".join(lines[i:]).strip()
    if not body:
        body = clean_markdown(text)
    return title, desc, body


def main() -> None:
    now = datetime.now(timezone.utc)
    root = Path(__file__).resolve().parent.parent
    en_dir = root / "content" / "en"
    ro_dir = root / "content" / "ro"
    en_dir.mkdir(parents=True, exist_ok=True)
    ro_dir.mkdir(parents=True, exist_ok=True)

    prompt_en = f"""
Write a high-quality SEO article in English for a word game website.
Topic: daily word puzzle / vocabulary and WordWave-style multiplayer tips.
Target keywords: {", ".join(keywords_en)}.
Length: 900 to 1200 words.

First, output exactly two metadata lines (English), then a blank line, then the article:
TITLE_LINE: <one unique SEO title for THIS article only, max ~70 characters, specific to the angle you choose; do NOT include any calendar date, year, or "April 1"-style wording>
DESC_LINE: <one unique meta description for THIS article only, max ~155 characters, concrete and specific; no dates>

Then the article body:
- Valid markdown only.
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
            f"Lanț încercat: {', '.join(_model_chain())}. "
            "Ajustează GEMINI_MODEL / GEMINI_MODEL_FALLBACK / GEMINI_EXTRA_MODELS "
            "sau GEMINI_DISCOVER_MODELS=1; verifică cota cheii: "
            "https://ai.google.dev/gemini-api/docs/models"
        ) from None

    en_text = _response_text(en_response)
    title_en, desc_en, body_en = split_article_response(
        en_text,
        fallback_title="Word games, puzzles, and vocabulary tips",
        fallback_description=(
            "Ideas for word puzzle fans: vocabulary, multiplayer rhythm, and sharper play — "
            "practical tips for your next game."
        ),
    )
    base_slug = assert_new_slug_from_title(title_en, en_dir, ro_dir)
    en_body = ensure_frontmatter(
        body_en,
        title=title_en,
        description=desc_en,
        slug=base_slug,
        lang="en",
        date_value=now.isoformat(),
        keywords=keywords_en,
    )

    en_markdown_only = strip_frontmatter(en_body)

    prompt_ro = f"""
Tradu în limba română articolul markdown de mai jos (fără frontmatter YAML).

Reguli stricte:
- La începutul răspunsului, exact două rânduri în română, apoi linie goală, apoi traducerea:
TITLE_LINE: <titlu SEO unic pentru ACEST articol, max ~70 caractere, specific; FĂRĂ dată calendaristică, an sau formulări gen „1 aprilie”>
DESC_LINE: <descriere meta unică, max ~155 caractere, concretă; fără date>
- Apoi traducerea corpului: titluri H2/H3, paragrafe, liste, FAQ — tot în ROMÂNĂ.
- Nu lăsa propoziții în engleză.
- Păstrează structura markdown (aceleași niveluri de titluri, liste).
- Ieșire fără blocuri ``` în jurul întregului răspuns.

ARTICOL (markdown, engleză):
{en_markdown_only}
"""

    ro_response = generate_with_retry(active_model, prompt_ro, what="Traducere RO")
    ro_text = _response_text(ro_response)
    title_ro, desc_ro, body_ro = split_article_response(
        ro_text,
        fallback_title="Jocuri de cuvinte, puzzle-uri și vocabular",
        fallback_description=(
            "Idei pentru pasionații de puzzle-uri cu cuvinte: vocabular, ritm în multiplayer "
            "și joc mai clar — sfaturi practice."
        ),
    )
    ro_body = ensure_frontmatter(
        body_ro,
        title=title_ro,
        description=desc_ro,
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
            tr2, dr2, br2 = split_article_response(
                ro_text2,
                fallback_title=title_ro,
                fallback_description=desc_ro,
            )
            ro_body = ensure_frontmatter(
                br2,
                title=tr2,
                description=dr2,
                slug=base_slug,
                lang="ro",
                date_value=now.isoformat(),
                keywords=keywords_ro,
            )
        if bodies_too_similar(en_body, ro_body):
            raise SystemExit(
                "Eșec: varianta RO e prea asemănătoare cu EN. Verifică modelul / promptul."
            )

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
