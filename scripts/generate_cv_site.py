#!/usr/bin/env python3
"""Generate a static CV website from a PDF created with the CV template.

The parser is intentionally template-oriented: it expects a Spanish CV with
date ranges in the left column, titles in the right column, and bullets marked
with "•". It produces structured JSON plus a semantic HTML/CSS page.
"""

from __future__ import annotations

import argparse
import html
import json
import math
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path
from typing import Any


LineRecord = tuple[int, str]

SECTION_DEFINITIONS = (
    ("experience", "EXPERIENCIA LABORAL"),
    ("education", "FORMACIÓN"),
    ("awards", "RECONOCIMIENTOS, PREMIOS E HITOS"),
)

SECTION_KEYS = tuple(section for section, _ in SECTION_DEFINITIONS)
PROJECT_ROOT = Path(__file__).resolve().parents[1]

FIRST_PAGE_BODY_LIMIT = 1015
FOLLOWING_PAGE_BODY_LIMIT = 1050
FIRST_PAGE_HEADER_COST = 92
SECTION_HEADING_COST = 29
SECTION_BOUNDARY_COST = 19

MONTHS = (
    "ene",
    "feb",
    "mar",
    "abr",
    "mayo",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
)

DATE_RE = re.compile(
    rf"^\s*((?:{'|'.join(MONTHS)})\.?\s+\d{{4}}"
    rf"(?:\s*[—-]\s*(?:(?:{'|'.join(MONTHS)})\.?\s+\d{{4}}|presente))?)"
    rf"\s{{2,}}(.+?)\s*$",
    re.IGNORECASE,
)

EMAIL_RE = re.compile(r"[\w.+-]+@[\w.-]+\.\w+")
PHONE_RE = re.compile(r"\+?\d[\d\s]{6,}\d")
URL_RE = re.compile(r"(?P<url>(?:https?://)?(?:www\.)?(?:bit\.ly|[\w.-]+\.\w{2,})/[^\s)]+)")


def run_command(args: list[str], cwd: Path | None = None) -> str:
    result = subprocess.run(args, cwd=cwd, check=True, text=True, capture_output=True)
    return result.stdout


def strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def heading_key(value: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", strip_accents(value).upper())


def compact_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def join_continuation(previous: str, continuation: str) -> str:
    continuation = compact_spaces(continuation)
    if not continuation:
        return previous

    previous = previous.rstrip()
    if previous.endswith("-"):
        return f"{previous[:-1].rstrip()} {continuation}"
    return f"{previous} {continuation}"


def split_title_meta(value: str) -> tuple[str, str | None]:
    parts = re.split(r"\s{8,}", value.strip(), maxsplit=1)
    if len(parts) == 2:
        return compact_spaces(parts[0]), compact_spaces(parts[1])
    return compact_spaces(value), None


def extract_text(pdf: Path) -> str:
    return run_command(["pdftotext", "-layout", str(pdf), "-"])


def extract_profile_image(pdf: Path, output: Path) -> str | None:
    """Extract the largest near-square embedded image as a profile image."""
    try:
        from PIL import Image
    except Exception:
        return None

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        subprocess.run(
            ["pdfimages", "-j", str(pdf), str(tmp_path / "img")],
            check=True,
            text=True,
            capture_output=True,
        )

        candidates: list[tuple[int, Path]] = []
        for path in tmp_path.glob("img-*"):
            try:
                with Image.open(path) as image:
                    width, height = image.size
                    ratio = width / height if height else 0
                    if 0.55 <= ratio <= 1.8:
                        candidates.append((width * height, path))
            except Exception:
                continue

        if not candidates:
            return None

        _, image_path = max(candidates, key=lambda item: item[0])
        output.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(image_path) as image:
            image.convert("RGB").save(output, quality=92)
        return output.as_posix()


def write_profile_image(source: Path, output: Path) -> None:
    """Write any supported image input as a browser-friendly JPEG."""
    try:
        from PIL import Image
    except Exception:
        shutil.copy2(source, output)
        return

    output.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image.convert("RGB").save(output, "JPEG", quality=92)


def copy_font_assets(out: Path) -> None:
    source = PROJECT_ROOT / "assets" / "fonts"
    target = out / "assets" / "fonts"

    if not source.exists():
        print(f"Warning: font assets not found at {source}", file=sys.stderr)
        return

    if source.resolve() == target.resolve():
        return

    shutil.copytree(source, target, dirs_exist_ok=True)


def sectionize(text: str) -> tuple[dict[str, list[LineRecord]], int]:
    section_map = {
        "EXPERIENCIALABORAL": "experience",
        "FORMACION": "education",
        "RECONOCIMIENTOSPREMIOSEHITOS": "awards",
    }
    sections: dict[str, list[LineRecord]] = {"header": []}
    current = "header"
    page_count = 0

    for page_number, page_text in enumerate(text.split("\f"), start=1):
        if page_text.strip():
            page_count = page_number

        for line in page_text.splitlines():
            key = heading_key(line)
            matched = None
            for needle, name in section_map.items():
                if needle == key:
                    matched = name
                    break

            if matched:
                current = matched
                sections.setdefault(current, [])
                continue

            sections.setdefault(current, []).append((page_number, line.rstrip()))

    return sections, max(page_count, 1)


def parse_header(lines: list[LineRecord]) -> dict[str, str]:
    raw_lines = [line for _, line in lines]
    nonempty = [compact_spaces(line) for line in raw_lines if line.strip()]
    first = nonempty[0] if nonempty else "Nombre Apellidos, Perfil profesional"
    second = nonempty[1] if len(nonempty) > 1 else ""

    if "," in first:
        name, title = first.split(",", 1)
    else:
        name, title = first, ""

    email = EMAIL_RE.search(second)
    phone = PHONE_RE.search(second)

    return {
        "name": compact_spaces(name),
        "title": compact_spaces(title),
        "email": email.group(0) if email else "",
        "phone": compact_spaces(phone.group(0)) if phone else "",
    }


def parse_entries(lines: list[LineRecord], *, split_meta: bool = False) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    last_was_bullet = False

    for page_number, raw_line in lines:
        if not raw_line.strip():
            last_was_bullet = False
            continue

        line = raw_line.rstrip()
        match = DATE_RE.match(line)
        if match:
            title, meta = (
                split_title_meta(match.group(2))
                if split_meta
                else (compact_spaces(match.group(2)), None)
            )
            current = {
                "_source_page": page_number,
                "date": compact_spaces(match.group(1).replace("—", "-")),
                "title": title,
                "meta": meta,
                "bullets": [],
            }
            entries.append(current)
            last_was_bullet = False
            continue

        if current is None:
            continue

        stripped = line.strip()
        if stripped.startswith("•"):
            current["bullets"].append(compact_spaces(stripped.lstrip("•").strip()))
            last_was_bullet = True
            continue

        if last_was_bullet and current["bullets"]:
            current["bullets"][-1] = join_continuation(current["bullets"][-1], stripped)
            continue

        current["title"] = join_continuation(current["title"], stripped)
        last_was_bullet = False

    return entries


def parse_pdf(pdf: Path) -> dict[str, Any]:
    text = extract_text(pdf)
    sections, page_count = sectionize(text)
    header = parse_header(sections.get("header", []))

    return {
        **header,
        "page_count": page_count,
        "experience": parse_entries(sections.get("experience", [])),
        "education": parse_entries(sections.get("education", []), split_meta=True),
        "awards": parse_entries(sections.get("awards", [])),
    }


def read_string(
    data: dict[str, Any],
    key: str,
    errors: list[str],
    *,
    required: bool = False,
    label: str | None = None,
) -> str:
    field = label or key
    value = data.get(key, "")
    if value is None:
        value = ""

    if not isinstance(value, str):
        errors.append(f"`{field}` debe ser texto.")
        return ""

    value = compact_spaces(value)
    if required and not value:
        errors.append(f"`{field}` es obligatorio.")
    return value


def normalize_item(raw_item: Any, section: str, index: int, errors: list[str]) -> dict[str, Any] | None:
    path = f"{section}[{index}]"
    if not isinstance(raw_item, dict):
        errors.append(f"`{path}` debe ser un objeto.")
        return None

    date = read_string(raw_item, "date", errors, required=True, label=f"{path}.date")
    title = read_string(raw_item, "title", errors, required=True, label=f"{path}.title")
    meta = raw_item.get("meta")
    page_break_before = raw_item.get("page_break_before", False)

    if meta is not None and not isinstance(meta, str):
        errors.append(f"`{path}.meta` debe ser texto o null.")
        meta = None

    if not isinstance(page_break_before, bool):
        errors.append(f"`{path}.page_break_before` debe ser true o false.")
        page_break_before = False

    bullets_value = raw_item.get("bullets", [])
    if bullets_value is None:
        bullets_value = []

    if not isinstance(bullets_value, list):
        errors.append(f"`{path}.bullets` debe ser una lista de textos.")
        bullets: list[str] = []
    else:
        bullets = []
        for bullet_index, bullet in enumerate(bullets_value):
            if not isinstance(bullet, str):
                errors.append(f"`{path}.bullets[{bullet_index}]` debe ser texto.")
                continue
            bullet = compact_spaces(bullet)
            if bullet:
                bullets.append(bullet)

    normalized = {
        "date": date,
        "title": title,
        "meta": compact_spaces(meta) if isinstance(meta, str) and meta.strip() else None,
        "bullets": bullets,
    }

    if page_break_before:
        normalized["page_break_before"] = True

    page = raw_item.get("page")
    if page not in (None, ""):
        if isinstance(page, int) and not isinstance(page, bool):
            page_number = page
        elif isinstance(page, str) and page.isdigit():
            page_number = int(page)
        else:
            errors.append(f"`{path}.page` debe ser un número entero positivo.")
            page_number = None

        if page_number is not None:
            if page_number < 1:
                errors.append(f"`{path}.page` debe ser un número entero positivo.")
            else:
                normalized["page"] = page_number

    if "bullet" in raw_item and "bullets" not in raw_item:
        errors.append(f"`{path}.bullet` no es válido; usa `bullets` como lista.")

    return normalized


def normalize_data(data: dict[str, Any]) -> dict[str, Any]:
    """Validate and normalize editable CV data."""
    if not isinstance(data, dict):
        raise ValueError("El JSON raíz debe ser un objeto.")

    errors: list[str] = []
    normalized: dict[str, Any] = {
        "name": read_string(data, "name", errors, required=True),
        "title": read_string(data, "title", errors),
        "email": read_string(data, "email", errors),
        "phone": read_string(data, "phone", errors),
    }

    for section in SECTION_KEYS:
        section_value = data.get(section, [])
        if section_value is None:
            section_value = []

        if not isinstance(section_value, list):
            errors.append(f"`{section}` debe ser una lista.")
            normalized[section] = []
            continue

        items = []
        previous_source_page = None
        for index, raw_item in enumerate(section_value):
            item = normalize_item(raw_item, section, index, errors)
            if item is not None:
                source_page = raw_item.get("_source_page") if isinstance(raw_item, dict) else None
                if isinstance(source_page, int):
                    if previous_source_page is not None and source_page > previous_source_page:
                        item["page_break_before"] = True
                    previous_source_page = source_page
                items.append(item)
        normalized[section] = items

    if errors:
        raise ValueError("Errores en cv-data.json:\n- " + "\n- ".join(errors))

    return normalized


def load_json_data(path: Path) -> dict[str, Any]:
    try:
        raw_data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"JSON inválido en {path}: línea {exc.lineno}, columna {exc.colno}.") from exc

    return normalize_data(raw_data)


