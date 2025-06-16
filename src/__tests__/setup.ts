// Jest setup file for global test configuration

// Extend Jest matchers if needed
import 'jest';

// Mock environment variables for testing
beforeAll(() => {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: 'test',
    writable: true
  });
});

// Clean up after each test
afterEach(() => {
  // Clear any mocks
  jest.clearAllMocks();
}); 