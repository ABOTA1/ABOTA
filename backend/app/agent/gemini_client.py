"""
app/agent/gemini_client.py – Gemini agent reasoning loop powered by MCP.

This client uses the Model Context Protocol (mcp) to discover tools dynamically
from the `mcp-clickhouse` server, passes them to Gemini, and executes them over stdio.
"""
import os
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


def _build_client() -> genai.Client:
    return genai.Client(api_key=settings.gemini_api_key)


def _format_mcp_result_to_analytics(tool_name: str, args: dict, result_text: str) -> AnalyticsResult:
    """
    Fallback heurístico para extraer tabla/series del texto JSON devuelto por MCP.
    """
    try:
        data = json.loads(result_text)
        if isinstance(data, list) and data:
            # We got raw rows back
            columns = list(data[0].keys())
            label_col = columns[0]
            value_cols = columns[1:]
            
            series: List[ChartSeries] = []
            for col in value_cols:
                points = []
                for row in data:
                    try:
                        points.append(SeriesPoint(label=str(row[label_col]), value=float(row[col])))
                    except (TypeError, ValueError):
                        pass
                if points:
                    series.append(ChartSeries(name=col, data=points))

            return AnalyticsResult(
                chart_type="bar",
                title=f"Result for {tool_name}",
                series=series,
                raw_rows=data,
                sql_executed=args.get("query") or args.get("sql")
            )
    except Exception:
        pass

    return AnalyticsResult(
        chart_type="table", 
        title=f"Result for {tool_name}", 
        raw_rows=[{"output": result_text}]
    )


async def run_agent(question: str) -> Dict[str, Any]:
    """
    Main agent entry point. Runs the Gemini reasoning + MCP tool-calling loop async.
    """
    client = _build_client()
    analytics: Optional[AnalyticsResult] = None
    error: Optional[str] = None
    answer: str = ""

    server_params = StdioServerParameters(
        command="mcp-clickhouse", # Requires mcp-clickhouse installed in the env
        args=[],
        env={
            **os.environ, # Pass PATH so the binary is found
            "CLICKHOUSE_HOST": settings.clickhouse_host,
            "CLICKHOUSE_PORT": str(settings.clickhouse_port),
            "CLICKHOUSE_USER": settings.clickhouse_user,
            "CLICKHOUSE_PASSWORD": settings.clickhouse_password,
            "CLICKHOUSE_SECURE": "1" if settings.clickhouse_secure else "0",
            "CLICKHOUSE_DATABASE": settings.clickhouse_database,
        }
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
                candidate = response.candidates[0]

                # ── Round 2: Check for Tool Call ─────────────────────────────
                function_call_part = None
                for part in candidate.content.parts:
                    if part.function_call:
                        function_call_part = part
                        break

                if function_call_part:
                    fc = function_call_part.function_call
                    logger.info("Agent calling MCP tool: %s, args=%s", fc.name, fc.args)

                    try:
                        # Execute against ClickHouse MCP Server
                        mcp_result = await session.call_tool(fc.name, arguments=fc.args or {})
                        
                        # MCP returns a list of text/image content items
                        result_text = "\n".join(
                            [item.text for item in mcp_result.content if item.type == "text"]
                        )
                        
                        # Build internal analytics payload for the frontend
                        analytics = _format_mcp_result_to_analytics(fc.name, fc.args, result_text)
                        
                        tool_response_payload = {"result": result_text}
                    except Exception as exc:
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
                    answer = final_response.text or "Analysis complete."

                else:
                    answer = candidate.content.parts[0].text if candidate.content.parts else ""

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
        values = [p.value for p in series.data]
        max_pt = max(series.data, key=lambda p: p.value)
        min_pt = min(series.data, key=lambda p: p.value)
        insights.append(
            f"**{series.name}** – Peak: {max_pt.label} (${max_pt.value:,.0f}), "
            f"Low: {min_pt.label} (${min_pt.value:,.0f})"
        )
    return insights