def wrapped_line_count(value: str, chars_per_line: int) -> int:
    value = compact_spaces(value)
    if not value:
        return 1
    return max(1, math.ceil(len(value) / chars_per_line))


def estimate_item_height(item: dict[str, Any]) -> int:
    title = item.get("title", "")
    meta = item.get("meta") or ""
    title_lines = wrapped_line_count(f"{title} {meta}", 62)
    bullet_lines = sum(wrapped_line_count(bullet, 78) for bullet in item.get("bullets", []))
    bullet_count = len(item.get("bullets", []))
    text_height = title_lines * 16 + bullet_lines * 14 + bullet_count
    bullet_gap = 4 if bullet_count else 0
    return max(32, text_height + bullet_gap + 12)


def page_body_limit(page_number: int) -> int:
    return FIRST_PAGE_BODY_LIMIT if page_number == 1 else FOLLOWING_PAGE_BODY_LIMIT


def page_base_cost(page_number: int) -> int:
    return FIRST_PAGE_HEADER_COST if page_number == 1 else 0


def paginate_auto(data: dict[str, Any]) -> dict[str, Any]:
    """Assign page numbers from content size instead of requiring them in JSON."""
    paginated = {key: value for key, value in data.items() if key not in SECTION_KEYS}
    current_page = 1
    used = page_base_cost(current_page)

    for section, _ in SECTION_DEFINITIONS:
        paginated_items = []
        section_started = False

        for item in data.get(section, []):
            page_item = dict(item)
            base = page_base_cost(current_page)

            if page_item.get("page_break_before") and used > base:
                current_page += 1
                used = page_base_cost(current_page)
                base = used

            heading_cost = 0 if section_started else SECTION_HEADING_COST
            boundary_cost = 0
            if heading_cost and used > base:
                boundary_cost = SECTION_BOUNDARY_COST

            item_cost = estimate_item_height(page_item)
            total_cost = boundary_cost + heading_cost + item_cost

            if used + total_cost > page_body_limit(current_page) and used > base:
                current_page += 1
                used = page_base_cost(current_page)
                base = used
                heading_cost = 0 if section_started else SECTION_HEADING_COST
                boundary_cost = 0
                total_cost = heading_cost + item_cost

            page_item["page"] = current_page
            paginated_items.append(page_item)
            used += total_cost
            section_started = True

        paginated[section] = paginated_items

    paginated["page_count"] = max(1, current_page)
    return paginated


