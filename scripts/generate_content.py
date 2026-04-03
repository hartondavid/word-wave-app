"""
O singură „postare” logică pe rulare: articol în engleză, apoi traducere în română
(același conținut / structură), salvat ca două fișiere cu același slug:
  content/en/<slug>.md  și  content/ro/<slug>.md
  Slug: derivat din titlul EN (slugify), fără prefix/sufix; dacă fișierul există deja, scriptul se oprește.

Necesită secret repo GEMINI_API_KEY. SDK google-genai.
Lanțul de modele: GEMINI_MODEL (opțional), GEMINI_MODEL_FALLBACK, GEMINI_EXTRA_MODELS
(coma), apoi mulți candidați stabili; opțional GEMINI_DISCOVER_MODELS=1 adaugă modele
disponibile din API. La erori de model/cotă/server (nu 401/403), se trece la următorul.

Mod implicit: UN singur apel Gemini — articol EN + RO în același răspuns, delimitat cu markeri
===BEGIN_EN=== / ===END_EN=== / ===BEGIN_RO=== / ===END_RO===; în fiecare secțiune: TITLE_LINE,
DESC_LINE, apoi corp markdown.
Opțional: GEMINI_CONTENT_TWO_STEP=1 → două apeluri (EN apoi traducere RO, tot cu TITLE_LINE/DESC_LINE).

Dacă generarea sau validarea eșuează, nu se creează/actualizează fișiere. Scrierea pe disc e
„tot sau nimic”: dacă a doua scriere eșuează, fișierul EN tocmai scris e șters.
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
# Un răspuns = EN + RO (~2× articol); fără response_json_schema (text liber cu markeri).
_GEN_CONFIG_BILINGUAL = types.GenerateContentConfig(max_output_tokens=16384)

_MARK_BEGIN_EN = "===BEGIN_EN==="
_MARK_END_EN = "===END_EN==="
_MARK_BEGIN_RO = "===BEGIN_RO==="
_MARK_END_RO = "===END_RO==="


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
    gen_config: types.GenerateContentConfig | dict[str, Any] | None = None,
) -> Any:
    """429 → pauză și reîncearcă. Alte ClientError → propagă imediat."""
    cfg: types.GenerateContentConfig | dict[str, Any] = (
        gen_config if gen_config is not None else _GEN_CONFIG
    )
    last: BaseException | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            return client.models.generate_content(
                model=model_id,
                contents=prompt,
                config=cfg,
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


def generate_with_model_fallback(
    prompt: str,
    what: str,
    *,
    gen_config: types.GenerateContentConfig | dict[str, Any] | None = None,
) -> tuple[Any, str]:
    """Parcurge lanțul de modele la erori ClientError (excl. 401/403), inclusiv după 429 epuizat."""
    chain = _model_chain()
    if not chain:
        raise SystemExit("Niciun model Gemini configurat.")
    last_err: BaseException | None = None
    for i, mid in enumerate(chain):
        try:
            resp = generate_with_retry(
                mid, prompt, what=f"{what} [{mid}]", gen_config=gen_config
            )
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
            "Alege alt titlu EN (alt unghi) sau șterge/redenumește articolul vechi."
        )
    return base


def sanitize_title_no_dates(title: str) -> str:
    """Fără date în titlu: scoate yyyy-mm-dd și forme similare rămase accidental."""
    t = title.strip()
    t = re.sub(r"\b\d{4}-\d{2}-\d{2}\b", "", t)
    t = re.sub(r"\b\d{1,2}/\d{1,2}/\d{2,4}\b", "", t)
    t = re.sub(r"\s+", " ", t).strip(" \t-–—·")
    return t if t else title.strip()


def _env_flag(name: str) -> bool:
    return (os.getenv(name) or "").strip().lower() in ("1", "true", "yes", "on")


_RE_TITLE_LINE = re.compile(r"^\s*TITLE_LINE\s*:\s*(.+)$", re.IGNORECASE)
_RE_DESC_LINE = re.compile(r"^\s*DESC_LINE\s*:\s*(.+)$", re.IGNORECASE)


def split_article_response(
    raw: str,
    *,
    fallback_title: str,
    fallback_description: str,
) -> tuple[str, str, str, bool]:
    """
    Caută TITLE_LINE / DESC_LINE în primele linii (toleră preambul, spații înainte de «:»).
    Returnează (title, description, body, meta_ok).
    """
    text = raw.strip()
    lines = text.split("\n")
    title = fallback_title
    desc = fallback_description
    title_idx: int | None = None
    desc_idx: int | None = None

    for i, line in enumerate(lines[:120]):
        m = _RE_TITLE_LINE.match(line)
        if m and title_idx is None:
            title = sanitize_title_no_dates(m.group(1).strip())[:200]
            title_idx = i
            continue
        m = _RE_DESC_LINE.match(line)
        if m and desc_idx is None:
            desc = m.group(1).strip()[:400]
            desc_idx = i

    meta_ok = title_idx is not None and desc_idx is not None

    if title_idx is not None or desc_idx is not None:
        start = max(i for i in (title_idx, desc_idx) if i is not None) + 1
        while start < len(lines) and not lines[start].strip():
            start += 1
        body = "\n".join(lines[start:]).strip()
    else:
        body = "\n".join(lines).strip()

    if not body:
        body = clean_markdown(text)
    return title, desc, body, meta_ok


def split_bilingual_response(raw: str) -> tuple[str, str]:
    """Extrage secțiunile dintre markeri; ridică ValueError dacă lipsește ceva."""
    s = raw.strip()
    ib = s.find(_MARK_BEGIN_EN)
    ie = s.find(_MARK_END_EN, ib + 1 if ib >= 0 else 0)
    rb = s.find(_MARK_BEGIN_RO)
    re_end = s.find(_MARK_END_RO, rb + 1 if rb >= 0 else 0)
    if ib < 0 or ie < 0 or rb < 0 or re_end < 0:
        raise ValueError(
            "Răspuns fără toți markerii "
            f"{_MARK_BEGIN_EN}…{_MARK_END_EN} și {_MARK_BEGIN_RO}…{_MARK_END_RO}."
        )
    en = s[ib + len(_MARK_BEGIN_EN) : ie].strip()
    ro = s[rb + len(_MARK_BEGIN_RO) : re_end].strip()
    if not en or not ro:
        raise ValueError("Secțiunea EN sau RO e goală (posibil răspuns trunchiat).")
    return en, ro


def prompt_translate_ro(en_markdown_only: str) -> str:
    """Al doilea apel (rezervă): traduce doar corpul EN → RO cu meta."""
    return f"""
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


