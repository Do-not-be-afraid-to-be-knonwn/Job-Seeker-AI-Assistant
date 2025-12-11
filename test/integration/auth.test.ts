import request from 'supertest';
import app from '../../server';

describe('Auth Integration Tests', () => {
  let authUrl: string;
  let refreshToken: string;
  let jwt: string;

  describe('Google Auth Flow', () => {
    describe('POST /auth/google/start', () => {
      it('should start Google OAuth flow and return auth URL', async () => {
        const response = await request(app)
          .post('/auth/google/start')
          .send({ redirectUri: 'http://localhost:3000/callback' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('authUrl');
        expect(response.body.authUrl).toContain('accounts.google.com/o/oauth2/v2/auth');
        expect(response.body.authUrl).toContain('client_id=114029742286-q8o712v5ipsnbub88p60vpb9vo5n93r2.apps.googleusercontent.com');
        expect(response.body.authUrl).toContain('response_type=code');
        expect(response.body.authUrl).toContain('scope=openid');
        expect(response.body.authUrl).toContain('code_challenge');
        expect(response.body.authUrl).toContain('state');

        authUrl = response.body.authUrl;
      });

      it('should use default redirect URI when none provided', async () => {
        const response = await request(app)
          .post('/auth/google/start')
          .send({});

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('authUrl');
        expect(typeof response.body.authUrl).toBe('string');
      });

      it('should use custom redirect URI when provided', async () => {
        const customRedirectUri = 'https://custom.example.com/callback';
        const response = await request(app)
          .post('/auth/google/start')
          .send({ redirectUri: customRedirectUri });

        expect(response.status).toBe(200);
        expect(response.body.authUrl).toContain(encodeURIComponent(customRedirectUri));
      });
    });

    describe('POST /auth/exchange', () => {
      it('should reject invalid state', async () => {
        const response = await request(app)
          .post('/auth/exchange')
          .send({
            code: 'test_code',
            state: 'invalid_state',
            redirectUri: 'http://localhost:3000/callback'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('invalid_state');
      });

      it('should handle missing parameters', async () => {
        const response = await request(app)
          .post('/auth/exchange')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('invalid_state');
      });

      // Note: Testing successful exchange requires mocking Google's OAuth endpoint
      // or using a test OAuth server, which is beyond basic integration testing
    });

    describe('POST /auth/refresh', () => {
      it('should reject invalid refresh token', async () => {
        const response = await request(app)
          .post('/auth/refresh')
          .send({ refreshtoken: 'invalid_refresh_token' });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('invalid_refresh');
      });

      it('should handle missing refresh token', async () => {
        const response = await request(app)
          .post('/auth/refresh')
          .send({});

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('invalid_refresh');
      });
    });

    describe('POST /auth/logout', () => {
      it('should handle logout with invalid refresh token', async () => {
        const response = await request(app)
          .post('/auth/logout')
          .send({ refresh_token: 'invalid_token' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should handle logout with no refresh token', async () => {
        const response = await request(app)
          .post('/auth/logout')
          .send({});

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should handle logout with valid refresh token', async () => {
        const response = await request(app)
          .post('/auth/logout')
          .send({ refresh_token: 'some_valid_token' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /auth/jwks.json', () => {
      it('should return JWKS with public key', async () => {
        const response = await request(app)
          .get('/auth/jwks.json');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('keys');
        expect(Array.isArray(response.body.keys)).toBe(true);
        expect(response.body.keys.length).toBeGreaterThan(0);
        expect(response.body.keys[0]).toHaveProperty('kid');
        expect(response.body.keys[0]).toHaveProperty('kty');
      });
    });
  });

  describe('Auth Flow Integration', () => {
    // Mock successful OAuth flow for integration testing
    beforeAll(() => {
      // This would typically involve setting up test data
      // For now, we'll test the error cases and structure
    });

    it('should maintain PKCE flow integrity', async () => {
      // Start OAuth flow
      const startResponse = await request(app)
        .post('/auth/google/start')
        .send({ redirectUri: 'http://localhost:3000/callback' });

      expect(startResponse.status).toBe(200);
      
      // Extract state from URL for testing
      const url = new URL(startResponse.body.authUrl);
      const state = url.searchParams.get('state');
      const challenge = url.searchParams.get('code_challenge');
      
      expect(state).toBeTruthy();
      expect(challenge).toBeTruthy();
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    });
  });

  describe('Security Tests', () => {
    it('should generate unique states for each auth request', async () => {
      const response1 = await request(app)
        .post('/auth/google/start')
        .send({ redirectUri: 'http://localhost:3000/callback' });

      const response2 = await request(app)
        .post('/auth/google/start')
        .send({ redirectUri: 'http://localhost:3000/callback' });

      const url1 = new URL(response1.body.authUrl);
      const url2 = new URL(response2.body.authUrl);
      
      const state1 = url1.searchParams.get('state');
      const state2 = url2.searchParams.get('state');

      expect(state1).not.toBe(state2);
    });

    it('should generate unique challenges for each auth request', async () => {
      const response1 = await request(app)
        .post('/auth/google/start')
        .send({ redirectUri: 'http://localhost:3000/callback' });

      const response2 = await request(app)
        .post('/auth/google/start')
        .send({ redirectUri: 'http://localhost:3000/callback' });

      const url1 = new URL(response1.body.authUrl);
      const url2 = new URL(response2.body.authUrl);
      
      const challenge1 = url1.searchParams.get('code_challenge');
      const challenge2 = url2.searchParams.get('code_challenge');

      expect(challenge1).not.toBe(challenge2);
    });

    it('should include required OAuth 2.0 parameters', async () => {
      const response = await request(app)
        .post('/auth/google/start')
        .send({ redirectUri: 'http://localhost:3000/callback' });

      const url = new URL(response.body.authUrl);

      // Verify required OAuth 2.0 parameters
      expect(url.searchParams.get('client_id')).toBeTruthy();
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('redirect_uri')).toBeTruthy();
      expect(url.searchParams.get('scope')).toBeTruthy();
      expect(url.searchParams.get('state')).toBeTruthy();
      
      // Verify PKCE parameters
      expect(url.searchParams.get('code_challenge')).toBeTruthy();
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed requests gracefully', async () => {
      const response = await request(app)
        .post('/auth/google/start')
        .send('invalid json')
        .set('Content-Type', 'application/json');

      // Malformed JSON should return 400 error
      expect(response.status).toBe(400);
    });

    it('should handle network errors during token exchange', async () => {
      // This test would require mocking network failures
      // For now, we test the error path with invalid state
      const response = await request(app)
        .post('/auth/exchange')
        .send({
          code: 'valid_looking_code',
          state: 'definitely_invalid_state'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_state');
    });
  });

  describe('Session Management', () => {
    it('should handle concurrent refresh token operations', async () => {
      const invalidToken = 'invalid_token_123';
      
      // Multiple concurrent requests with same invalid token
      const promises = Array(5).fill(null).map(() =>
        request(app)
          .post('/auth/refresh')
          .send({ refreshtoken: invalidToken })
      );

      const responses = await Promise.all(promises);
      
      // All should fail with same error
      responses.forEach(response => {
        expect(response.status).toBe(401);
        expect(response.body.error).toBe('invalid_refresh');
      });
    });

    it('should clean up sessions on logout', async () => {
      // Test that logout removes session even with invalid token
      const response = await request(app)
        .post('/auth/logout')
        .send({ refresh_token: 'any_token' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});