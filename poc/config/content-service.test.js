import { run, assert } from '../test/runner.js';
import { contentService } from './content-service.js';

run('config/content-service', (test) => {
  // Helper to reset state between tests
  const reset = () => {
    contentService.providers.forEach(p => contentService.unregister(p.id));
  };

  const mockProvider = (id, label = 'Mock') => ({
    id,
    label,
    browse: () => Promise.resolve([]),
    import: () => Promise.resolve({}),
  });

  test('contentService.providers is an empty array at module import time', () => {
    reset();
    assert(Array.isArray(contentService.providers), 'providers should be an array');
    assert(contentService.providers.length === 0, 'providers should be empty at start');
  });

  test('register adds a provider and increases providers.length', () => {
    reset();
    const p1 = mockProvider('local-files', 'My Files');
    contentService.register(p1);
    assert(contentService.providers.length === 1, 'length should be 1 after first register');
    assert(contentService.providers[0].id === 'local-files', 'registered id should match');
  });

  test('contentService.providers returns a new array each access', () => {
    reset();
    const p1 = mockProvider('p1');
    contentService.register(p1);
    const arr1 = contentService.providers;
    const arr2 = contentService.providers;
    assert(arr1 !== arr2, 'each .providers access should return a new array instance');
    assert(arr1.length === arr2.length, 'but with the same content');
  });

  test('mutating returned array does not affect internal state', () => {
    reset();
    const p1 = mockProvider('p1');
    contentService.register(p1);
    const arr = contentService.providers;
    arr.splice(0, 1);  // Remove from returned array
    assert(contentService.providers.length === 1, 'internal registry should be unaffected');
  });

  test('register with two providers increases length to 2', () => {
    reset();
    const p1 = mockProvider('p1');
    const p2 = mockProvider('p2');
    contentService.register(p1);
    contentService.register(p2);
    assert(contentService.providers.length === 2, 'length should be 2');
  });

  test('unregister removes a provider', () => {
    reset();
    const p1 = mockProvider('local-files');
    contentService.register(p1);
    assert(contentService.providers.length === 1, 'setup: length is 1');
    contentService.unregister('local-files');
    assert(contentService.providers.length === 0, 'length should return to 0');
  });

  test('unregister with nonexistent id is a no-op', () => {
    reset();
    assert(() => contentService.unregister('nonexistent'), 'no error thrown');
  });

  test('register with duplicate id throws TypeError', () => {
    reset();
    const p1 = mockProvider('dup');
    contentService.register(p1);
    const p2 = mockProvider('dup');
    let error = null;
    try {
      contentService.register(p2);
    } catch (e) {
      error = e;
    }
    assert(error instanceof TypeError, 'should throw TypeError');
    assert(error.message.includes('already registered'), 'message should mention duplicate');
  });

  test('register without id throws TypeError', () => {
    reset();
    const bad = { label: 'No ID' };
    let error = null;
    try {
      contentService.register(bad);
    } catch (e) {
      error = e;
    }
    assert(error instanceof TypeError, 'should throw TypeError');
    assert(error.message.includes('must have an id'), 'message should mention missing id');
  });

  test('register with non-object throws TypeError', () => {
    reset();
    let error = null;
    try {
      contentService.register(null);
    } catch (e) {
      error = e;
    }
    assert(error instanceof TypeError, 'should throw TypeError for null');
  });
});
