import fs from 'fs/promises';
import path from 'path';
import request from 'supertest';
import { beforeEach, describe, expect, test } from '@jest/globals';
import app from '../server';

process.env.NODE_ENV = 'test';

const feedbackFile = path.join(__dirname, '..', 'feedback.jsonl');

async function readEntries() {
  try {
    const data = await fs.readFile(feedbackFile, 'utf8');
    return data
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (err: any) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

beforeEach(async () => {
  await fs.rm(feedbackFile, { force: true });
});

describe('/feedback endpoint', () => {
  test('accepts JSON and raw string bodies', async () => {
    let res = await request(app).post('/feedback').send({ message: 'json body' });
    expect(res.status).toBe(200);
    let entries = await readEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe('json body');

    res = await request(app)
      .post('/feedback')
      .set('Content-Type', 'text/plain')
      .send(JSON.stringify({ message: 'raw body' }));
    expect(res.status).toBe(200);
    entries = await readEntries();
    expect(entries).toHaveLength(2);
    expect(entries[1].message).toBe('raw body');
  });

  test('returns 500 for invalid JSON', async () => {
    const res = await request(app)
      .post('/feedback')
      .set('Content-Type', 'text/plain')
      .send('{invalid json}');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
    const entries = await readEntries();
    expect(entries).toHaveLength(0);
  });
});
