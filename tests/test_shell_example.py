import importlib.util
import unittest
import sys
sys.dont_write_bytecode = True
from pathlib import Path

spec = importlib.util.spec_from_file_location('build', Path(__file__).parents[1] / 'public/examples/build.py')
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class ShellExampleTests(unittest.TestCase):
    def scenario(self, commit=False, replaced=0, rejected=0, mismatch=False, allow=False):
        calls = []
        cell = {'x': 1, 'y': 0, 'z': 1, 'before': None, 'after': {'type': 'gold', 'builder': 'test'}}
        def call(path, body=None):
            calls.append((path, body))
            if path.endswith('/preview'):
                return {'summary': {'rejected': rejected, 'replaced': replaced}, 'cells': [cell]}
            if path.endswith('/batch'):
                return {'summary': {'rejected': 0}}
            return {'cube': None if mismatch else cell['after']}
        plan = {'builder': 'test', 'ops': [{'op': 'place', 'x': 1, 'y': 0, 'z': 1, 'type': 'gold'}]}
        result = build.run(plan, commit, allow, call)
        return result, calls

    def test_default_never_commits(self):
        (out, code), calls = self.scenario()
        self.assertEqual(code, 0)
        self.assertFalse(out['committed'])
        self.assertEqual(len(calls), 1)

    def test_rejected_or_replacing_plan_never_commits(self):
        for kwargs in ({'replaced': 1}, {'rejected': 1}):
            (out, code), calls = self.scenario(commit=True, **kwargs)
            self.assertEqual(code, 2)
            self.assertFalse(out['committed'])
            self.assertEqual(len(calls), 1)

    def test_commit_uses_identical_plan_and_reads_back(self):
        (out, code), calls = self.scenario(commit=True)
        self.assertEqual(code, 0)
        self.assertTrue(out['verified'])
        self.assertIs(calls[0][1], calls[1][1])
        self.assertEqual(calls[2][0], '/api/v1/cube?x=1&y=0&z=1')

    def test_mismatch_is_failure_without_retry(self):
        (out, code), calls = self.scenario(commit=True, mismatch=True)
        self.assertEqual(code, 2)
        self.assertFalse(out['verified'])
        self.assertEqual(sum(path.endswith('/batch') for path, _ in calls), 1)

    def test_replacement_requires_explicit_flag(self):
        (out, code), calls = self.scenario(commit=True, replaced=1, allow=True)
        self.assertEqual(code, 0)
        self.assertTrue(out['committed'])


if __name__ == '__main__':
    unittest.main()
