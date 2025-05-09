// Type definitions for Jest globals
declare global {
  // Jest test functions
  function describe(name: string, fn: () => void): void;
  function it(name: string, fn: () => void): void;
  function expect(actual: any): any;
  
  // Jest mocking utilities
  namespace jest {
    function fn(): any;
  }
}

export {};