def translate_ro_metadata(model_id: str, title_en: str, desc_en: str) -> tuple[str, str]:
    """Dacă traducerea articolului nu a inclus meta lizibil, traduce doar titlul și descrierea EN."""
    prompt = f"""Traduci în română pentru meta SEO (site de jocuri cu cuvinte). Fără date calendaristice în titlu.

Răspunde DOAR cu două rânduri exact în forma de mai jos (fără text înainte/după, fără ```):
TITLE_LINE: <titlu unic, natural, max ~70 caractere>
DESC_LINE: <descriere meta unică, max ~155 caractere>

Titlu (EN): {title_en}
Descriere (EN): {desc_en}
"""
    resp = generate_with_retry(model_id, prompt, what="Meta RO (traducere dedicată)")
    raw = _response_text(resp)
    t, d, _, ok = split_article_response(
        raw,
        fallback_title=title_en[:200],
        fallback_description=desc_en[:400],
    )
    if ok:
        return t, d
    stripped = [ln.strip() for ln in raw.split("\n") if ln.strip()]
    if len(stripped) >= 2:
        return (
            sanitize_title_no_dates(stripped[0])[:200],
            stripped[1][:400],
        )
    if len(stripped) == 1:
        return sanitize_title_no_dates(stripped[0])[:200], desc_en[:400]
    return sanitize_title_no_dates(title_en)[:200], desc_en[:400]


def _gemini_exit(e: errors.ClientError) -> None:
    raise SystemExit(
        f"Gemini a eșuat ({e.code}): {e.message or e}. "
        f"Lanț încercat: {', '.join(_model_chain())}. "
        "Ajustează GEMINI_MODEL / GEMINI_MODEL_FALLBACK / GEMINI_EXTRA_MODELS "
        "sau GEMINI_DISCOVER_MODELS=1; verifică cota cheii: "
        "https://ai.google.dev/gemini-api/docs/models"
    ) from None


_PROMPT_BILINGUAL = f"""
Produce ONE response for a word game website (WordWave-style). Exactly two marked sections.

Topic: daily word puzzle / vocabulary and WordWave-style multiplayer tips.
English keywords (English section only): {", ".join(keywords_en)}.
English article length: ~900-1200 words of body text.

Rules:
- Do not write ANY text before {_MARK_BEGIN_EN} or after {_MARK_END_RO}.
- Do not wrap the entire response in markdown code fences (```).
- No H1 (#) in article bodies (title is shown by the site).
- English section: intro, four ## sections, lists where useful, short FAQ (## or ###).
- Romanian section: faithful translation — same heading structure, entire body in natural Romanian,
  no English sentences left in the body.
- TITLE_LINE / DESC_LINE in each section: no calendar dates in titles.

Format (copy the marker lines exactly):

{_MARK_BEGIN_EN}
TITLE_LINE: <English SEO title, max ~70 characters>
DESC_LINE: <English meta description, max ~155 characters>

<English markdown body>
{_MARK_END_EN}

{_MARK_BEGIN_RO}
TITLE_LINE: <Romanian SEO title, max ~70 characters>
DESC_LINE: <Romanian meta description, max ~155 characters>

<Romanian markdown body>
{_MARK_END_RO}
"""