def paginate_manual(data: dict[str, Any]) -> dict[str, Any]:
    """Preserve explicit page fields for backwards compatibility."""
    paginated = {key: value for key, value in data.items() if key not in SECTION_KEYS}
    max_page = 1

    for section in SECTION_KEYS:
        previous_page = 1
        items = []
        for item in data.get(section, []):
            page_item = dict(item)
            page_item["page"] = int(page_item.get("page") or previous_page)
            previous_page = page_item["page"]
            max_page = max(max_page, page_item["page"])
            items.append(page_item)
        paginated[section] = items

    paginated["page_count"] = max_page
    return paginated


def esc(value: Any) -> str:
    return html.escape(str(value or ""), quote=True)


def format_date(value: Any) -> str:
    return re.sub(r"\s+-\s+", " — ", str(value or ""))


def render_inline(value: Any) -> str:
    text = str(value or "")
    rendered = []
    position = 0

    for match in URL_RE.finditer(text):
        rendered.append(esc(text[position : match.start()]))
        url_text = match.group("url")
        trailing = ""
        while url_text and url_text[-1] in ".,;:":
            trailing = url_text[-1] + trailing
            url_text = url_text[:-1]

        href = url_text if url_text.startswith(("http://", "https://")) else f"https://{url_text}"
        rendered.append(f'<a href="{esc(href)}">{esc(url_text)}</a>{esc(trailing)}')
        position = match.end()

    rendered.append(esc(text[position:]))
    return "".join(rendered)


def render_contact(data: dict[str, Any]) -> str:
    parts = []
    phone = compact_spaces(data.get("phone", ""))
    email = compact_spaces(data.get("email", ""))

    if phone:
        tel = re.sub(r"(?!^)[^\d]", "", phone)
        parts.append(f'<a href="tel:{esc(tel)}">{esc(phone)}</a>')

    if email:
        parts.append(f'<a href="mailto:{esc(email)}">{esc(email)}</a>')

    return ", ".join(parts)


def render_items(items: list[dict[str, Any]], section: str) -> str:
    rendered = []
    for item in items:
        bullets = ""
        if item.get("bullets"):
            bullets = "<ul>" + "".join(f"<li>{render_inline(bullet)}</li>" for bullet in item["bullets"]) + "</ul>"

        meta = f' <span class="meta">{esc(item["meta"])}</span>' if item.get("meta") else ""
        classes = ["cv-item", f"cv-item--{section}"]
        if bullets:
            classes.append("cv-item--with-bullets")

        rendered.append(
            f"""
            <article class="{esc(' '.join(classes))}">
              <time>{esc(format_date(item["date"]))}</time>
              <div class="item-body">
                <h3>{esc(item["title"])}{meta}</h3>
                {bullets}
              </div>
            </article>
            """
        )
    return "\n".join(rendered)


def render_section(data: dict[str, Any], section: str, title: str, page_number: int) -> str:
    items = data.get(section, [])
    page_items = [item for item in items if item.get("page", 1) == page_number]
    if not page_items:
        return ""

    first_page = min(item.get("page", 1) for item in items) if items else page_number
    heading = f'<h2 class="section-title">{esc(title)}</h2>' if page_number == first_page else ""
    continuation_class = " cv-section--continued" if page_number != first_page else ""

    return f"""
          <section class="cv-section{continuation_class}">
            {heading}
            {render_items(page_items, section)}
          </section>
    """


