"""
app/agent/gemini_client.py – Gemini agent reasoning loop.

Flow:
  1. User sends a question.
  2. Model decides to call query_clickhouse (function calling).
  3. We execute the query against ClickHouse.
  4. We feed results back to the model as a FunctionResponse.
  5. Model returns the final natural-language answer + structured data.
"""
import json
import logging
from typing import Any, Dict, List, Optional

from google import genai
from google.genai import types

from app.config import get_settings
from app.agent.prompts import SYSTEM_PROMPT
from app.agent.tools import AGENT_TOOLS
from app.db.clickhouse_client import execute_query
from app.models.schemas import AnalyticsResult, ChartSeries, SeriesPoint

logger = logging.getLogger(__name__)
settings = get_settings()


def _build_client() -> genai.Client:
    return genai.Client(api_key=settings.gemini_api_key)


def _rows_to_analytics(
    rows: List[Dict[str, Any]],
    chart_type: str = "bar",
    title: str = "",
    sql: Optional[str] = None,
) -> AnalyticsResult:
    """
    Convert raw ClickHouse row dicts into a structured AnalyticsResult.
    Heuristic: uses the first column as label, remaining numeric columns as series.
    TODO: Improve this mapping based on your real query shapes.
    """
    if not rows:
        return AnalyticsResult(chart_type=chart_type, title=title, sql_executed=sql)

    columns = list(rows[0].keys())
    label_col = columns[0]
    value_cols = columns[1:]

    series: List[ChartSeries] = []
    for col in value_cols:
        points = []
        for row in rows:
            try:
                points.append(SeriesPoint(label=str(row[label_col]), value=float(row[col])))
            except (TypeError, ValueError):
                pass  # skip non-numeric columns
        if points:
            series.append(ChartSeries(name=col, data=points))

    return AnalyticsResult(
        chart_type=chart_type,
        title=title,
        series=series,
        raw_rows=rows,
        sql_executed=sql,
    )


def run_agent(question: str) -> Dict[str, Any]:
    """
    Main agent entry point. Runs the Gemini reasoning + tool-calling loop.

    Returns:
        dict with keys: answer (str), analytics (AnalyticsResult | None), error (str | None)
    """
    client = _build_client()
    analytics: Optional[AnalyticsResult] = None
    error: Optional[str] = None

    # Build initial messages
    contents: List[types.Content] = [
        types.Content(role="user", parts=[types.Part(text=question)])
    ]

    try:
        # ── Round 1: ask the model ───────────────────────────────────────────
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                tools=[AGENT_TOOLS],
                tool_config=types.ToolConfig(
                    function_calling_config=types.FunctionCallingConfig(
                        mode=types.FunctionCallingConfigMode.AUTO
                    )
                ),
                temperature=0.1,  # low temp for deterministic SQL
            ),
        )

        candidate = response.candidates[0]

        # ── Check for function call ──────────────────────────────────────────
        function_call_part = None
        for part in candidate.content.parts:
            if part.function_call:
                function_call_part = part
                break

        if function_call_part:
            fc = function_call_part.function_call
            logger.info("Agent calling tool: %s, args=%s", fc.name, fc.args)

            if fc.name == "query_clickhouse":
                sql = fc.args.get("sql", "")
                chart_type = fc.args.get("chart_type", "bar")
                title = fc.args.get("title", "Query Result")

                try:
                    rows = execute_query(sql)
                    analytics = _rows_to_analytics(rows, chart_type, title, sql)
                    tool_result = {
                        "rows": rows,
                        "row_count": len(rows),
                        "columns": list(rows[0].keys()) if rows else [],
                    }
                    tool_error = None
                except (ValueError, RuntimeError) as exc:
                    tool_result = {}
                    tool_error = str(exc)
                    error = tool_error

                # ── Round 2: feed tool result back to model ──────────────────
                contents.append(candidate.content)  # model's function-call turn
                contents.append(
                    types.Content(
                        role="tool",
                        parts=[
                            types.Part(
                                function_response=types.FunctionResponse(
                                    name=fc.name,
                                    response={
                                        "result": tool_result,
                                        "error": tool_error,
                                    },
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
                        tools=[AGENT_TOOLS],
                        temperature=0.2,
                    ),
                )
                answer = final_response.text or "Analysis complete. See the chart below."

            else:
                # TODO: Handle additional tool names here
                answer = f"Unknown tool requested: {fc.name}"
        else:
            # No tool call – model answered directly
            answer = candidate.content.parts[0].text if candidate.content.parts else ""

    except Exception as exc:
        logger.exception("Agent error: %s", exc)
        answer = "Sorry, I encountered an error processing your request."
        error = str(exc)

    # Generate insights from analytics if available
    if analytics and analytics.raw_rows:
        analytics.insights = _generate_insights(analytics)

    return {"answer": answer, "analytics": analytics, "error": error}


def _generate_insights(analytics: AnalyticsResult) -> List[str]:
    """
    Generate simple bullet-point insights from the result set.
    TODO: Replace with a second Gemini call for richer narrative insights.
    """
    insights: List[str] = []
    for series in analytics.series:
        if not series.data:
            continue
        values = [p.value for p in series.data]
        max_pt = max(series.data, key=lambda p: p.value)
        min_pt = min(series.data, key=lambda p: p.value)
        insights.append(
            f"**{series.name}** – Peak: {max_pt.label} (${max_pt.value:,.0f}), "
            f"Low: {min_pt.label} (${min_pt.value:,.0f})"
        )
    return insights
