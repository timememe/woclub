"""Capability exclusion and connection cleanup for the optional integration."""
import importlib.util
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import patch

module = ModuleType('smolagents')
module.MCPClient = object
spec = importlib.util.spec_from_file_location('woclub_smolagents',
    Path(__file__).parents[1] / 'public/examples/smolagents_tools.py')
example = importlib.util.module_from_spec(spec)
with patch.dict(sys.modules, {'smolagents': module}):
    spec.loader.exec_module(example)


class InspectionTests(unittest.TestCase):
    def tools(self):
        return [SimpleNamespace(name=name) for name in example.ALLOWED_TOOLS]

    def test_mutations_and_unknown_tools_never_exposed(self):
        incoming = self.tools() + [SimpleNamespace(name=name) for name in
            ['build', 'fill_box', 'place_cube', 'remove_cube', 'clear_mine', 'future_tool']]
        self.assertEqual({t.name for t in example.select_tools(incoming)},
                         example.ALLOWED_TOOLS)

    def test_missing_and_duplicate_tools_fail_closed(self):
        for incoming in [self.tools()[:-1], self.tools() + self.tools()[:1]]:
            with self.assertRaises(RuntimeError):
                example.select_tools(incoming)

    def test_connection_closes_on_caller_error(self):
        closed = []
        class Client:
            def __init__(self, *args, **kwargs): pass
            def __enter__(client): return self.tools()
            def __exit__(client, *args): closed.append(True)
        with patch.object(example, 'MCPClient', Client):
            with self.assertRaisesRegex(ValueError, 'caller failure'):
                with example.playground_tools():
                    raise ValueError('caller failure')
        self.assertEqual(closed, [True])
