import fs from 'fs/promises';
import path from 'path';
import request from 'supertest';
import { beforeEach, describe, expect, test } from '@jest/globals';
import app from '../../server';

process.env.NODE_ENV = 'test';

const feedbackFile = path.join(__dirname, '../..', 'feedback.jsonl');

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
  test('rejects requests without authentication', async () => {
    const res = await request(app).post('/feedback').send({ message: 'json body' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Missing authorization header');
    const entries = await readEntries();
    expect(entries).toHaveLength(0);
  });

  test('rejects requests with invalid authentication', async () => {
    const res = await request(app)
      .post('/feedback')
      .set('Authorization', 'Bearer invalid.token')
      .send({ message: 'json body' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired token');
    const entries = await readEntries();
    expect(entries).toHaveLength(0);
  });
});