def _prompt_en_only() -> str:
    return f"""
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


def _fallback_en() -> tuple[str, str]:
    return (
        "Word games, puzzles, and vocabulary tips",
        (
            "Ideas for word puzzle fans: vocabulary, multiplayer rhythm, and sharper play — "
            "practical tips for your next game."
        ),
    )


def _fallback_ro() -> tuple[str, str]:
    return (
        "Jocuri de cuvinte, puzzle-uri și vocabular",
        (
            "Idei pentru pasionații de puzzle-uri cu cuvinte: vocabular, ritm în multiplayer "
            "și joc mai clar — sfaturi practice."
        ),
    )


def _write_both_markdown_or_none(path_en: Path, path_ro: Path, en_body: str, ro_body: str) -> None:
    """Scrie ambele fișiere; la orice eroare după primul write, șterge ce s-a scris deja."""
    written: list[Path] = []
    try:
        path_en.write_text(en_body, encoding="utf-8")
        written.append(path_en)
        path_ro.write_text(ro_body, encoding="utf-8")
        written.append(path_ro)
    except OSError:
        for p in written:
            try:
                p.unlink(missing_ok=True)
            except OSError:
                pass
        raise


def _maybe_retry_ro_if_similar(
    *,
    en_body: str,
    ro_body: str,
    base_slug: str,
    active_model: str,
    now: datetime,
    title_en: str,
    desc_en: str,
    title_ro: str,
    desc_ro: str,
) -> str:
    if not bodies_too_similar(en_body, ro_body):
        return ro_body
    print(
        "[Gemini] RO prea asemănător cu EN — al doilea apel (doar traducere RO).",
        flush=True,
    )
    en_markdown_only = strip_frontmatter(en_body)
    prompt_ro = prompt_translate_ro(en_markdown_only)
    retry = generate_with_retry(
        active_model,
        prompt_ro
        + "\n\nATENȚIE: Răspunsul anterior era prea asemănător cu engleza. "
        "Retradu COMPLET în română, fără a copia fraze în engleză.",
        what="Retraducere RO",
    )
    ro_text2 = _response_text(retry).strip()
    if not ro_text2:
        return ro_body
    tr2, dr2, br2, meta2 = split_article_response(
        ro_text2,
        fallback_title=title_ro,
        fallback_description=desc_ro,
    )
    if not meta2:
        tr2, dr2 = translate_ro_metadata(active_model, title_en, desc_en)
    return ensure_frontmatter(
        br2,
        title=tr2,
        description=dr2,
        slug=base_slug,
        lang="ro",
        date_value=now.isoformat(),
        keywords=keywords_ro,
    )


def _pipeline_bilingual(
    now: datetime,
    en_dir: Path,
    ro_dir: Path,
) -> tuple[str, str, str, str, tuple[str, str, str, str]]:
    """1 apel Gemini: secțiuni delimitate cu markeri + TITLE_LINE/DESC_LINE în fiecare."""
    try:
        response, active_model = generate_with_model_fallback(
            _PROMPT_BILINGUAL,
            "Articol EN+RO (markeri)",
            gen_config=_GEN_CONFIG_BILINGUAL,
        )
    except errors.ClientError as e:
        _gemini_exit(e)
    raw = _response_text(response)
    en_text, ro_text = split_bilingual_response(raw)
    ft_en, fd_en = _fallback_en()
    ft_ro, fd_ro = _fallback_ro()
    title_en, desc_en, body_en, en_ok = split_article_response(
        en_text, fallback_title=ft_en, fallback_description=fd_en
    )
    title_ro, desc_ro, body_ro, ro_ok = split_article_response(
        ro_text, fallback_title=ft_ro, fallback_description=fd_ro
    )
    if not en_ok:
        print(
            "[Gemini] Secțiune EN: TITLE_LINE/DESC_LINE slabe; se folosesc extrageri/fallback.",
            flush=True,
        )
    if len(body_en.strip()) < 200 or len(body_ro.strip()) < 200:
        raise ValueError(
            "Corpul EN sau RO e prea scurt — posibil răspuns trunchiat; "
            "încearcă GEMINI_CONTENT_TWO_STEP=1 sau un model cu limită de ieșire mai mare."
        )

    if not ro_ok or not title_ro.strip() or not desc_ro.strip():
        print(
            "[Gemini] Secțiune RO: meta slabă — retraduc titlul și descrierea din EN.",
            flush=True,
        )
        title_ro, desc_ro = translate_ro_metadata(active_model, title_en, desc_en)

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
    ro_body = ensure_frontmatter(
        body_ro,
        title=title_ro,
        description=desc_ro,
        slug=base_slug,
        lang="ro",
        date_value=now.isoformat(),
        keywords=keywords_ro,
    )
    meta = (title_en, desc_en, title_ro, desc_ro)
    return active_model, base_slug, en_body, ro_body, meta


def _pipeline_two_step(
    now: datetime,
    en_dir: Path,
    ro_dir: Path,
) -> tuple[str, str, str, str, tuple[str, str, str, str]]:
    """2 apeluri (flux vechi)."""
    try:
        en_response, active_model = generate_with_model_fallback(
            _prompt_en_only(), "Articol EN"
        )
    except errors.ClientError as e:
        _gemini_exit(e)
    en_text = _response_text(en_response)
    ft_en, fd_en = _fallback_en()
    ft_ro, fd_ro = _fallback_ro()
    title_en, desc_en, body_en, en_ok = split_article_response(
        en_text, fallback_title=ft_en, fallback_description=fd_en
    )
    if not en_ok:
        print(
            "[Gemini] Articol EN: TITLE_LINE/DESC_LINE nu au fost recunoscute clar; "
            "se folosesc valorile extrase sau fallback.",
            flush=True,
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
    ro_response = generate_with_retry(
        active_model,
        prompt_translate_ro(en_markdown_only),
        what="Traducere RO",
    )
    ro_text = _response_text(ro_response)
    title_ro, desc_ro, body_ro, ro_ok = split_article_response(
        ro_text, fallback_title=ft_ro, fallback_description=fd_ro
    )
    if not ro_ok:
        print(
            "[Gemini] Traducere RO: meta lipsă sau format greșit — retraduc titlul și descrierea din EN.",
            flush=True,
        )
        title_ro, desc_ro = translate_ro_metadata(active_model, title_en, desc_en)
    ro_body = ensure_frontmatter(
        body_ro,
        title=title_ro,
        description=desc_ro,
        slug=base_slug,
        lang="ro",
        date_value=now.isoformat(),
        keywords=keywords_ro,
    )
    meta = (title_en, desc_en, title_ro, desc_ro)
    return active_model, base_slug, en_body, ro_body, meta


def main() -> None:
    now = datetime.now(timezone.utc)
    root = Path(__file__).resolve().parent.parent
    en_dir = root / "content" / "en"
    ro_dir = root / "content" / "ro"
    en_dir.mkdir(parents=True, exist_ok=True)
    ro_dir.mkdir(parents=True, exist_ok=True)

    if _env_flag("GEMINI_CONTENT_TWO_STEP"):
        print("[Gemini] Mod două pași (GEMINI_CONTENT_TWO_STEP=1).", flush=True)
        active_model, base_slug, en_body, ro_body, meta = _pipeline_two_step(
            now, en_dir, ro_dir
        )
    else:
        print(
            "[Gemini] Mod un singur apel (EN+RO, markeri ===BEGIN_EN=== …). "
            "Pentru 2 pași: GEMINI_CONTENT_TWO_STEP=1.",
            flush=True,
        )
        try:
            active_model, base_slug, en_body, ro_body, meta = _pipeline_bilingual(
                now, en_dir, ro_dir
            )
        except ValueError as e:
            raise SystemExit(
                f"{e}\n"
                "Sfat: GEMINI_CONTENT_TWO_STEP=1 (două apeluri) sau verifică că modelul respectă "
                "markerii și TITLE_LINE/DESC_LINE; reduce lungimea cerută dacă răspunsul e trunchiat."
            ) from e

    title_en, desc_en, title_ro, desc_ro = meta
    ro_body = _maybe_retry_ro_if_similar(
        en_body=en_body,
        ro_body=ro_body,
        base_slug=base_slug,
        active_model=active_model,
        now=now,
        title_en=title_en,
        desc_en=desc_en,
        title_ro=title_ro,
        desc_ro=desc_ro,
    )
    if bodies_too_similar(en_body, ro_body):
        raise SystemExit(
            "Eșec: varianta RO e prea asemănătoare cu EN. Verifică modelul / promptul."
        )

    path_en = en_dir / f"{base_slug}.md"
    path_ro = ro_dir / f"{base_slug}.md"
    _write_both_markdown_or_none(path_en, path_ro, en_body, ro_body)

    print(f"EN (engleză): {path_en.relative_to(root)}")
    print(f"RO (română):  {path_ro.relative_to(root)}")
    print(f"Slug comun:     {base_slug}")
    print(f"Model folosit:  {active_model}", flush=True)


if __name__ == "__main__":
    main()
