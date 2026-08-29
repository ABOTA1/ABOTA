"""
app/models/schemas.py – Pydantic models for API request/response contracts.
"""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ── Inbound ────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    """Question sent by the user to the agent."""
    question: str = Field(..., min_length=1, max_length=2000, description="Natural-language question")
    session_id: Optional[str] = Field(None, description="Optional conversation session ID")


# ── Chart data ─────────────────────────────────────────────────────────────────

class SeriesPoint(BaseModel):
    """A single data-point in a time series or bar chart."""
    label: str            # e.g. "2024-01-15" or "Avatar 2"
    value: float


class ChartSeries(BaseModel):
    """A named series containing multiple data points."""
    name: str             # e.g. "Box Office Revenue (USD)"
    data: List[SeriesPoint]


# ── Analytics result ───────────────────────────────────────────────────────────

class AnalyticsResult(BaseModel):
    """
    Structured analytics payload returned with the agent answer.
    Frontend maps these fields to chart components.
    """
    chart_type: str = Field(
        "bar",
        description="Hint for the frontend: 'bar' | 'line' | 'pie' | 'table'",
    )
    title: str = Field("", description="Chart / result title")
    series: List[ChartSeries] = Field(default_factory=list)
    raw_rows: List[Dict[str, Any]] = Field(
        default_factory=list, description="Raw query rows for table view"
    )
    sql_executed: Optional[str] = Field(None, description="SQL that produced the result")
    insights: List[str] = Field(
        default_factory=list, description="Bullet-point insights from the agent"
    )


# ── Outbound ───────────────────────────────────────────────────────────────────

class ChatResponse(BaseModel):
    """Full agent response returned to the frontend."""
    answer: str = Field(..., description="Human-readable answer from the agent")
    analytics: Optional[AnalyticsResult] = Field(
        None, description="Structured data for visualisations"
    )
    error: Optional[str] = Field(None, description="Error message if the agent failed")
