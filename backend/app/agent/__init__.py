"""
app/agent – Paquete del agente conversacional de ABOTA.

Expone el punto de entrada principal del agente para que pueda importarse
de forma limpia desde otras capas de la aplicación, por ejemplo:

    from app.agent import run_agent

Mantener este __init__ delgado a propósito: solo reexporta símbolos
públicos estables. La lógica de negocio vive en los submódulos
(gemini_client, mcp_bridge, prompts).
"""
from app.agent.gemini_client import run_agent

__all__ = ["run_agent"]
