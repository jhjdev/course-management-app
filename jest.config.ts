import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
preset: 'ts-jest',
testEnvironment: 'node',
roots: ['<rootDir>/__tests__'],
testMatch: ['**/*.test.ts'],
transform: {
    '^.+\\.tsx?$': 'ts-jest'
},
moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/app/$1'
},
testPathIgnorePatterns: ['/node_modules/', '/dist/'],
collectCoverage: true,
collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    '!app/**/*.d.ts',
    '!app/types/**/*'
],
coverageThreshold: {
    global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
    }
},
verbose: true,
setupFilesAfterEnv: ['./jest.setup.ts']
};

export default config;
