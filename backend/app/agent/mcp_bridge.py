"""
app/agent/mcp_bridge.py – Helper for bridging MCP Tools to Gemini Declarations.
"""
import logging
from typing import Any, Dict, List, Optional

from google.genai import types
from mcp.types import Tool

logger = logging.getLogger(__name__)


def _resolve_json_type(schema: Dict[str, Any]) -> str:
    """
    Resolves a JSON Schema 'type' field to a single uppercase type string
    accepted by google-genai's types.Type enum.

    Handles the common real-world variations we see from MCP servers:
      - missing 'type' (defaults to STRING so we never crash)
      - 'type' as a list, e.g. ["string", "null"] (picks the first non-null type)
      - lowercase / unexpected casing
    """
    raw_type = schema.get("type", "string")

    if isinstance(raw_type, list):
        non_null = [t for t in raw_type if isinstance(t, str) and t.lower() != "null"]
        raw_type = non_null[0] if non_null else "string"

    if not isinstance(raw_type, str):
        raw_type = "string"

    return raw_type.upper()


def json_schema_to_gemini(schema: Optional[Dict[str, Any]]) -> types.Schema:
    """
    Recursively converts a standard JSON Schema into a google-genai Schema.

    Defensive by design: MCP servers are third-party processes and their
    inputSchema shapes can vary (missing fields, unexpected nesting, enums,
    unions). This function must never raise on a merely "unusual" schema —
    worst case it should degrade to a permissive STRING field rather than
    crash the whole tool-declaration pipeline.
    """
    if not isinstance(schema, dict):
        return types.Schema(type=types.Type.STRING)

    t_str = _resolve_json_type(schema)
    gemini_type = getattr(types.Type, t_str, types.Type.STRING)

    # Handle array items — Gemini requires an `items` schema for ARRAY types,
    # so fall back to a permissive string item if the source schema omits it.
    items = None
    if gemini_type == types.Type.ARRAY:
        items_schema = schema.get("items")
        items = json_schema_to_gemini(items_schema) if items_schema else types.Schema(type=types.Type.STRING)

    # Handle object properties
    properties = None
    if gemini_type == types.Type.OBJECT and isinstance(schema.get("properties"), dict):
        properties = {
            k: json_schema_to_gemini(v)
            for k, v in schema["properties"].items()
            if isinstance(v, dict)
        }
        if not properties:
            properties = None

    # Handle enums (only meaningful for STRING-typed fields in the Gemini schema)
    enum_values = None
    raw_enum = schema.get("enum")
    if isinstance(raw_enum, list) and raw_enum:
        enum_values = [str(v) for v in raw_enum]

    required = schema.get("required") if isinstance(schema.get("required"), list) else None

    try:
        return types.Schema(
            type=gemini_type,
            description=schema.get("description", "") or "",
            properties=properties,
            items=items,
            required=required,
            enum=enum_values,
        )
    except Exception:
        # Last-resort fallback: never let a single malformed field definition
        # take down tool discovery for the entire session.
        logger.exception("Failed to build Gemini Schema from JSON schema %r; falling back to STRING", schema)
        return types.Schema(type=types.Type.STRING, description=schema.get("description", "") or "")


def mcp_tool_to_gemini(tool: Tool) -> types.FunctionDeclaration:
    """Converts an MCP Tool definition to a Gemini FunctionDeclaration."""
    parameters = None
    if getattr(tool, "inputSchema", None):
        try:
            parameters = json_schema_to_gemini(tool.inputSchema)
        except Exception:
            logger.exception("Failed to convert inputSchema for MCP tool '%s'; sending no parameters", tool.name)
            parameters = None

    return types.FunctionDeclaration(
        name=tool.name,
        description=tool.description or "",
        parameters=parameters,
    )


def get_gemini_tools_from_mcp(mcp_tools: List[Tool]) -> types.Tool:
    """Converts a list of MCP Tools into a single google-genai Tool payload."""
    declarations = []
    for t in mcp_tools or []:
        try:
            declarations.append(mcp_tool_to_gemini(t))
        except Exception:
            logger.exception("Skipping MCP tool that failed to convert: %r", getattr(t, "name", t))
    return types.Tool(function_declarations=declarations)