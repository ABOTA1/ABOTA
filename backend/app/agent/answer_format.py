"""Turn ClickHouse/MCP row payloads into the chat briefing the Agent UI shows.

Layout (markdown):
  ### Title
  natural-language summary
  ---
  ### Trend Data
  ```json ... ```
  markdown table
  ---
  ### Key Takeaways
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Mapping, Optional, Sequence

from app.models.schemas import AnalyticsResult

_RAW_DUMP_PREFIXES = (
    "query completed. here is the raw result",
    "query completed, but i could not generate a summary",
)

_MONEY_KEYS = ("revenue", "budget", "usd", "gross", "spend")
_PCT_KEYS = ("percent", "pct", "roi_percentage")
_RATIO_KEYS = ("ratio", "multiplier")
_SENTIMENT_KEYS = ("sentiment",)
_DATE_KEYS = ("week", "date", "time", "day", "month", "year")


def ensure_natural_language_answer(
    answer: Optional[str],
    *,
    question: str,
    analytics: Optional[AnalyticsResult],
    tool_error: Optional[str] = None,
) -> str:
    """Always emit the report layout; keep Gemini's opening prose when it is usable."""
    if tool_error:
        return f"The database query could not be completed: {tool_error}"

    text = (answer or "").strip()
    rows = _rows_from_analytics(analytics)
    if not rows:
        return text or "No rows were returned for that question."

    return format_briefing(
        question,
        analytics,
        rows,
        summary=_extract_gemini_summary(text),
    )


def format_briefing(
    question: str,
    analytics: Optional[AnalyticsResult],
    rows: Optional[Sequence[Mapping[str, Any]]] = None,
    summary: Optional[str] = None,
) -> str:
    data_rows = list(rows if rows is not None else _rows_from_analytics(analytics))
    if not data_rows:
        return "No rows were returned for that question."

    title = _title_from_question(question, analytics)
    chart_type = _infer_chart_type(analytics, data_rows)
    columns = list(data_rows[0].keys())
    label_col = columns[0]
    metric_cols = columns[1:] if len(columns) > 1 else columns
    cleaned = [_json_safe_row(row) for row in data_rows]

    payload = {
        "chart_type": chart_type,
        "title": title,
        "x_axis": label_col,
        "metrics": metric_cols,
        "data": cleaned,
    }

    lead = (summary or "").strip() or _summary_paragraph(title, label_col, metric_cols, data_rows)
    table = _markdown_table(label_col, metric_cols, data_rows)
    takeaways = _takeaways(label_col, metric_cols, data_rows)
    json_block = json.dumps(payload, indent=2, default=str, ensure_ascii=False)
    return (
        f"### {title}\n\n"
        f"{lead}\n\n"
        "---\n\n"
        "### Breakdown\n\n"
        f"{table}\n\n"
        "---\n\n"
        "### Key Takeaways\n"
        f"{takeaways}\n\n"
        "---\n\n"
        "### Trend Data\n\n"
        f"```json\n{json_block}\n```"
    )


def _rows_from_analytics(analytics: Optional[AnalyticsResult]) -> List[Dict[str, Any]]:
    if analytics is None:
        return []
    raw = analytics.raw_rows or []
    if not raw:
        return []
    if len(raw) == 1 and isinstance(raw[0], dict) and "output" in raw[0] and len(raw[0]) == 1:
        parsed = _rows_from_mcp_text(str(raw[0].get("output") or ""))
        if parsed:
            return parsed
    if all(isinstance(row, dict) for row in raw):
        return [dict(row) for row in raw]
    return []


def _rows_from_mcp_text(text: str) -> List[Dict[str, Any]]:
    text = (text or "").strip()
    if not text:
        return []
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return []
    if isinstance(data, list) and data and isinstance(data[0], dict):
        return [dict(row) for row in data]
    if not isinstance(data, dict):
        return []
    columns = data.get("columns")
    rows = data.get("rows")
    if isinstance(columns, list) and isinstance(rows, list) and rows and not isinstance(rows[0], dict):
        clean_cols = [str(col).split(".")[-1] for col in columns]
        return [
            dict(zip(clean_cols, row))
            for row in rows
            if isinstance(row, (list, tuple))
        ]
    for key in ("data", "rows", "result", "results"):
        value = data.get(key)
        if isinstance(value, list) and value and isinstance(value[0], dict):
            return [dict(row) for row in value]
    return []


