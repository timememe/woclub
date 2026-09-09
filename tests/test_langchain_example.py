"""Exercise tool exposure policy without requiring optional framework packages."""
import importlib.util
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import patch


class FakeAdapter:
    names = []

    def __init__(self, endpoint):
        assert endpoint == 'https://worldorder.club/mcp'

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        pass

    async def list_tools(self):
        return [SimpleNamespace(name=name) for name in self.names]


fake = ModuleType('langchain.mcp')
fake.MCPAdapter = FakeAdapter
spec = importlib.util.spec_from_file_location('woclub_langchain',
    Path(__file__).parents[1] / 'public/examples/langchain_tools.py')
example = importlib.util.module_from_spec(spec)
with patch.dict(sys.modules, {'langchain': ModuleType('langchain'), 'langchain.mcp': fake}):
    spec.loader.exec_module(example)


class ExposureTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        FakeAdapter.names = list(example.READ_AND_PREVIEW | example.WORLD_WRITES) + ['future_tool']

    async def test_default_never_exposes_writes_or_future_tools(self):
        self.assertEqual({t.name for t in await example.load_tools()}, example.READ_AND_PREVIEW)

    async def test_explicit_opt_in_exposes_only_known_write_tools(self):
        self.assertEqual({t.name for t in await example.load_tools(allow_world_writes=True)},
                         example.READ_AND_PREVIEW | example.WORLD_WRITES)

    async def test_missing_tool_fails_clearly(self):
        FakeAdapter.names.remove('preview_build')
        with self.assertRaisesRegex(RuntimeError, 'preview_build'):
            await example.load_tools()
