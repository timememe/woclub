// Workerd entry points must not expose the pure constants used by Node tests.
export { default, WorldCoordinator } from './worker.js';