def render_pages(data: dict[str, Any], profile: str) -> str:
    title = f"{data['name']}, {data['title']}" if data.get("title") else data["name"]
    contact = render_contact(data)
    page_count = int(data.get("page_count") or 1)
    pages = []

    for page_number in range(1, page_count + 1):
        header = ""
        if page_number == 1:
            header = f"""
          <header class="cv-header">
            <div>
              <h1>{esc(title)}</h1>
              <p class="contact">{contact}</p>
            </div>
            {profile}
          </header>
            """

        pages.append(
            f"""
        <article class="cv-page" aria-label="Página {page_number} del curriculum de {esc(data['name'])}">
          {header}
          {"".join(render_section(data, section, section_title, page_number) for section, section_title in SECTION_DEFINITIONS)}
        </article>
            """
        )

    return "\n".join(pages)


def render_html(data: dict[str, Any], profile_path: str | None, pdf_path: str | None) -> str:
    profile = (
        f'<img class="profile-photo" src="{esc(profile_path)}" alt="Foto de {esc(data["name"])}" />'
        if profile_path
        else ""
    )
    page_count = int(data.get("page_count") or 1)
    download_button = (
        f"""
        <a class="icon-btn" href="{esc(pdf_path)}" download aria-label="Descargar PDF" title="Descargar PDF">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"></path></svg>
        </a>
        """
        if pdf_path
        else ""
    )

    return f"""<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{esc(data['name'])} | CV</title>
    <meta name="description" content="CV web generado desde PDF para {esc(data['name'])}." />
    <style>
      :root {{
        --toolbar-height: 58px;
        --toolbar-bg: #333333;
        --viewer-bg: #2d2d2d;
        --text: #f2f2f2;
        --muted: #c7c7c7;
        --page-width: 794px;
        --page-height: 1123px;
        --zoom: 129;
        --paper: #ffffff;
        --ink: #1f1f1f;
        --rule: #1e1e1e;
      }}

      @font-face {{
        font-family: "EB Garamond CV";
        src: url("./assets/fonts/EBGaramond-Regular.ttf") format("truetype");
        font-style: normal;
        font-weight: 400;
        font-display: swap;
      }}

      @font-face {{
        font-family: "EB Garamond CV";
        src: url("./assets/fonts/EBGaramond-Medium.ttf") format("truetype");
        font-style: normal;
        font-weight: 500;
        font-display: swap;
      }}

      @font-face {{
        font-family: "EB Garamond CV";
        src: url("./assets/fonts/EBGaramond-Bold.ttf") format("truetype");
        font-style: normal;
        font-weight: 700;
        font-display: swap;
      }}

      * {{ box-sizing: border-box; }}

      html,
      body {{
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: var(--viewer-bg);
        color: var(--text);
        font-family: "Segoe UI", Arial, sans-serif;
      }}

      .toolbar {{
        height: var(--toolbar-height);
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 12px;
        padding: 0 12px;
        background: var(--toolbar-bg);
        border-bottom: 1px solid #404040;
      }}

      .toolbar-group {{
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }}

      .toolbar-group.center {{ justify-content: center; }}
      .toolbar-group.right {{ justify-content: flex-end; }}

      .icon-btn,
      .zoom-display,
      .page-display {{
        height: 32px;
        min-width: 32px;
        border: 1px solid transparent;
        background: transparent;
        color: var(--text);
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        line-height: 1;
      }}

      .icon-btn {{ cursor: pointer; }}
      .icon-btn:hover {{ background: rgba(255, 255, 255, 0.08); }}
      .icon-btn svg {{ width: 18px; height: 18px; display: block; fill: currentColor; }}

      .title {{
        font-size: 14px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }}

      .page-display {{ gap: 6px; padding: 0 10px; }}
      .current-page {{
        background: #111111;
        min-width: 28px;
        min-height: 28px;
        padding: 4px 8px;
        border-radius: 2px;
        font-weight: 600;
      }}

      .page-total {{ color: var(--muted); }}
      .zoom-display {{
        background: #202020;
        border: 1px solid #4a4a4a;
        min-width: 62px;
        padding: 0 10px;
        font-size: 14px;
        font-weight: 600;
      }}

      .divider {{ width: 1px; height: 26px; background: rgba(255, 255, 255, 0.18); }}

      .viewer {{
        height: calc(100% - var(--toolbar-height));
        overflow: auto;
        background: var(--viewer-bg);
        scrollbar-color: #8b8b8b #2b2b2b;
      }}

      .viewer::-webkit-scrollbar {{ width: 16px; height: 16px; }}
      .viewer::-webkit-scrollbar-track {{ background: #2b2b2b; }}
      .viewer::-webkit-scrollbar-thumb {{
        border: 3px solid #2b2b2b;
        border-radius: 999px;
        background: #8b8b8b;
      }}

      .pages {{
        width: max(100%, calc(var(--page-width) * var(--zoom) / 100));
        min-height: 100%;
        padding: 4px 0 28px;
        display: grid;
        gap: 18px;
        justify-items: center;
      }}

      .cv-page {{
        width: var(--page-width);
        min-height: var(--page-height);
        height: var(--page-height);
        zoom: calc(var(--zoom) / 100);
        margin: 0;
        padding: 20px 60px 50px;
        background: var(--paper);
        color: var(--ink);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.32);
        font-family: "EB Garamond CV", "Times New Roman", Times, serif;
        font-size: 12px;
        line-height: 1.24;
        font-kerning: normal;
        text-rendering: geometricPrecision;
        font-feature-settings: "kern" 1, "liga" 1;
      }}

      .cv-header {{
        position: relative;
        min-height: 84px;
        display: grid;
        place-items: center;
        border-bottom: 1pt solid var(--rule);
        padding-bottom: 0;
        margin-bottom: 7px;
      }}

      .cv-header > div {{
        transform: translateY(1px);
      }}

      .cv-header h1 {{
        margin: 0 58px 14px;
        text-align: center;
        font-size: 16.55px;
        line-height: 1.1;
        white-space: nowrap;
      }}

      .contact {{
        margin: 0;
        text-align: center;
        font-size: 12px;
        font-weight: 500;
      }}

      .contact a {{
        color: inherit;
        text-decoration: none;
      }}

      .profile-photo {{
        position: absolute;
        right: 5px;
        top: 0;
        width: 80.5px;
        height: 80.5px;
        object-fit: cover;
      }}

      .cv-section {{
        border-top: 1pt solid var(--rule);
        margin-top: 11px;
        padding-top: 9px;
      }}

      .cv-page + .cv-page {{
        padding-top: 40px;
      }}

      .cv-header + .cv-section {{
        border-top: 0;
        margin-top: 0;
        padding-top: 0;
      }}

      .cv-section--continued {{
        border-top: 0;
        margin-top: 0;
        padding-top: 0;
      }}

      .section-title {{
        margin: 0 0 13px;
        font-size: 11.35px;
        font-weight: 500;
        letter-spacing: 0.12em;
        line-height: 1.16;
      }}

      .cv-item {{
        display: grid;
        grid-template-columns: 150px 1fr;
        column-gap: 18px;
        margin-bottom: 24px;
      }}

      .cv-item time {{
        font-size: 12px;
        white-space: nowrap;
      }}

      .item-body h3 {{
        margin: 0 0 4px;
        font-size: 14.55px;
        line-height: 1.15;
        font-weight: 500;
      }}

      .item-body {{
        min-width: 0;
      }}

      .cv-item--experience.cv-item--with-bullets {{
        margin-bottom: 19px;
      }}

      .cv-item--experience.cv-item--with-bullets .item-body h3 {{
        margin-bottom: 9px;
      }}

      .cv-item--education h3 {{
        display: flex;
        gap: 16px;
        justify-content: space-between;
        align-items: baseline;
      }}

      .cv-item--education {{
        margin-bottom: 22.75px;
      }}

      .meta {{
        font-size: 12px;
        font-weight: 400;
        white-space: nowrap;
      }}

      ul {{
        margin: 0;
        padding-left: 30px;
      }}

      li {{
        margin: 0 0 0;
      }}

      .cv-page a {{
        color: inherit;
        text-decoration: underline;
        text-decoration-thickness: 0.8px;
        text-underline-offset: 1px;
      }}

      .cv-page .contact a {{
        text-decoration: none;
      }}

      .cv-item--awards .item-body a {{
        text-decoration: none;
      }}

      .cv-item--awards .item-body h3 {{
        font-size: 14.55px;
        max-width: 380px;
        margin-bottom: 7px;
      }}

      .cv-footer {{
        display: none;
      }}

      @media (max-width: 860px) {{
        .toolbar {{
          grid-template-columns: 1fr;
          height: auto;
          padding: 10px;
        }}

        .toolbar-group.center,
        .toolbar-group.right {{ justify-content: flex-start; }}

        .viewer {{ height: calc(100% - 120px); }}
      }}

      @media print {{
        @page {{ size: A4; margin: 0; }}
        body {{ background: #ffffff; overflow: visible; }}
        .toolbar {{ display: none; }}
        .viewer {{ height: auto; overflow: visible; background: #ffffff; }}
        .pages {{ display: block; padding: 0; width: auto; }}
        .cv-page {{ zoom: 1; width: var(--page-width); min-height: var(--page-height); height: var(--page-height); box-shadow: none; }}
        .cv-page:not(:last-child) {{ break-after: page; page-break-after: always; }}
      }}
    </style>
  </head>
  <body>
    <header class="toolbar">
      <div class="toolbar-group">
        <button class="icon-btn" type="button" aria-label="Menu">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v2H4V7zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"></path></svg>
        </button>
        <div class="title">{esc(data['title'] or data['name'])}</div>
      </div>

      <div class="toolbar-group center">
        <div class="page-display" aria-label="Paginacion">
          <span class="current-page" id="current-page">1</span>
          <span class="page-total">/</span>
          <span class="page-total">{page_count}</span>
        </div>
        <div class="divider" aria-hidden="true"></div>
        <button class="icon-btn" type="button" aria-label="Reducir zoom" id="zoom-out">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 11h14v2H5z"></path></svg>
        </button>
        <div class="zoom-display" id="zoom-display">129%</div>
        <button class="icon-btn" type="button" aria-label="Aumentar zoom" id="zoom-in">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"></path></svg>
        </button>
      </div>

      <div class="toolbar-group right">
        <button class="icon-btn" type="button" aria-label="Ajustar a pagina" id="fit-width">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h5V5H5v7h2V7zm10 0v5h2V5h-7v2h5zm0 10h-5v2h7v-7h-2v5zM7 12H5v7h7v-2H7v-5z"></path></svg>
        </button>
        <div class="divider" aria-hidden="true"></div>
        {download_button}
        <button class="icon-btn" type="button" aria-label="Imprimir" onclick="window.print()">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 8V3H7v5H5a2 2 0 0 0-2 2v6h4v5h10v-5h4v-6a2 2 0 0 0-2-2h-2zm-8-3h6v3H9V5zm6 14H9v-5h6v5zm4-5h-2v-2H7v2H5v-4h14v4z"></path></svg>
        </button>
      </div>
    </header>

    <main class="viewer" id="viewer">
      <section class="pages">
        {render_pages(data, profile)}
      </section>
    </main>

    <script>
      const root = document.documentElement;
      const viewer = document.getElementById("viewer");
      const currentPage = document.getElementById("current-page");
      const zoomDisplay = document.getElementById("zoom-display");
      const zoomIn = document.getElementById("zoom-in");
      const zoomOut = document.getElementById("zoom-out");
      const fitWidth = document.getElementById("fit-width");
      const pages = Array.from(document.querySelectorAll(".cv-page"));
      const pageBaseWidth = 794;
      const zoomSteps = [70, 80, 90, 100, 110, 120, 129, 140, 150, 160, 175, 200];
      let zoomIndex = zoomSteps.indexOf(129);

      function setZoom(value) {{
        root.style.setProperty("--zoom", String(value));
        zoomDisplay.textContent = `${{value}}%`;
      }}

      function nearestZoomIndex(value) {{
        return zoomSteps.reduce((bestIndex, candidate, index) => {{
          const best = zoomSteps[bestIndex];
          return Math.abs(candidate - value) < Math.abs(best - value) ? index : bestIndex;
        }}, 0);
      }}

      function fitToWidth() {{
        const available = Math.max(viewer.clientWidth - 120, 320);
        const fitZoom = Math.round((available / pageBaseWidth) * 100);
        zoomIndex = nearestZoomIndex(Math.min(Math.max(fitZoom, zoomSteps[0]), zoomSteps[zoomSteps.length - 1]));
        setZoom(zoomSteps[zoomIndex]);
        viewer.scrollLeft = 0;
      }}

      function updateCurrentPage() {{
        const viewportTop = viewer.scrollTop + 24;
        const activeIndex = pages.reduce((best, page, index) => {{
          const bestPage = pages[best];
          return Math.abs(page.offsetTop - viewportTop) < Math.abs(bestPage.offsetTop - viewportTop)
            ? index
            : best;
        }}, 0);
        currentPage.textContent = String(activeIndex + 1);
      }}

      zoomIn.addEventListener("click", () => {{
        zoomIndex = Math.min(zoomIndex + 1, zoomSteps.length - 1);
        setZoom(zoomSteps[zoomIndex]);
        updateCurrentPage();
      }});

      zoomOut.addEventListener("click", () => {{
        zoomIndex = Math.max(zoomIndex - 1, 0);
        setZoom(zoomSteps[zoomIndex]);
        updateCurrentPage();
      }});

      fitWidth.addEventListener("click", fitToWidth);
      viewer.addEventListener("scroll", updateCurrentPage, {{ passive: true }});

      document.addEventListener("keydown", (event) => {{
        if ((event.ctrlKey || event.metaKey) && event.key === "+") {{
          event.preventDefault();
          zoomIn.click();
        }}

        if ((event.ctrlKey || event.metaKey) && event.key === "-") {{
          event.preventDefault();
          zoomOut.click();
        }}

        if ((event.ctrlKey || event.metaKey) && event.key === "0") {{
          event.preventDefault();
          zoomIndex = zoomSteps.indexOf(100);
          setZoom(100);
        }}
      }});

      setZoom(zoomSteps[zoomIndex]);
      updateCurrentPage();
    </script>
  </body>
</html>
"""


