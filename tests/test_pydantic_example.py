"""Tool exposure boundaries without installing the optional framework."""
import importlib.util
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import patch


class FakeToolset:
    def __init__(self, endpoint, **options):
        self.endpoint, self.options = endpoint, options

    def filtered(self, predicate):
        self.predicate = predicate
        return self


modules = {name: ModuleType(name) for name in [
    'pydantic_ai', 'pydantic_ai.mcp', 'pydantic_ai.messages',
    'pydantic_ai.models', 'pydantic_ai.models.function',
]}
modules['pydantic_ai'].Agent = object
modules['pydantic_ai.mcp'].MCPToolset = FakeToolset
modules['pydantic_ai.models.function'].FunctionModel = object
for name in ['ModelResponse', 'TextPart', 'ToolCallPart', 'ToolReturnPart']:
    setattr(modules['pydantic_ai.messages'], name, object)
spec = importlib.util.spec_from_file_location('woclub_pydantic',
    Path(__file__).parents[1] / 'public/examples/pydantic_agent.py')
example = importlib.util.module_from_spec(spec)
with patch.dict(sys.modules, modules):
    spec.loader.exec_module(example)


class ExposureTests(unittest.TestCase):
    def exposed(self, toolset):
        names = example.READ_AND_PREVIEW | example.WORLD_WRITES | {'future_tool'}
        return {name for name in names if toolset.predicate(None, SimpleNamespace(name=name))}

    def test_defaults_exclude_writes_and_future_tools(self):
        self.assertEqual(self.exposed(example.make_toolset()), example.READ_AND_PREVIEW)

    def test_opt_in_adds_only_known_writes(self):
        self.assertEqual(self.exposed(example.make_toolset(allow_world_writes=True)),
                         example.READ_AND_PREVIEW | example.WORLD_WRITES)

    def test_errors_propagate_without_retry_or_instruction_import(self):
        toolset = example.make_toolset(allow_world_writes=True)
        self.assertEqual(toolset.endpoint, 'https://worldorder.club/mcp')
        self.assertEqual(toolset.options, dict(include_instructions=False,
                         tool_error_behavior='error', max_retries=0))
