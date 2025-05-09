/* eslint-env jest */
// Import global test setup
import '@testing-library/jest-dom';

// Define global mocks for Firebase
jest.mock('@/firebase/config', () => ({
  auth: {},
  db: {},
  functions: () => ({}),
  storage: () => ({})
}));

// Mock for Pinia
jest.mock('pinia', () => {
  return {
    defineStore: jest.fn().mockImplementation(() => () => ({})),
    createPinia: jest.fn().mockImplementation(() => ({}))
  };
});

// Mock createTestingPinia for tests
jest.mock('@pinia/testing', () => ({
  createTestingPinia: jest.fn().mockImplementation(() => ({
    use: jest.fn().mockReturnThis()
  }))
}));

// Setup global variables
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));