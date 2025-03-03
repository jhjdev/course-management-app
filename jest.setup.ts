// Set default timeout for all tests
jest.setTimeout(30000);

// Clean up after each test
afterEach(() => {
jest.clearAllMocks();
});

// Global beforeAll hook
beforeAll(() => {
// Add any global setup here
});

// Global afterAll hook
afterAll(() => {
// Add any global cleanup here
});

// Optional: Add global mocks if needed
global.console = {
...console,
// Customize logging behavior for tests
error: jest.fn(),
log: jest.fn(),
warn: jest.fn(),
info: jest.fn(),
};

