module.exports = {
  preset: '@vue/cli-plugin-unit-jest/presets/typescript-and-babel',
  transform: {
    '^.+\\.vue$': '@vue/vue3-jest',
    '^.+\\.tsx?$': 'ts-jest'
  },
  testMatch: [
    '**/__tests__/**/*.spec.[jt]s?(x)',
    '**/*.spec.[jt]s?(x)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testEnvironment: 'jsdom',
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'src/**/*.{js,ts,vue}',
    '!src/main.ts',
    '!src/router/index.ts',
    '!**/node_modules/**'
  ],
  coverageReporters: ['text', 'lcov'],
  transformIgnorePatterns: [
    '/node_modules/(?!(@firebase|firebase)/)'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tests/tsconfig.json'
    }
  }
};