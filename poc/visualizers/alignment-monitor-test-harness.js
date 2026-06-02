import { run, _reset } from '../test/runner.js';
import './alignment-monitor.test.js';

// Run all tests
const result = await run();

// Exit with appropriate code
process.exit(result.failed > 0 ? 1 : 0);