def write_json(data: dict[str, Any], output: Path) -> None:
    output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a static CV website from a PDF.")
    parser.add_argument("pdf", type=Path, nargs="?", help="Input CV PDF.")
    parser.add_argument("--data", type=Path, help="Render from an existing cv-data.json file.")
    parser.add_argument("--out", type=Path, default=Path("."), help="Output directory.")
    parser.add_argument("--photo", type=Path, help="Optional profile photo override.")
    parser.add_argument("--pdf-name", default="cv.pdf", help="PDF filename copied into the output.")
    parser.add_argument(
        "--manual-pages",
        action="store_true",
        help="Use explicit page fields from JSON instead of automatic pagination.",
    )
    args = parser.parse_args()

    out = args.out.resolve()
    assets = out / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    copy_font_assets(out)
    data_dir = args.data.resolve().parent if args.data else None

    try:
        if args.data:
            data = load_json_data(args.data.resolve())
        else:
            if not args.pdf:
                parser.error("the PDF argument is required unless --data is provided")
            data = normalize_data(parse_pdf(args.pdf.resolve()))
    except ValueError as exc:
        print(exc, file=sys.stderr)
        raise SystemExit(2) from exc

    pdf_output = out / args.pdf_name
    if args.pdf and args.pdf.resolve() != pdf_output.resolve():
        pdf = args.pdf.resolve()
        shutil.copy2(pdf, pdf_output)
    elif not args.pdf and data_dir:
        pdf_source = data_dir / args.pdf_name
        if pdf_source.exists() and pdf_source.resolve() != pdf_output.resolve():
            shutil.copy2(pdf_source, pdf_output)

    pdf_rel = f"./{args.pdf_name}" if pdf_output.exists() else None

    profile_rel = None
    profile_output = assets / "profile.jpg"
    if args.photo:
        write_profile_image(args.photo, profile_output)
        profile_rel = "./assets/profile.jpg"
    elif profile_output.exists():
        profile_rel = "./assets/profile.jpg"
    elif args.pdf:
        extracted = extract_profile_image(args.pdf.resolve(), profile_output)
        if extracted:
            profile_rel = "./assets/profile.jpg"
    elif data_dir:
        profile_source = data_dir / "assets" / "profile.jpg"
        if profile_source.exists():
            if profile_source.resolve() != profile_output.resolve():
                write_profile_image(profile_source, profile_output)
            profile_rel = "./assets/profile.jpg"
    else:
        profile_rel = None

    data_output = out / "cv-data.json"
    wrote_data = False
    if not args.data or args.data.resolve() != data_output.resolve():
        write_json(data, data_output)
        wrote_data = True

    render_data = paginate_manual(data) if args.manual_pages else paginate_auto(data)
    html_output = render_html(render_data, profile_rel, pdf_rel)
    (out / "index.html").write_text(html_output, encoding="utf-8")

    print(f"Generated {out / 'index.html'}")
    if wrote_data:
        print(f"Generated {data_output}")
    else:
        print(f"Used existing {data_output}")


if __name__ == "__main__":
    main()
