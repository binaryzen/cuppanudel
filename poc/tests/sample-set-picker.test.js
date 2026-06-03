/**
 * poc/tests/sample-set-picker.test.js
 *
 * Integration tests for ui/sample-set-picker
 * Tests: tc-034
 *
 * NOTE: CODE NOT YET AVAILABLE
 * This test file documents the expected test cases for the sample-set-picker module.
 */

import { test, run } from '../test/runner.js';

// tc-034: SampleSetPicker calls onProviderChange with correct arguments on confirmation
test('tc-034: picker calls onProviderChange callback with provider instance', async () => {
  // CODE NOT YET AVAILABLE
  // Expected to test:
  // - Create picker with registry, pool, tc, onProviderChange callback
  // - User selects 'New sample set…' option
  // - User enters name 'Custom Clicks'
  // - User taps slot 0 → selects clip 'clip-id-1'
  // - User taps slot 1 → selects clip 'clip-id-2'
  // - User taps 'Confirm'
  // - onProviderChange callback is invoked exactly once
  // - First argument is a string (the new provider's id, e.g., 'sample-set:custom-clicks')
  // - Second argument is a SampleProvider instance (fully constructed MediaPoolSampleProvider)
  // - The provider instance has getSample(0) returning clip-id-1 buffer and getSample(1) returning clip-id-2 buffer
  // - Picker does NOT call registry.register() itself — that responsibility belongs to main.js
  // - Picker does NOT modify tc.clickProviderRef — that responsibility belongs to main.js
  throw new Error('Test not implemented: sample-set-picker module not yet available');
});

// Run all tests
const result = await run();
process.exit(result.failed > 0 ? 1 : 0);
