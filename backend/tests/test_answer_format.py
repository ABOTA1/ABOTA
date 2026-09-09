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
    assert "### Breakdown" in text
    assert "| Week Start |" in text or "| Week Start" in text
    assert "### Key Takeaways" in text
    assert text.index("### Breakdown") < text.index("### Trend Data")
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


def test_gemini_prose_is_kept_and_server_adds_table_json_takeaways():
    gemini = (
        "Based on the analysis, **Horror** has the strongest return at **5.31x** "
        "($148.7M revenue vs a $28.0M budget).\n\n"
        "### Genre Revenue vs. Budget Breakdown\n\n"
        "| Genre | Ratio |\n| --- | --- |\n| Horror | 5.31x |\n"
    )
    text = ensure_natural_language_answer(
        gemini,
        question="Which genre has the strongest revenue versus budget?",
        analytics=_mentions_analytics(),
    )
    assert "Horror" in text
    assert "5.31x" in text
    assert "### Breakdown" in text
    assert "### Key Takeaways" in text
    assert "```json" in text
    assert text.index("### Breakdown") < text.index("### Trend Data")
    assert "| Genre | Ratio |" not in text


def test_money_and_ratio_use_compact_cells():
    analytics = AnalyticsResult(
        chart_type="bar",
        title="Result for run_query",
        series=[],
        raw_rows=[
            {
                "genre": "Horror",
                "title_count": 1,
                "total_budget": 28_000_000.0,
                "total_revenue": 148_658_766.26,
                "revenue_to_budget_ratio": 5.309,
            },
            {
                "genre": "Superhero",
                "title_count": 1,
                "total_budget": 220_000_000.0,
                "total_revenue": 136_034_457.25,
                "revenue_to_budget_ratio": 0.618,
            },
        ],
    )
    text = format_briefing(
        "Which genre has the strongest revenue versus budget?",
        analytics,
    )
    assert "$148.7M" in text
    assert "$28.0M" in text
    assert "5.31x" in text
    assert "**Horror**" in text
    assert "$148,658,766.26" not in text


def test_tool_error_is_not_rewritten_as_a_table():
    text = ensure_natural_language_answer(
        None,
        question="drop everything",
        analytics=None,
        tool_error="Security check failed: DROP",
    )
    assert text.startswith("The database query could not be completed")
    assert "```json" not in text
