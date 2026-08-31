"""
app/agent/gemini_client.py – Gemini agent reasoning loop powered by MCP.

This client uses the Model Context Protocol (mcp) to discover tools dynamically
from the `mcp-clickhouse` server, passes them to Gemini, and executes them over stdio.

Security note
-------------
Gemini decides *what* SQL to run, but it is an untrusted planner from the
point of view of our database: prompt injection (via the user's question,
via social_mentions.raw_text once queried, etc.) could in principle cause it
to emit a destructive statement. `prompts.py` instructs the model to only
emit SELECT statements, but a system prompt is not an enforcement
mechanism — it's a request. `_validate_sql_query` below is the actual
enforcement boundary: every tool-call argument that looks like SQL is
checked before it ever reaches the `mcp-clickhouse` server, and anything
that isn't a single, standalone SELECT statement is rejected.
"""
import os
import re
import json
import logging
from typing import Any, Dict, List, Optional

from google import genai
from google.genai import types

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from app.config import get_settings
from app.agent.prompts import SYSTEM_PROMPT
from app.agent.mcp_bridge import get_gemini_tools_from_mcp
from app.models.schemas import AnalyticsResult, ChartSeries, SeriesPoint

logger = logging.getLogger(__name__)
settings = get_settings()

# ── SQL safety guard ──────────────────────────────────────────────────────
# Argument keys we scan for SQL text. Different MCP ClickHouse servers use
# different conventions ("query" is what mcp-clickhouse's `query_clickhouse`
# tool expects today; "sql" is kept for compatibility with alternative
# server implementations / future tool names).
_SQL_ARG_KEYS = ("query", "sql")

# Keywords that indicate a DDL/DML statement (or an attempt to smuggle one
# in after a semicolon). Matched as whole words, case-insensitively.
_FORBIDDEN_KEYWORDS = (
    "DROP", "DELETE", "TRUNCATE", "INSERT", "UPDATE", "ALTER", "CREATE",
    "GRANT", "REVOKE", "RENAME", "ATTACH", "DETACH", "OPTIMIZE",
    "KILL", "SYSTEM", "EXCHANGE", "REPLACE",
)

# ClickHouse table functions that can read/write outside the database
# (filesystem, network, other clusters) and therefore shouldn't be reachable
# from a natural-language analytics agent even inside a read-only SELECT.
_FORBIDDEN_TABLE_FUNCTIONS = (
    "file(", "url(", "s3(", "remote(", "remoteSecure(", "hdfs(", "mysql(", "postgresql(",
)

_LEADING_COMMENT_RE = re.compile(r"^(\s*--[^\n]*\n|\s*/\*.*?\*/\s*)+", re.DOTALL)
_SELECT_PREFIX_RE = re.compile(r"^SELECT\b", re.IGNORECASE)


def _validate_sql_query(query: Any) -> Optional[str]:
    """
    Validates that a candidate SQL string is a single, read-only SELECT
    statement.

    Returns:
        None if the query is safe to execute.
        A human-readable error string if the query must be blocked.
    """
    if query is None:
        return None  # No SQL argument present on this tool call — nothing to validate.

    if not isinstance(query, str):
        return "Security check failed: SQL argument must be a string."

    normalized = query.strip()
    if not normalized:
        return "Security check failed: empty SQL query is not allowed."

    # Strip leading comments so "-- SELECT\nDROP TABLE x" can't sneak past
    # the prefix check below.
    stripped = _LEADING_COMMENT_RE.sub("", normalized).strip()

    if not _SELECT_PREFIX_RE.match(stripped):
        return (
            "Security check failed: only SELECT statements are permitted. "
            "The query must start with SELECT."
        )

    # Reject stacked/chained statements (e.g. "SELECT 1; DROP TABLE x").
    # A single trailing semicolon is fine; anything after it is not.
    body = stripped[:-1] if stripped.endswith(";") else stripped
    if ";" in body:
        return (
            "Security check failed: multiple SQL statements are not permitted. "
            "Only a single SELECT statement per call is allowed."
        )

    for keyword in _FORBIDDEN_KEYWORDS:
        if re.search(rf"\b{keyword}\b", stripped, re.IGNORECASE):
            return (
                f"Security check failed: query contains forbidden keyword '{keyword}'. "
                "Only read-only SELECT statements are permitted."
            )

    lowered = stripped.lower()
    for fn in _FORBIDDEN_TABLE_FUNCTIONS:
        if fn in lowered:
            return (
                f"Security check failed: use of '{fn.rstrip('(')}(...)' is not permitted. "
                "Queries may only read from the documented analytics tables."
            )

    return None


