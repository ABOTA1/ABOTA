"""
app/agent/mcp_bridge.py – Helper for bridging MCP Tools to Gemini Declarations.
"""
from typing import Dict, Any, List
from google.genai import types
from mcp.types import Tool

def json_schema_to_gemini(schema: Dict[str, Any]) -> types.Schema:
    """Recursively converts a standard JSON Schema into a google-genai Schema."""
    t_str = schema.get("type", "string").upper()
    
    # Handle array items
    if t_str == "ARRAY" and "items" in schema:
        items = json_schema_to_gemini(schema["items"])
    else:
        items = None

    # Handle object properties
    properties = None
    if t_str == "OBJECT" and "properties" in schema:
        properties = {
            k: json_schema_to_gemini(v)
            for k, v in schema["properties"].items()
        }

    return types.Schema(
        type=getattr(types.Type, t_str, types.Type.STRING),
        description=schema.get("description", ""),
        properties=properties,
        items=items,
        required=schema.get("required") if isinstance(schema.get("required"), list) else None,
    )

def mcp_tool_to_gemini(tool: Tool) -> types.FunctionDeclaration:
    """Converts an MCP Tool definition to a Gemini FunctionDeclaration."""
    return types.FunctionDeclaration(
        name=tool.name,
        description=tool.description or "",
        parameters=json_schema_to_gemini(tool.inputSchema) if tool.inputSchema else None,
    )

def get_gemini_tools_from_mcp(mcp_tools: List[Tool]) -> types.Tool:
    """Converts a list of MCP Tools into a single google-genai Tool payload."""
    declarations = [mcp_tool_to_gemini(t) for t in mcp_tools]
    return types.Tool(function_declarations=declarations)