def _extract_gemini_summary(text: str) -> Optional[str]:
    """Keep Gemini's executive paragraph; drop tables, JSON, and leftover headings."""
    raw = (text or "").strip()
    if not raw:
        return None
    lowered = raw.lower()
    if any(lowered.startswith(prefix) for prefix in _RAW_DUMP_PREFIXES):
        return None
    if lowered.startswith("{") and '"columns"' in lowered:
        return None
    stripped = re.sub(r"```[\s\S]*?```", "", raw)
    stripped = re.sub(r"(?im)^### Key Takeaways\s*$[\s\S]*", "", stripped)
    lines: List[str] = []
    for line in stripped.splitlines():
        trimmed = line.strip()
        if not trimmed or trimmed == "---":
            continue
        if trimmed.startswith("#"):
            continue
        if trimmed.startswith("|") or re.match(r"^\|?[\s:-]+\|", trimmed):
            continue
        if trimmed.startswith("*(") or trimmed.startswith("("):
            continue
        lines.append(trimmed)
    prose = " ".join(lines).strip()
    prose = re.sub(r"\s+", " ", prose)
    if len(prose) < 40:
        return None
    return prose


def _title_from_question(question: str, analytics: Optional[AnalyticsResult]) -> str:
    raw = re.sub(r"\s+", " ", (question or "").strip()).rstrip("?.!")
    raw = re.sub(
        r"^(show|give me|tell me|what(?:'s| is)|which|how)\s+(the\s+|me\s+)?",
        "",
        raw,
        flags=re.IGNORECASE,
    ).strip()
    if raw:
        return raw[0].upper() + raw[1:]
    title = (analytics.title if analytics else "") or ""
    if title and not title.lower().startswith("result for"):
        return title
    return "Query results"


def polish_analytics(analytics: Optional[AnalyticsResult], question: str) -> None:
    """Align chart title/type with the briefing when MCP defaulted to a generic bar."""
    if analytics is None:
        return
    rows = _rows_from_analytics(analytics)
    if not rows:
        return
    inferred = _infer_chart_type(analytics, rows)
    if inferred in {"line", "bar", "pie", "table"}:
        analytics.chart_type = inferred
    if not analytics.title or analytics.title.lower().startswith("result for"):
        analytics.title = _title_from_question(question, analytics)


def _infer_chart_type(
    analytics: Optional[AnalyticsResult],
    rows: Sequence[Mapping[str, Any]],
) -> str:
    first = list(rows[0].keys())[0] if rows else ""
    if any(key in first.lower() for key in _DATE_KEYS):
        return "line"
    if analytics and analytics.chart_type in {"line", "bar", "pie"}:
        return analytics.chart_type
    return "bar"


