import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { restoreStoredUser, AUTH_PROFILE_KEY, AUTH_USER_KEY, AUTH_TOKEN_KEY } from '../useAuth';

describe('useAuth hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('restoreStoredUser', () => {
    it('should restore user if AUTH_PROFILE_KEY is in localStorage', () => {
      const mockProfile = {
        userId: 'u123',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['Admin'],
        department: 'Engineering'
      };
      
      localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(mockProfile));

      const user = restoreStoredUser();

      expect(user).not.toBeNull();
      expect(user?.id).toBe('u123');
      expect(user?.email).toBe('test@example.com');
      expect(user?.role).toBe('Admin');
    });

    it('should return null and clean AUTH_USER_KEY if AUTH_PROFILE_KEY is missing', () => {
      localStorage.setItem(AUTH_USER_KEY, 'stray_user_key');
      
      const user = restoreStoredUser();

      expect(user).toBeNull();
      expect(localStorage.getItem(AUTH_USER_KEY)).toBeNull();
    });

    it('should ignore AUTH_TOKEN_KEY (handled by http-only cookie backend)', () => {
      // Even if auth_token is empty or missing, it should still restore the user
      // Because we rely on the http-only cookie for the actual token,
      // the frontend just trusts the auth profile until a 401 occurs.
      const mockProfile = {
        userId: 'u456',
        email: 'dev@example.com',
        roles: ['Engineering']
      };
      
      localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(mockProfile));
      localStorage.removeItem(AUTH_TOKEN_KEY);

      const user = restoreStoredUser();

      expect(user).not.toBeNull();
      expect(user?.id).toBe('u456');
    });
  });
});
