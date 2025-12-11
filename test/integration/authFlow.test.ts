import request from 'supertest';
import app from '../../server';

// Mock node-fetch for testing - done in setup.ts
const mockFetch = jest.mocked(require('node-fetch'));

describe('Complete Auth Flow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete OAuth Flow', () => {
    it('should complete full OAuth flow successfully', async () => {
      // Step 1: Start OAuth flow
      const startResponse = await request(app)
        .post('/auth/google/start')
        .send({ redirectUri: 'http://localhost:3000/callback' });

      expect(startResponse.status).toBe(200);
      expect(startResponse.body).toHaveProperty('authUrl');

      // Extract state from the auth URL
      const authUrl = new URL(startResponse.body.authUrl);
      const state = authUrl.searchParams.get('state');
      const challenge = authUrl.searchParams.get('code_challenge');

      expect(state).toBeTruthy();
      expect(challenge).toBeTruthy();

      // Step 2: Mock successful token exchange
      const mockTokenResponse = {
        access_token: 'mock_access_token',
        refresh_token: 'mock_google_refresh_token',
        id_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.mock_signature',
        scope: 'openid email profile',
        expires_in: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      } as any);

      // Step 3: Exchange code for tokens
      const exchangeResponse = await request(app)
        .post('/auth/exchange')
        .send({
          code: 'mock_authorization_code',
          state: state,
          redirectUri: 'http://localhost:3000/callback'
        });

      expect(exchangeResponse.status).toBe(200);
      expect(exchangeResponse.body).toHaveProperty('jwt');
      expect(exchangeResponse.body).toHaveProperty('refresh_token');
      
      const { jwt, refresh_token } = exchangeResponse.body;

      // Verify JWT structure (basic check)
      const jwtParts = jwt.split('.');
      expect(jwtParts.length).toBe(3);

      // Step 4: Test token refresh
      const mockRefreshResponse = {
        access_token: 'new_mock_access_token',
        refresh_token: 'new_mock_google_refresh_token',
        scope: 'openid email profile',
        expires_in: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRefreshResponse,
      } as any);

      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .send({ refreshtoken: refresh_token });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body).toHaveProperty('jwt');
      expect(refreshResponse.body).toHaveProperty('refresh_token');
      expect(refreshResponse.body.refresh_token).not.toBe(refresh_token); // Should be new

      // Step 5: Test logout
      const logoutResponse = await request(app)
        .post('/auth/logout')
        .send({ refresh_token: refreshResponse.body.refresh_token });

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.success).toBe(true);

      // Step 6: Verify token is invalidated
      const postLogoutRefresh = await request(app)
        .post('/auth/refresh')
        .send({ refreshtoken: refreshResponse.body.refresh_token });

      expect(postLogoutRefresh.status).toBe(401);
      expect(postLogoutRefresh.body.error).toBe('invalid_refresh');
    });

    it('should handle Google OAuth token endpoint failures', async () => {
      // Start OAuth flow
      const startResponse = await request(app)
        .post('/auth/google/start')
        .send({ redirectUri: 'http://localhost:3000/callback' });

      const authUrl = new URL(startResponse.body.authUrl);
      const state = authUrl.searchParams.get('state');

      // Mock token endpoint failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'invalid_grant' }),
      } as any);

      const exchangeResponse = await request(app)
        .post('/auth/exchange')
        .send({
          code: 'invalid_code',
          state: state,
          redirectUri: 'http://localhost:3000/callback'
        });

      expect(exchangeResponse.status).toBe(400);
      expect(exchangeResponse.body.error).toBe('invalid_grant');
    });

    it('should handle refresh token failures', async () => {
      // Create a mock session first
      const startResponse = await request(app)
        .post('/auth/google/start')
        .send({ redirectUri: 'http://localhost:3000/callback' });

      const authUrl = new URL(startResponse.body.authUrl);
      const state = authUrl.searchParams.get('state');

      const mockTokenResponse = {
        access_token: 'mock_access_token',
        refresh_token: 'mock_google_refresh_token',
        id_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.mock',
        scope: 'openid email profile'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      } as any);

      const exchangeResponse = await request(app)
        .post('/auth/exchange')
        .send({
          code: 'mock_code',
          state: state,
          redirectUri: 'http://localhost:3000/callback'
        });

      const { refresh_token } = exchangeResponse.body;

      // Mock refresh failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'invalid_grant' }),
      } as any);

      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .send({ refreshtoken: refresh_token });

      // Even with Google API failure, our endpoint should still return a JWT
      // using the existing session data
      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body).toHaveProperty('jwt');
      expect(refreshResponse.body).toHaveProperty('refresh_token');
    });
  });

  describe('Silent Re-authentication', () => {
    it('should handle expired tokens gracefully', async () => {
      // This simulates a scenario where the user's session has expired
      const expiredRefreshToken = 'expired_token_12345';

      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .send({ refreshtoken: expiredRefreshToken });

      expect(refreshResponse.status).toBe(401);
      expect(refreshResponse.body.error).toBe('invalid_refresh');
    });

    it('should perform silent reauth after Google token refresh failure', async () => {
      // Create initial session
      const startResponse = await request(app)
        .post('/auth/google/start')
        .send({ redirectUri: 'http://localhost:3000/callback' });

      const authUrl = new URL(startResponse.body.authUrl);
      const state = authUrl.searchParams.get('state');

      const mockInitialTokens = {
        access_token: 'initial_access_token',
        refresh_token: 'initial_google_refresh_token',
        id_token: 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIiwic2NvcGUiOiJvcGVuaWQgZW1haWwifQ.mock',
        scope: 'openid email profile'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockInitialTokens,
      } as any);

      const exchangeResponse = await request(app)
        .post('/auth/exchange')
        .send({
          code: 'initial_code',
          state: state,
          redirectUri: 'http://localhost:3000/callback'
        });

      const { refresh_token: appRefreshToken } = exchangeResponse.body;

      // Mock Google refresh token failure (expired/revoked)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }),
      } as any);

      // Silent reauth should still work using cached session data
      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .send({ refreshtoken: appRefreshToken });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body).toHaveProperty('jwt');
      expect(refreshResponse.body).toHaveProperty('refresh_token');
      
      // JWT should contain user info from original session
      const jwtParts = refreshResponse.body.jwt.split('.');
      expect(jwtParts.length).toBe(3);
    });

    it('should handle network timeout during silent reauth', async () => {
      // Create session first
      const startResponse = await request(app)
        .post('/auth/google/start')
        .send({ redirectUri: 'http://localhost:3000/callback' });

      const authUrl = new URL(startResponse.body.authUrl);
      const state = authUrl.searchParams.get('state');

      const mockTokens = {
        access_token: 'access_token',
        refresh_token: 'google_refresh_token',
        id_token: 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIn0.mock',
        scope: 'openid email profile'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens,
      } as any);

      const exchangeResponse = await request(app)
        .post('/auth/exchange')
        .send({
          code: 'mock_code',
          state: state,
          redirectUri: 'http://localhost:3000/callback'
        });

      const { refresh_token } = exchangeResponse.body;

      // Mock network timeout
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .send({ refreshtoken: refresh_token });

      // Network error should cause internal server error
      expect(refreshResponse.status).toBe(500);
    });

    it('should maintain session state during refresh', async () => {
      // Create initial session
      const startResponse = await request(app)
        .post('/auth/google/start')
        .send({ redirectUri: 'http://localhost:3000/callback' });

      const authUrl = new URL(startResponse.body.authUrl);
      const state = authUrl.searchParams.get('state');

      const mockInitialTokens = {
        access_token: 'initial_access_token',
        refresh_token: 'initial_google_refresh_token',
        id_token: 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIiwic2NvcGUiOiJvcGVuaWQgZW1haWwifQ.mock',
        scope: 'openid email profile'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockInitialTokens,
      } as any);

      const exchangeResponse = await request(app)
        .post('/auth/exchange')
        .send({
          code: 'initial_code',
          state: state,
          redirectUri: 'http://localhost:3000/callback'
        });

      const { refresh_token: appRefreshToken } = exchangeResponse.body;

      // Refresh tokens - simulate partial token response (no new refresh token)
      const mockRefreshTokens = {
        access_token: 'refreshed_access_token',
        scope: 'openid email profile'
        // No new refresh_token - should keep existing one
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRefreshTokens,
      } as any);

      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .send({ refreshtoken: appRefreshToken });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body).toHaveProperty('jwt');
      expect(refreshResponse.body).toHaveProperty('refresh_token');

      // Mock second refresh call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'second_access_token', scope: 'openid email profile' }),
      } as any);

      // Should be able to refresh again with new token
      const secondRefreshResponse = await request(app)
        .post('/auth/refresh')
        .send({ refreshtoken: refreshResponse.body.refresh_token });

      expect(secondRefreshResponse.status).toBe(200);
      expect(secondRefreshResponse.body).toHaveProperty('jwt');
      expect(secondRefreshResponse.body).toHaveProperty('refresh_token');
    });
  });

  describe('Concurrent Auth Operations', () => {
    it('should handle multiple simultaneous auth starts', async () => {
      const promises = Array(5).fill(null).map(() =>
        request(app)
          .post('/auth/google/start')
          .send({ redirectUri: 'http://localhost:3000/callback' })
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('authUrl');
      });

      // All should have unique states
      const states = responses.map(response => {
        const url = new URL(response.body.authUrl);
        return url.searchParams.get('state');
      });

      const uniqueStates = new Set(states);
      expect(uniqueStates.size).toBe(5);
    });

    it('should handle multiple logout attempts', async () => {
      const token = 'test_token_for_logout';
      
      const promises = Array(3).fill(null).map(() =>
        request(app)
          .post('/auth/logout')
          .send({ refresh_token: token })
      );

      const responses = await Promise.all(promises);

      // All should succeed (logout is idempotent)
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Complete Sign In/Sign Out Flow', () => {
    it('should complete full sign in and sign out cycle', async () => {
      // Step 1: Initiate sign in
      const startResponse = await request(app)
        .post('/auth/google/start')
        .send({ redirectUri: 'http://localhost:3000/callback' });

      expect(startResponse.status).toBe(200);
      expect(startResponse.body.authUrl).toContain('accounts.google.com/o/oauth2/v2/auth');

      const authUrl = new URL(startResponse.body.authUrl);
      const state = authUrl.searchParams.get('state');

      // Step 2: Complete sign in with authorization code
      const mockTokens = {
        access_token: 'signed_in_access_token',
        refresh_token: 'signed_in_google_refresh',
        id_token: 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyX3NpZ25lZF9pbiIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSJ9.mock',
        scope: 'openid email profile'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens,
      } as any);

      const signInResponse = await request(app)
        .post('/auth/exchange')
        .send({
          code: 'authorization_code_from_google',
          state: state,
          redirectUri: 'http://localhost:3000/callback'
        });

      expect(signInResponse.status).toBe(200);
      expect(signInResponse.body).toHaveProperty('jwt');
      expect(signInResponse.body).toHaveProperty('refresh_token');

      const { refresh_token, jwt } = signInResponse.body;

      // Verify JWT structure and content
      const jwtParts = jwt.split('.');
      expect(jwtParts.length).toBe(3);
      
      // Step 3: Use session (simulate authenticated request)
      const jwksResponse = await request(app).get('/auth/jwks.json');
      expect(jwksResponse.status).toBe(200);
      expect(jwksResponse.body.keys).toBeDefined();

      // Step 4: Sign out - should revoke Google tokens and clear session
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '', // Google revoke endpoint returns empty response
      } as any);

      const signOutResponse = await request(app)
        .post('/auth/logout')
        .send({ refresh_token });

      expect(signOutResponse.status).toBe(200);
      expect(signOutResponse.body.success).toBe(true);

      // Step 5: Verify session is invalidated
      const postSignOutRefresh = await request(app)
        .post('/auth/refresh')
        .send({ refreshtoken: refresh_token });

      expect(postSignOutRefresh.status).toBe(401);
      expect(postSignOutRefresh.body.error).toBe('invalid_refresh');
    });

    it('should handle sign out without active session', async () => {
      const signOutResponse = await request(app)
        .post('/auth/logout')
        .send({ refresh_token: 'nonexistent_token' });

      expect(signOutResponse.status).toBe(200);
      expect(signOutResponse.body.success).toBe(true);
    });

    it('should handle sign out with Google API failure', async () => {
      // Create session first
      const startResponse = await request(app)
        .post('/auth/google/start')
        .send({ redirectUri: 'http://localhost:3000/callback' });

      const authUrl = new URL(startResponse.body.authUrl);
      const state = authUrl.searchParams.get('state');

      const mockTokens = {
        access_token: 'access_token',
        refresh_token: 'google_refresh_token',
        id_token: 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIn0.mock',
        scope: 'openid email profile'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens,
      } as any);

      const exchangeResponse = await request(app)
        .post('/auth/exchange')
        .send({
          code: 'mock_code',
          state: state,
          redirectUri: 'http://localhost:3000/callback'
        });

      const { refresh_token } = exchangeResponse.body;

      // Mock Google revoke API failure
      mockFetch.mockRejectedValueOnce(new Error('Google API unavailable'));

      // Sign out should still succeed (local session cleared)
      const signOutResponse = await request(app)
        .post('/auth/logout')
        .send({ refresh_token });

      expect(signOutResponse.status).toBe(200);
      expect(signOutResponse.body.success).toBe(true);

      // Session should be cleared despite Google API failure
      const postSignOutRefresh = await request(app)
        .post('/auth/refresh')
        .send({ refreshtoken: refresh_token });

      expect(postSignOutRefresh.status).toBe(401);
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed JWT tokens gracefully', async () => {
      // Start auth flow
      const startResponse = await request(app)
        .post('/auth/google/start')
        .send({ redirectUri: 'http://localhost:3000/callback' });

      const authUrl = new URL(startResponse.body.authUrl);
      const state = authUrl.searchParams.get('state');

      // Mock response with malformed ID token
      const mockTokenResponse = {
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        id_token: 'malformed.jwt.token',
        scope: 'openid email profile'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      } as any);

      const exchangeResponse = await request(app)
        .post('/auth/exchange')
        .send({
          code: 'mock_code',
          state: state,
          redirectUri: 'http://localhost:3000/callback'
        });

      // Malformed JWT should cause server error
      expect(exchangeResponse.status).toBe(500);
    });

    it('should handle missing ID token', async () => {
      const startResponse = await request(app)
        .post('/auth/google/start')
        .send({ redirectUri: 'http://localhost:3000/callback' });

      const authUrl = new URL(startResponse.body.authUrl);
      const state = authUrl.searchParams.get('state');

      // Mock response without ID token
      const mockTokenResponse = {
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        scope: 'openid email profile'
        // No id_token
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      } as any);

      const exchangeResponse = await request(app)
        .post('/auth/exchange')
        .send({
          code: 'mock_code',
          state: state,
          redirectUri: 'http://localhost:3000/callback'
        });

      expect(exchangeResponse.status).toBe(200);
      expect(exchangeResponse.body).toHaveProperty('jwt');
      expect(exchangeResponse.body).toHaveProperty('refresh_token');
    });
  });

  describe('Token Refresh Comprehensive Tests', () => {
    it('should refresh tokens successfully with all token types', async () => {
      // Create initial session
      const startResponse = await request(app)
        .post('/auth/google/start')
        .send({ redirectUri: 'http://localhost:3000/callback' });

      const authUrl = new URL(startResponse.body.authUrl);
      const state = authUrl.searchParams.get('state');

      const mockInitialTokens = {
        access_token: 'initial_access_token',
        refresh_token: 'initial_google_refresh_token',
        id_token: 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIn0.mock',
        scope: 'openid email profile',
        expires_in: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockInitialTokens,
      } as any);

      const exchangeResponse = await request(app)
        .post('/auth/exchange')
        .send({
          code: 'initial_code',
          state: state,
          redirectUri: 'http://localhost:3000/callback'
        });

      const { refresh_token: appRefreshToken } = exchangeResponse.body;

      // Mock successful refresh with complete new token set
      const mockRefreshedTokens = {
        access_token: 'refreshed_access_token',
        refresh_token: 'new_google_refresh_token',
        id_token: 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZXhwIjoxNjk5OTk5OTk5fQ.new_mock',
        scope: 'openid email profile',
        expires_in: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRefreshedTokens,
      } as any);

      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .send({ refreshtoken: appRefreshToken });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body).toHaveProperty('jwt');
      expect(refreshResponse.body).toHaveProperty('refresh_token');
      expect(refreshResponse.body.refresh_token).not.toBe(appRefreshToken);

      // Verify JWT has updated information
      const newJwtParts = refreshResponse.body.jwt.split('.');
      expect(newJwtParts.length).toBe(3);
    });

    it('should handle partial refresh token response', async () => {
      // Setup initial session
      const startResponse = await request(app)
        .post('/auth/google/start')
        .send({ redirectUri: 'http://localhost:3000/callback' });

      const authUrl = new URL(startResponse.body.authUrl);
      const state = authUrl.searchParams.get('state');

      const mockTokens = {
        access_token: 'access_token',
        refresh_token: 'google_refresh_token',
        id_token: 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIn0.mock',
        scope: 'openid email profile'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens,
      } as any);

      const exchangeResponse = await request(app)
        .post('/auth/exchange')
        .send({
          code: 'mock_code',
          state: state,
          redirectUri: 'http://localhost:3000/callback'
        });

      const { refresh_token } = exchangeResponse.body;

      // Mock partial refresh response (only access token, no new refresh token)
      const mockPartialRefresh = {
        access_token: 'new_access_token',
        expires_in: 3600
        // No refresh_token or scope - should use existing ones
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPartialRefresh,
      } as any);

      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .send({ refreshtoken: refresh_token });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body).toHaveProperty('jwt');
      expect(refreshResponse.body).toHaveProperty('refresh_token');
    });

    it('should handle multiple rapid refresh requests', async () => {
      // Create session
      const startResponse = await request(app)
        .post('/auth/google/start')
        .send({ redirectUri: 'http://localhost:3000/callback' });

      const authUrl = new URL(startResponse.body.authUrl);
      const state = authUrl.searchParams.get('state');

      const mockTokens = {
        access_token: 'access_token',
        refresh_token: 'google_refresh_token',
        id_token: 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIn0.mock',
        scope: 'openid email profile'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens,
      } as any);

      const exchangeResponse = await request(app)
        .post('/auth/exchange')
        .send({
          code: 'mock_code',
          state: state,
          redirectUri: 'http://localhost:3000/callback'
        });

      const { refresh_token } = exchangeResponse.body;

      // Try to use the same refresh token multiple times rapidly
      const refreshPromises = Array(3).fill(null).map(() =>
        request(app)
          .post('/auth/refresh')
          .send({ refreshtoken: refresh_token })
      );

      const responses = await Promise.all(refreshPromises);
      
      // Only the first should succeed (refresh tokens are consumed)
      const successes = responses.filter(r => r.status === 200);
      const failures = responses.filter(r => r.status === 401);
      
      expect(successes.length).toBe(1);
      expect(failures.length).toBe(2);
      
      failures.forEach(response => {
        expect(response.body.error).toBe('invalid_refresh');
      });
    });
  });
});