def _json_safe_row(row: Mapping[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for key, value in row.items():
        out[str(key)] = _json_safe_value(str(key), value)
    return out


def _json_safe_value(key: str, value: Any) -> Any:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            return str(value)
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        lowered = key.lower()
        if any(token in lowered for token in _SENTIMENT_KEYS):
            return round(value, 3)
        if any(token in lowered for token in _PCT_KEYS + _RATIO_KEYS):
            return round(value, 2)
        if any(token in lowered for token in _MONEY_KEYS):
            return round(value, 2)
        return round(value, 4) if abs(value) < 1 else round(value, 2)
    return value


def _human_col(name: str) -> str:
    return re.sub(r"[_\s]+", " ", str(name)).strip().title()


def _primary_metric(metric_cols: Sequence[str]) -> Optional[str]:
    for col in metric_cols:
        lowered = col.lower()
        if any(token in lowered for token in ("ratio", "roi", "sentiment")):
            return col
    for col in metric_cols:
        lowered = col.lower()
        if any(token in lowered for token in _MONEY_KEYS) and "budget" not in lowered:
            return col
    return metric_cols[0] if metric_cols else None


def _format_money(number: float) -> str:
    sign = "-" if number < 0 else ""
    magnitude = abs(number)
    if magnitude >= 1_000_000_000:
        return f"{sign}${magnitude / 1_000_000_000:.1f}B"
    if magnitude >= 1_000_000:
        return f"{sign}${magnitude / 1_000_000:.1f}M"
    if magnitude >= 10_000:
        return f"{sign}${magnitude / 1_000:.0f}K"
    return f"{sign}${magnitude:,.0f}"


def _format_cell(key: str, value: Any) -> str:
    if value is None:
        return "—"
    lowered = key.lower()
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        number = float(value)
        if any(token in lowered for token in _SENTIMENT_KEYS):
            return f"{number:+.3f}"
        if any(token in lowered for token in _PCT_KEYS):
            return f"{number:,.1f}%"
        if any(token in lowered for token in _RATIO_KEYS):
            return f"{number:.2f}x"
        if any(token in lowered for token in _MONEY_KEYS):
            return _format_money(number)
        if number.is_integer():
            return f"{int(number):,}"
        return f"{number:,.2f}"
    return str(value)


def _numeric_pairs(
    label_col: str,
    metric: str,
    rows: Sequence[Mapping[str, Any]],
) -> List[tuple[str, float]]:
    pairs: List[tuple[str, float]] = []
    for row in rows:
        raw = row.get(metric)
        if isinstance(raw, bool) or not isinstance(raw, (int, float)):
            continue
        pairs.append((str(row.get(label_col, "")), float(raw)))
    return pairs


def _summary_paragraph(
    title: str,
    label_col: str,
    metric_cols: Sequence[str],
    rows: Sequence[Mapping[str, Any]],
) -> str:
    n = len(rows)
    primary = _primary_metric(metric_cols) or (metric_cols[0] if metric_cols else label_col)
    pairs = _numeric_pairs(label_col, primary, rows)
    pretty_metric = _human_col(primary)
    if not pairs:
        return (
            f"The query for **{title}** returned **{n}** row{'s' if n != 1 else ''} "
            f"keyed by **{_human_col(label_col)}**."
        )
    peak_label, peak_val = max(pairs, key=lambda item: item[1])
    low_label, low_val = min(pairs, key=lambda item: item[1])
    mean = sum(v for _, v in pairs) / len(pairs)
    return (
        f"Across **{n}** result{'s' if n != 1 else ''} for **{title}**, "
        f"**{pretty_metric}** averaged **{_format_cell(primary, mean)}**. "
        f"The peak was **{peak_label}** at **{_format_cell(primary, peak_val)}**; "
        f"the low was **{low_label}** at **{_format_cell(primary, low_val)}**."
    )


def _markdown_table(
    label_col: str,
    metric_cols: Sequence[str],
    rows: Sequence[Mapping[str, Any]],
) -> str:
    headers = [_human_col(label_col), *(_human_col(col) for col in metric_cols)]
    align = ["---", *( ":---:" for _ in metric_cols)]
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join(align) + " |",
    ]
    peak_metric = _primary_metric(metric_cols)
    peak_pairs = _numeric_pairs(label_col, peak_metric, rows) if peak_metric else []
    peak_label = max(peak_pairs, key=lambda item: item[1])[0] if peak_pairs else None
    for row in rows:
        label = str(row.get(label_col, ""))
        cells = [f"**{label}**" if label == peak_label else label]
        for col in metric_cols:
            cell = _format_cell(col, row.get(col))
            if col == peak_metric and label == peak_label:
                cell = f"**{cell}**"
            cells.append(cell)
        lines.append("| " + " | ".join(cells) + " |")
    return "\n".join(lines)


def _takeaways(
    label_col: str,
    metric_cols: Sequence[str],
    rows: Sequence[Mapping[str, Any]],
) -> str:
    items: List[str] = []
    ordered = []
    primary = _primary_metric(metric_cols)
    if primary:
        ordered.append(primary)
    for col in metric_cols:
        if col not in ordered:
            ordered.append(col)
    for metric in ordered[:3]:
        pairs = _numeric_pairs(label_col, metric, rows)
        if not pairs:
            continue
        peak_label, peak_val = max(pairs, key=lambda item: item[1])
        low_label, low_val = min(pairs, key=lambda item: item[1])
        pretty = _human_col(metric)
        items.append(
            f"1. **{pretty} peak**: **{peak_label}** at **{_format_cell(metric, peak_val)}**."
            if not items
            else f"{len(items) + 1}. **{pretty}**: peak **{peak_label}** ({_format_cell(metric, peak_val)}), "
            f"low **{low_label}** ({_format_cell(metric, low_val)})."
        )
    if not items:
        items.append(f"1. Returned **{len(rows)}** rows keyed by **{_human_col(label_col)}**.")
    return "\n".join(items)
