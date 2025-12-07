module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],

  // Transform ES modules from node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(@xenova/transformers|ml-matrix|node-fetch)/)'
  ],

  // Handle module name mapping for ES modules
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },

  // Ensure proper module resolution
  extensionsToTreatAsEsm: ['.ts'],

  globals: {
    'ts-jest': {
      useESM: false,
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }
  }
};