def _extract_sql_arg(args: Dict[str, Any]) -> Optional[Any]:
    """Returns the first SQL-looking argument found in a tool call's args."""
    for key in _SQL_ARG_KEYS:
        if key in args:
            return args[key]
    return None


def _build_client() -> genai.Client:
    return genai.Client(api_key=settings.gemini_api_key)


def _build_mcp_env() -> Dict[str, str]:
    """
    Builds the environment for the mcp-clickhouse subprocess.

    Starts from the current process environment (so the `mcp-clickhouse`
    binary can be found on PATH and any ambient config is preserved), then
    overlays ClickHouse connection settings. All values are coerced to
    strings and None values are dropped, since subprocess env dicts must be
    str -> str and a stray None will raise a TypeError from the OS layer.
    """
    overrides = {
        "CLICKHOUSE_HOST": settings.clickhouse_host,
        "CLICKHOUSE_PORT": settings.clickhouse_port,
        "CLICKHOUSE_USER": settings.clickhouse_user,
        "CLICKHOUSE_PASSWORD": settings.clickhouse_password,
        "CLICKHOUSE_SECURE": "1" if settings.clickhouse_secure else "0",
        "CLICKHOUSE_DATABASE": settings.clickhouse_database,
    }
    env = dict(os.environ)
    for key, value in overrides.items():
        if value is not None:
            env[key] = str(value)
    return env


def _coerce_numeric(value: Any) -> Optional[float]:
    """Best-effort coercion of a raw ClickHouse cell value to float."""
    if value is None:
        return None
    if isinstance(value, bool):
        return None  # bools are technically numeric in Python but not meaningful here
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.replace(",", "").strip())
        except (TypeError, ValueError):
            return None
    return None


def _format_mcp_result_to_analytics(tool_name: str, args: dict, result_text: str) -> AnalyticsResult:
    """
    Heuristic fallback to extract a table/series from the JSON text returned
    by the MCP server. Defensive against the several shapes different
    ClickHouse MCP server versions may return:
      - a bare list of row dicts: [{"col": val, ...}, ...]
      - a dict wrapping the rows, e.g. {"data": [...]} or {"rows": [...]}
      - malformed/non-JSON text, missing keys, non-numeric values, etc.
    Never raises — always falls back to a raw table result on the way out.
    """
    args = args or {}
    try:
        data = json.loads(result_text)

        # Some MCP ClickHouse servers wrap rows in an envelope dict instead
        # of returning a bare list.
        if isinstance(data, dict):
            for key in ("data", "rows", "result", "results"):
                if isinstance(data.get(key), list):
                    data = data[key]
                    break

        if isinstance(data, list) and data and isinstance(data[0], dict):
            columns = list(data[0].keys())
            if not columns:
                raise ValueError("Row objects have no columns")

            label_col = columns[0]
            value_cols = columns[1:]

            series: List[ChartSeries] = []
            for col in value_cols:
                points = []
                for row in data:
                    if not isinstance(row, dict):
                        continue
                    numeric_value = _coerce_numeric(row.get(col))
                    if numeric_value is None:
                        continue
                    points.append(SeriesPoint(label=str(row.get(label_col)), value=numeric_value))
                if points:
                    series.append(ChartSeries(name=col, data=points))

            return AnalyticsResult(
                chart_type="bar",
                title=f"Result for {tool_name}",
                series=series,
                raw_rows=data,
                sql_executed=args.get("query") or args.get("sql"),
            )
    except Exception:
        logger.debug("Could not parse MCP result as structured rows for tool '%s'; falling back to raw table.", tool_name, exc_info=True)

    return AnalyticsResult(
        chart_type="table",
        title=f"Result for {tool_name}",
        raw_rows=[{"output": result_text}],
        sql_executed=args.get("query") or args.get("sql"),
    )


def _extract_text_from_mcp_content(content: Any) -> str:
    """Safely concatenates the text parts of an MCP CallToolResult.content list."""
    if not content:
        return ""
    parts = []
    for item in content:
        if getattr(item, "type", None) == "text" and getattr(item, "text", None):
            parts.append(item.text)
    return "\n".join(parts)


