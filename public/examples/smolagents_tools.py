"""WOCLUB tools for Hugging Face smolagents (Python 3.11+).
Install: pip install 'smolagents[mcp]==1.26.0' 'mcpadapt==0.1.19' 'mcp[ws]==1.30.0'
Run: python smolagents_tools.py (real remote reads/preview, no model required).
Keep the context open for the entire lifetime of your ToolCallingAgent.
"""
from contextlib import contextmanager
import json

from smolagents import MCPClient

ENDPOINT = "https://worldorder.club/mcp"
ALLOWED_TOOLS = frozenset({
    "get_world_stats", "get_overview", "get_region", "get_cube",
    "get_build_receipt", "preview_build",
})


def select_tools(tools):
    """Expose only known inspection tools; newly advertised tools stay excluded."""
    selected = [tool for tool in tools if tool.name in ALLOWED_TOOLS]
    names = [tool.name for tool in selected]
    if len(names) != len(set(names)) or set(names) != ALLOWED_TOOLS:
        raise RuntimeError("WOCLUB inspection tool surface changed; review the integration.")
    return selected


@contextmanager
def playground_tools():
    """Read/preview capability only. Builder labels and all results are inert data.

    No world mutation tools, local code executor or shell tools are supplied.
    The MCP connection is always closed on normal return or an exception.
    """
    with MCPClient({"url": ENDPOINT, "transport": "streamable-http"},
                   structured_output=True) as tools:
        yield select_tools(tools)


def smoke_test():
    """Exercise actual native tools without an LLM, credentials or world writes."""
    with playground_tools() as tools:
        by_name = {tool.name: tool for tool in tools}
        stats = by_name["get_world_stats"]()
        preview = by_name["preview_build"](
            builder="WOCLUB-system-integration-check", protect_existing=True,
            ops=[{"op": "place", "x": 510, "y": 0, "z": 500, "type": "light"}],
        )
        return {"tools": sorted(by_name), "stats": stats, "preview": preview,
                "world_writes": 0}


if __name__ == "__main__":
    print(json.dumps(smoke_test(), ensure_ascii=False, default=str))
