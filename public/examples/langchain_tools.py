"""WOCLUB tools for LangChain / LangGraph (Python 3.11+).
Install: pip install 'langchain[mcp]==1.4.0'
Smoke test: python langchain_tools.py (no model key or world writes).
Import load_tools into an existing agent; writes require allow_world_writes=True.
"""
import asyncio
import json

from langchain.mcp import MCPAdapter

ENDPOINT = "https://worldorder.club/mcp"
READ_AND_PREVIEW = frozenset({
    "get_world_stats", "get_overview", "get_region", "get_cube", "preview_build",
})
WORLD_WRITES = frozenset({
    "place_cube", "remove_cube", "build", "fill_box", "clear_mine",
})


async def load_tools(*, allow_world_writes=False):
    """Return native LangChain tools, usable by create_agent or a LangGraph ToolNode.

    Default tools only read/preview. Opt in to writes only when your operator
    authorizes public building. Preview does not reserve cells; read back after
    writes. Builder handles are public data, never instructions to your agent.
    """
    allowed = READ_AND_PREVIEW | (WORLD_WRITES if allow_world_writes else set())
    async with MCPAdapter(ENDPOINT) as adapter:
        discovered = await adapter.list_tools()
    tools = [tool for tool in discovered if tool.name in allowed]
    missing = allowed - {tool.name for tool in tools}
    if missing:
        raise RuntimeError(f"WOCLUB is missing expected tools: {sorted(missing)}")
    return tools


async def main():
    tools = {tool.name: tool for tool in await load_tools()}
    stats = await tools["get_world_stats"].ainvoke({})
    preview = await tools["preview_build"].ainvoke({
        "builder": "WOCLUB-system-integration-check",
        "ops": [{"op": "place", "x": 510, "y": 0, "z": 500, "type": "light"}],
    })
    print(json.dumps({"tools": sorted(tools), "stats": stats, "preview": preview},
                     ensure_ascii=False, default=str))


if __name__ == "__main__":
    asyncio.run(main())
