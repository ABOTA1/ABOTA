"""Natural-language agent briefing built from query rows."""
import os

os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("CLICKHOUSE_PASSWORD", "test")

from app.agent.answer_format import ensure_natural_language_answer, format_briefing
from app.models.schemas import AnalyticsResult


def _mentions_analytics() -> AnalyticsResult:
    return AnalyticsResult(
        chart_type="bar",
        title="Result for run_query",
        series=[],
        raw_rows=[
            {
                "week_start": "2023-12-31",
                "total_mentions": 661,
                "avg_sentiment_score": 0.212,
            },
            {
                "week_start": "2024-03-17",
                "total_mentions": 746,
                "avg_sentiment_score": 0.234,
            },
            {
                "week_start": "2024-03-24",
                "total_mentions": 858,
                "avg_sentiment_score": 0.206,
            },
        ],
    )


def test_briefing_has_summary_json_table_and_takeaways():
    text = format_briefing("Show the weekly social mentions trend", _mentions_analytics())
    assert text.startswith("### Weekly social mentions trend")
    assert "```json" in text
    assert '"chart_type": "line"' in text
    assert "| Week Start |" in text or "| Week Start" in text
    assert "### Key Takeaways" in text
    assert "858" in text
    assert "Query completed. Here is the raw result" not in text


def test_raw_mcp_dump_is_replaced_with_briefing():
    analytics = _mentions_analytics()
    text = ensure_natural_language_answer(
        "Query completed. Here is the raw result:\n{\"columns\": [\"week_start\"], \"rows\": []}",
        question="Show the weekly social mentions trend",
        analytics=analytics,
    )
    assert "### " in text
    assert "```json" in text
    assert "Query completed. Here is the raw result" not in text


def test_gemini_briefing_is_kept_and_json_injected_if_missing():
    gemini = (
        "### Weekly Social Mentions Trend\n\n"
        "Volume stayed steady.\n\n"
        "---\n\n"
        "| Week | Mentions |\n| --- | --- |\n| 2024-03-24 | 858 |\n\n"
        "---\n\n"
        "### Key Takeaways\n1. **Peak**: March 24."
    )
    text = ensure_natural_language_answer(
        gemini,
        question="Show the weekly social mentions trend",
        analytics=_mentions_analytics(),
    )
    assert "Volume stayed steady." in text
    assert "```json" in text
    assert "### Trend Data" in text


def test_tool_error_is_not_rewritten_as_a_table():
    text = ensure_natural_language_answer(
        None,
        question="drop everything",
        analytics=None,
        tool_error="Security check failed: DROP",
    )
    assert text.startswith("The database query could not be completed")
    assert "```json" not in text
