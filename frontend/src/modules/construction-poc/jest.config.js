/**
 * Configuration Jest pour le module Construction POC
 * Tests unitaires avec mocks Supabase
 */

module.exports = {
  displayName: 'construction-poc',
  testEnvironment: 'node',
  roots: ['<rootDir>/services/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        module: 'commonjs',
        target: 'es2020'
      }
    }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../../../src/$1',
    '^@modules/(.*)$': '<rootDir>/../../../src/modules/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/services/__tests__/testUtils.ts'],
  collectCoverageFrom: [
    'services/**/*.ts',
    '!services/**/*.d.ts',
    '!services/**/__tests__/**',
    '!services/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 10000,
  verbose: true
};


