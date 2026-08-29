"""
app/agent/tools.py – Gemini Function Calling tool definitions.
Each tool is declared as a google.genai.types.FunctionDeclaration and grouped
into a Tool object that is passed to the model at inference time.
"""
from google import genai
from google.genai import types


# ── query_clickhouse ───────────────────────────────────────────────────────────

query_clickhouse_declaration = types.FunctionDeclaration(
    name="query_clickhouse",
    description=(
        "Execute a read-only SQL SELECT query against the ClickHouse analytics "
        "database and return the results as a JSON array of row objects. "
        "Use this tool whenever the user asks for metrics, trends, or data that "
        "requires querying the database."
    ),
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "sql": types.Schema(
                type=types.Type.STRING,
                description=(
                    "A valid ClickHouse SQL SELECT statement. "
                    "Must not contain DROP, DELETE, ALTER, INSERT, UPDATE, CREATE. "
                    "Always include a LIMIT clause (max 100 rows)."
                ),
            ),
            "chart_type": types.Schema(
                type=types.Type.STRING,
                description="Hint for frontend rendering: 'bar', 'line', 'pie', or 'table'.",
                enum=["bar", "line", "pie", "table"],
            ),
            "title": types.Schema(
                type=types.Type.STRING,
                description="Human-readable title for the resulting chart or table.",
            ),
        },
        required=["sql"],
    ),
)

# TODO: Add more tool declarations here as your hackathon scope grows,
# e.g. get_trending_topics(), compare_platforms(), forecast_revenue().

AGENT_TOOLS = types.Tool(
    function_declarations=[
        query_clickhouse_declaration,
        # TODO: append additional FunctionDeclarations here
    ]
)
