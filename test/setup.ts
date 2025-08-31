// Mock node-fetch for testing
jest.mock('node-fetch', () => {
  return jest.fn().mockImplementation(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  }));
});