async def run_agent(question: str) -> Dict[str, Any]:
    """
    Main agent entry point. Runs the Gemini reasoning + MCP tool-calling loop async.
    """
    client = _build_client()
    analytics: Optional[AnalyticsResult] = None
    error: Optional[str] = None
    answer: str = ""

    server_params = StdioServerParameters(
        command="mcp-clickhouse",  # Requires mcp-clickhouse installed in the env
        args=[],
        env=_build_mcp_env(),
    )

    try:
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()

                # ── Round 1: List MCP Tools & Ask Gemini ──────────────────────
                mcp_tools_response = await session.list_tools()
                gemini_tools = get_gemini_tools_from_mcp(mcp_tools_response.tools)

                contents: List[types.Content] = [
                    types.Content(role="user", parts=[types.Part(text=question)])
                ]

                response = client.models.generate_content(
                    model=settings.gemini_model,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        tools=[gemini_tools],
                        temperature=0.1,
                    ),
                )

                if not response.candidates:
                    logger.warning("Gemini returned no candidates (possibly blocked by safety filters).")
                    return {"answer": "I couldn't generate a response to that question. Could you rephrase it?", "analytics": None, "error": "no_candidates"}

                candidate = response.candidates[0]
                candidate_parts = candidate.content.parts if candidate.content and candidate.content.parts else []

                # ── Round 2: Check for Tool Call ─────────────────────────────
                function_call_part = None
                for part in candidate_parts:
                    if getattr(part, "function_call", None):
                        function_call_part = part
                        break

                if function_call_part:
                    fc = function_call_part.function_call
                    fc_args = dict(fc.args or {})
                    logger.info("Agent calling MCP tool: %s, args=%s", fc.name, fc_args)

                    # ── Security gate: block anything that isn't a clean SELECT ──
                    sql_arg = _extract_sql_arg(fc_args)
                    security_error = _validate_sql_query(sql_arg)

                    if security_error:
                        logger.warning(
                            "Blocked unsafe tool call '%s' from agent. Reason: %s | args=%s",
                            fc.name, security_error, fc_args,
                        )
                        error = security_error
                        tool_response_payload = {"error": security_error}
                        analytics = AnalyticsResult(
                            chart_type="table",
                            title="Query blocked",
                            raw_rows=[{"output": security_error}],
                            sql_executed=str(sql_arg) if sql_arg is not None else None,
                        )
                    else:
                        try:
                            # Execute against ClickHouse MCP Server
                            mcp_result = await session.call_tool(fc.name, arguments=fc_args)
                            result_text = _extract_text_from_mcp_content(getattr(mcp_result, "content", None))

                            # Build internal analytics payload for the frontend
                            analytics = _format_mcp_result_to_analytics(fc.name, fc_args, result_text)

                            tool_response_payload = {"result": result_text}
                        except Exception as exc:
                            logger.exception("MCP tool call '%s' failed", fc.name)
                            error = str(exc)
                            tool_response_payload = {"error": error}

                    # ── Round 3: Feed Tool Result Back ───────────────────────
                    contents.append(candidate.content)
                    contents.append(
                        types.Content(
                            role="tool",
                            parts=[
                                types.Part(
                                    function_response=types.FunctionResponse(
                                        name=fc.name,
                                        response=tool_response_payload,
                                    )
                                )
                            ],
                        )
                    )

                    final_response = client.models.generate_content(
                        model=settings.gemini_model,
                        contents=contents,
                        config=types.GenerateContentConfig(
                            system_instruction=SYSTEM_PROMPT,
                            tools=[gemini_tools],
                            temperature=0.2,
                        ),
                    )
                    answer = (final_response.text or "").strip() or "Analysis complete."

                else:
                    answer = candidate_parts[0].text if candidate_parts and getattr(candidate_parts[0], "text", None) else ""

    except Exception as exc:
        logger.exception("Agent MCP error: %s", exc)
        answer = "Sorry, I encountered an error connecting to the database."
        error = str(exc)

    if analytics and analytics.raw_rows:
        analytics.insights = _generate_insights(analytics)

    return {"answer": answer, "analytics": analytics, "error": error}


def _generate_insights(analytics: AnalyticsResult) -> List[str]:
    insights: List[str] = []
    for series in analytics.series:
        if not series.data:
            continue
        try:
            max_pt = max(series.data, key=lambda p: p.value)
            min_pt = min(series.data, key=lambda p: p.value)
        except (ValueError, TypeError):
            continue
        insights.append(
            f"**{series.name}** – Peak: {max_pt.label} (${max_pt.value:,.0f}), "
            f"Low: {min_pt.label} (${min_pt.value:,.0f})"
        )
    return insights
