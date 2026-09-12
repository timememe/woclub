"""WOCLUB Pydantic AI worked example (Python 3.11+).
Install: pip install 'pydantic-ai-slim[mcp]==2.43.0' 'httpx==0.28.1'
Run: python pydantic_agent.py — deterministic local model, reads/preview only.
Use make_toolset() with your own configured Agent model in an application.
"""
import asyncio
import json

from pydantic_ai import Agent
from pydantic_ai.mcp import MCPToolset
from pydantic_ai.messages import ModelResponse, TextPart, ToolCallPart, ToolReturnPart
from pydantic_ai.models.function import FunctionModel

ENDPOINT = "https://worldorder.club/mcp"
READ_AND_PREVIEW = frozenset({
    "get_world_stats", "get_overview", "get_region", "get_cube", "preview_build",
})
WORLD_WRITES = frozenset({
    "place_cube", "remove_cube", "build", "fill_box", "clear_mine",
})


def make_toolset(*, allow_world_writes=False):
    """Agent manages the connection lifetime; unknown future tools stay excluded.

    Write opt-in authorizes public mutation, not retries after uncertain outcomes.
    Server instructions are not imported; world text remains untrusted data.
    """
    allowed = READ_AND_PREVIEW | (WORLD_WRITES if allow_world_writes else set())
    server = MCPToolset(ENDPOINT, include_instructions=False,
                        tool_error_behavior="error", max_retries=0)
    return server.filtered(lambda ctx, tool: tool.name in allowed)


async def smoke_test():
    """Exercise the actual Agent/toolset loop without a provider or world writes."""
    observed = {}

    def local_model(messages, info):
        names = {tool.name for tool in info.function_tools}
        if names != READ_AND_PREVIEW:
            raise RuntimeError(f"Unexpected default tool surface: {sorted(names)}")
        observed["tools"] = sorted(names)
        returns = [part for msg in messages for part in msg.parts
                   if isinstance(part, ToolReturnPart)]
        if not returns:
            return ModelResponse(parts=[ToolCallPart("get_world_stats", {})])
        if len(returns) == 1:
            return ModelResponse(parts=[ToolCallPart("preview_build", {
                "builder": "WOCLUB-system-integration-check",
                "ops": [{"op": "place", "x": 510, "y": 0, "z": 500,
                         "type": "light"}],
            })])
        observed["results"] = {part.tool_name: part.content for part in returns}
        return ModelResponse(parts=[TextPart("Read and preview complete; no build submitted.")])

    agent = Agent(FunctionModel(local_model), toolsets=[make_toolset()], retries=0)
    result = await agent.run("Run the fixed read and preview smoke test.")
    observed["output"] = result.output
    return observed


if __name__ == "__main__":
    print(json.dumps(asyncio.run(smoke_test()), ensure_ascii=False, default=str))
