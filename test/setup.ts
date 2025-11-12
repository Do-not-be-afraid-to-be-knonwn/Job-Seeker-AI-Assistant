// Mock node-fetch for testing
jest.mock('node-fetch', () => {
  return jest.fn().mockImplementation(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  }));
});

// Mock @xenova/transformers for tests that import it indirectly
jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn().mockResolvedValue({
    // Mock embedding function
    __call: jest.fn().mockResolvedValue({
      data: new Float32Array(384) // Mock embedding vector
    })
  }),
  env: {
    backends: {
      onnx: {
        wasm: {
          numThreads: 1
        }
      }
    }
  }
}));