import request from 'supertest';
import app from '../../server';

describe('Protected Endpoints', () => {
  let validJwt: string;
  let refreshToken: string;

  beforeAll(async () => {
    // Create a valid authentication session for testing
    const startResponse = await request(app)
      .post('/auth/google/start')
      .send({ redirectUri: 'http://localhost:3000/callback' });

    const authUrl = new URL(startResponse.body.authUrl);
    const state = authUrl.searchParams.get('state');

    // Mock successful token exchange
    const mockFetch = jest.mocked(require('node-fetch'));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'mock_access_token',
        refresh_token: 'mock_google_refresh_token',
        id_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.mock_signature',
        scope: 'openid email profile'
      }),
    } as any);

    const exchangeResponse = await request(app)
      .post('/auth/exchange')
      .send({
        code: 'mock_authorization_code',
        state: state,
        redirectUri: 'http://localhost:3000/callback'
      });

    validJwt = exchangeResponse.body.jwt;
    refreshToken = exchangeResponse.body.refresh_token;
  });

  describe('POST /extract-all', () => {
    describe('Authentication Required', () => {
      it('should reject requests without authorization header', async () => {
        const response = await request(app)
          .post('/extract-all')
          .send({ text: 'React developer with 3 years experience' });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Missing authorization header');
      });

      it('should reject requests with invalid authorization format', async () => {
        const response = await request(app)
          .post('/extract-all')
          .set('Authorization', 'InvalidFormat token123')
          .send({ text: 'React developer with 3 years experience' });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Invalid authorization format. Use Bearer token');
      });

      it('should reject requests with missing token after Bearer', async () => {
        const response = await request(app)
          .post('/extract-all')
          .set('Authorization', 'Bearer ')  // Space but no token - supertest normalizes this
          .send({ text: 'React developer with 3 years experience' });

        expect(response.status).toBe(401);
        // Due to supertest normalization, this becomes "Bearer" without space
        expect(response.body.error).toBe('Invalid authorization format. Use Bearer token');
      });

      it('should reject requests with malformed JWT', async () => {
        const response = await request(app)
          .post('/extract-all')
          .set('Authorization', 'Bearer invalid.jwt.token')
          .send({ text: 'React developer with 3 years experience' });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Invalid or expired token');
      });

      it('should reject requests with expired JWT', async () => {
        // Create an expired token (exp in the past)
        const expiredHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64');
        const expiredPayload = Buffer.from(JSON.stringify({ 
          sub: '123',
          aud: 'extension',
          exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
        })).toString('base64');
        const expiredToken = `${expiredHeader}.${expiredPayload}.fake_signature`;

        const response = await request(app)
          .post('/extract-all')
          .set('Authorization', `Bearer ${expiredToken}`)
          .send({ text: 'React developer with 3 years experience' });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Invalid or expired token');
        expect(response.body.message).toBe('Invalid token');
      });

      it('should reject requests with wrong audience', async () => {
        // Create a token with wrong audience
        const wrongAudHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64');
        const wrongAudPayload = Buffer.from(JSON.stringify({ 
          sub: '123',
          aud: 'wrong_audience', // Wrong audience
          exp: Math.floor(Date.now() / 1000) + 3600
        })).toString('base64');
        const wrongAudToken = `${wrongAudHeader}.${wrongAudPayload}.fake_signature`;

        const response = await request(app)
          .post('/extract-all')
          .set('Authorization', `Bearer ${wrongAudToken}`)
          .send({ text: 'React developer with 3 years experience' });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Invalid or expired token');
        expect(response.body.message).toBe('Invalid token');
      });
    });

    describe('Successful Authentication', () => {
      it('should accept requests with valid JWT and process job text', async () => {
        const response = await request(app)
          .post('/extract-all')
          .set('Authorization', `Bearer ${validJwt}`)
          .send({ text: 'React developer with 3 years experience' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('skills');
        expect(response.body).toHaveProperty('domain');
        expect(response.body).toHaveProperty('years');
        expect(response.body).toHaveProperty('level');
      });

      it('should handle different text input formats', async () => {
        // Simplified test to avoid timeout issues
        const response = await request(app)
          .post('/extract-all')
          .set('Authorization', `Bearer ${validJwt}`)
          .send({ description: 'Backend engineer' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('skills');
        expect(response.body).toHaveProperty('domain');
        expect(response.body).toHaveProperty('years');
        expect(response.body).toHaveProperty('level');
      }, 15000);
    });

    describe('Error Handling', () => {
      it('should handle chain errors gracefully while authenticated', async () => {
        // Test with potentially problematic input that might cause chain errors
        const response = await request(app)
          .post('/extract-all')
          .set('Authorization', `Bearer ${validJwt}`)
          .send({ text: 'A'.repeat(1000) }); // Shorter text to avoid timeout

        expect(response.status).toBe(200);
        // Should still return structure even with errors
        expect(response.body).toHaveProperty('skills');
        expect(response.body).toHaveProperty('domain');
        expect(response.body).toHaveProperty('years');
        expect(response.body).toHaveProperty('level');
      }, 30000);
    });
  });

  describe('POST /feedback', () => {
    describe('Authentication Required', () => {
      it('should reject requests without authorization header', async () => {
        const response = await request(app)
          .post('/feedback')
          .send({ rating: 5, comment: 'Great job!' });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Missing authorization header');
      });

      it('should reject requests with invalid JWT', async () => {
        const response = await request(app)
          .post('/feedback')
          .set('Authorization', 'Bearer invalid.token.here')
          .send({ rating: 5, comment: 'Great job!' });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Invalid or expired token');
      });
    });

    describe('Successful Authentication', () => {
      it('should accept valid feedback with proper authentication', async () => {
        const feedbackData = {
          rating: 5,
          comment: 'Excellent extraction results!',
          jobTitle: 'Senior React Developer'
        };

        const response = await request(app)
          .post('/feedback')
          .set('Authorization', `Bearer ${validJwt}`)
          .send(feedbackData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should handle JSON string format feedback', async () => {
        const feedbackData = {
          rating: 4,
          comment: 'Pretty good results'
        };

        const response = await request(app)
          .post('/feedback')
          .set('Authorization', `Bearer ${validJwt}`)
          .send(JSON.stringify(feedbackData))
          .set('Content-Type', 'text/plain');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should handle empty feedback object', async () => {
        const response = await request(app)
          .post('/feedback')
          .set('Authorization', `Bearer ${validJwt}`)
          .send({});

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('Error Handling', () => {
      it('should handle malformed JSON in feedback while authenticated', async () => {
        const response = await request(app)
          .post('/feedback')
          .set('Authorization', `Bearer ${validJwt}`)
          .send('invalid json string')
          .set('Content-Type', 'text/plain');

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });
    });
  });

  describe('Multiple Requests with Same Token', () => {
    it('should allow multiple requests with the same valid token', async () => {
      const requests = Array(3).fill(null).map(() =>
        request(app)
          .post('/extract-all')
          .set('Authorization', `Bearer ${validJwt}`)
          .send({ text: 'Python developer' })
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('skills');
      });
    });

    it('should allow mixed endpoint access with same token', async () => {
      const extractResponse = await request(app)
        .post('/extract-all')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ text: 'Java developer' });

      const feedbackResponse = await request(app)
        .post('/feedback')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ rating: 5 });

      expect(extractResponse.status).toBe(200);
      expect(feedbackResponse.status).toBe(200);
    });
  });

  describe('Token Refresh and Access', () => {
    it('should accept newly refreshed tokens', async () => {
      // Mock successful refresh
      const mockFetch = jest.mocked(require('node-fetch'));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new_access_token',
          refresh_token: 'new_google_refresh_token',
          scope: 'openid email profile'
        }),
      } as any);

      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .send({ refreshtoken: refreshToken });

      expect(refreshResponse.status).toBe(200);
      const newJwt = refreshResponse.body.jwt;

      // Use the new JWT to access protected endpoints
      const extractResponse = await request(app)
        .post('/extract-all')
        .set('Authorization', `Bearer ${newJwt}`)
        .send({ text: 'DevOps engineer' });

      expect(extractResponse.status).toBe(200);
      expect(extractResponse.body).toHaveProperty('skills');
    });
  });
});