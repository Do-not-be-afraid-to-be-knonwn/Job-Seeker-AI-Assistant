import request from 'supertest';
import app from '../server';
import path from 'path';
import fs from 'fs/promises';

describe('Upload Resume', () => {
  const uploadDir = path.join(__dirname, '..', 'uploads', 'resumes');

  it('should store pdf and extracted text', async () => {
    const pdfPath = path.join(__dirname, 'fixtures', 'sample.pdf');
    const buffer = await fs.readFile(pdfPath);
    const res = await request(app)
      .post('/upload-resume')
      .set('Content-Type', 'application/pdf')
      .send(buffer);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.text).toContain('Hello resume');

    const storedPdf = path.join(uploadDir, res.body.file);
    const storedTxt = storedPdf + '.txt';
    await fs.access(storedPdf);
    await fs.access(storedTxt);
    const textContent = await fs.readFile(storedTxt, 'utf8');
    expect(textContent).toContain('Hello resume');
  });
});
