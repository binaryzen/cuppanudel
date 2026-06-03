/**
 * poc/tests/workspace.test.js
 *
 * Integration tests for config/workspace
 * Tests: tc-019, tc-020, tc-021, tc-022
 *
 * NOTE: CODE NOT YET AVAILABLE
 * This test file documents the expected test cases for the workspace module.
 * Implementation will proceed in lane-c after lane-a and lane-b complete.
 */

import { test, run } from '../test/runner.js';
import { importWorkspace, exportWorkspace } from '../config/workspace.js';

// Mock jsyaml
const mockJsyaml = {
  load: (text, opts) => {
    // Simple mock: just try JSON.parse for now
    try {
      return JSON.parse(text);
    } catch (e) {
      // If not JSON, try basic YAML parsing
      return { error: text };
    }
  },
  dump: (obj) => {
    return JSON.stringify(obj, null, 2);
  },
  CORE_SCHEMA: {},
};

// Mock document for UI functions
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: (tag) => ({
      style: { cssText: '' },
      textContent: '',
      onclick: null,
      appendChild: () => {},
      remove: () => {},
    }),
    body: { appendChild: () => {} },
  };
}

// tc-019: importWorkspace orchestrates validation and component importConfig in dependency order
test('tc-019: importWorkspace orchestrates component imports in order', async () => {
  let importOrder = [];

  const components = {
    sampleSets: {
      importConfig: (obj) => {
        importOrder.push('sampleSets');
        return [];
      },
      exportConfig: () => ({ samples: [] }),
    },
    global: {
      importConfig: (obj) => {
        importOrder.push('global');
        return [];
      },
      exportConfig: () => ({}),
    },
    metronome: {
      importConfig: (obj) => {
        importOrder.push('metronome');
        return [];
      },
      exportConfig: () => ({}),
    },
    presets: {
      importConfig: (obj) => {
        importOrder.push('presets');
        return [];
      },
      exportConfig: () => ({ presets: [] }),
    },
  };

  const yaml = '{"version":1,"sampleSets":{},"global":{},"metronome":{},"presets":{}}';
  const result = await importWorkspace(yaml, 'test.yaml', 100, components, mockJsyaml);

  // Should import in order: sampleSets → global → metronome → presets
  if (importOrder[0] !== 'sampleSets') throw new Error('Expected sampleSets first');
  if (importOrder[1] !== 'global') throw new Error('Expected global second');
  if (importOrder[2] !== 'metronome') throw new Error('Expected metronome third');
  if (importOrder[3] !== 'presets') throw new Error('Expected presets fourth');
});

// tc-020: importWorkspace enforces 1 MB file size cap
test('tc-020: importWorkspace enforces 1MB file size cap', async () => {
  const components = {
    sampleSets: { importConfig: () => [], exportConfig: () => ({}) },
    global: { importConfig: () => [], exportConfig: () => ({}) },
    metronome: { importConfig: () => [], exportConfig: () => ({}) },
    presets: { importConfig: () => [], exportConfig: () => ({}) },
  };

  const yaml = 'x';
  const largeSize = 1_048_576 + 1; // Just over 1MB
  const result = await importWorkspace(yaml, 'test.yaml', largeSize, components, mockJsyaml);

  // Should reject and return false
  if (result !== false) throw new Error('Expected false for oversized file');
});

// tc-021: importWorkspace parses JSON when filename ends in .json, else YAML
test('tc-021: importWorkspace selects parser by filename', async () => {
  const components = {
    sampleSets: { importConfig: () => [], exportConfig: () => ({}) },
    global: { importConfig: () => [], exportConfig: () => ({}) },
    metronome: { importConfig: () => [], exportConfig: () => ({}) },
    presets: { importConfig: () => [], exportConfig: () => ({}) },
  };

  // JSON file test
  const jsonText = '{"version":1,"sampleSets":{},"global":{},"metronome":{},"presets":{}}';
  const resultJson = await importWorkspace(jsonText, 'test.json', 100, components, mockJsyaml);

  // Should parse as JSON
  if (resultJson === false) throw new Error('Expected JSON file to parse successfully');

  // YAML file test (by filename check)
  const yamlText = '{"version":1,"sampleSets":{},"global":{},"metronome":{},"presets":{}}';
  const resultYaml = await importWorkspace(yamlText, 'test.yaml', 100, components, mockJsyaml);

  // Should parse as YAML
  if (resultYaml === false) throw new Error('Expected YAML file to parse successfully');
});

// tc-022: exportWorkspace calls each component.exportConfig() and assembles YAML
test('tc-022: exportWorkspace assembles component configs into YAML', async () => {
  let exportCalls = [];

  const components = {
    global: {
      exportConfig: () => {
        exportCalls.push('global');
        return { someGlobal: true };
      },
    },
    metronome: {
      exportConfig: () => {
        exportCalls.push('metronome');
        return { bpm: 120 };
      },
    },
    sampleSets: {
      exportConfig: () => {
        exportCalls.push('sampleSets');
        return { sets: [] };
      },
    },
    presets: {
      exportConfig: () => {
        exportCalls.push('presets');
        return { presets: [] };
      },
    },
  };

  const yaml = exportWorkspace(components, mockJsyaml);

  // Check that exportConfig was called for each component
  if (!exportCalls.includes('global')) throw new Error('Expected global.exportConfig() to be called');
  if (!exportCalls.includes('metronome')) throw new Error('Expected metronome.exportConfig() to be called');
  if (!exportCalls.includes('sampleSets')) throw new Error('Expected sampleSets.exportConfig() to be called');
  if (!exportCalls.includes('presets')) throw new Error('Expected presets.exportConfig() to be called');

  // Check that output contains version and all sections
  if (!yaml.includes('version')) throw new Error('Expected YAML to contain version');
  if (!yaml.includes('global')) throw new Error('Expected YAML to contain global section');
  if (!yaml.includes('metronome')) throw new Error('Expected YAML to contain metronome section');
  if (!yaml.includes('sampleSets')) throw new Error('Expected YAML to contain sampleSets section');
  if (!yaml.includes('presets')) throw new Error('Expected YAML to contain presets section');
});

// Run all tests
const result = await run();
process.exit(result.failed > 0 ? 1 : 0);
