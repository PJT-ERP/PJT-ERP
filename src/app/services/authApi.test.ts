import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authApi } from './authApi';
import apiClient from './apiClient';

vi.mock('./apiClient', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  }
}));

describe('authApi Service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('login stores auth_token and auth_user in localStorage', async () => {
    const mockResponse = {
      data: {
        accessToken: 'fake-jwt-token',
        userId: 'u1',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['Admin'],
        department: 'IT',
      }
    };
    
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

    const result = await authApi.login('test@example.com', 'password123');

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/login', {
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result).toEqual(mockResponse.data);
    expect(localStorage.getItem('auth_token')).toBe('fake-jwt-token');
    
    const storedUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
    expect(storedUser.name).toBe('Test User');
    expect(storedUser.roles).toContain('Admin');
  });

  it('logout removes auth_token and auth_user from localStorage', async () => {
    localStorage.setItem('auth_token', 'fake-jwt-token');
    localStorage.setItem('auth_user', JSON.stringify({ name: 'Test' }));

    vi.mocked(apiClient.post).mockResolvedValueOnce({});

    await authApi.logout();

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/logout');
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
  });

  it('hasRole correctly validates user roles from localStorage', () => {
    localStorage.setItem('auth_user', JSON.stringify({ roles: ['Finance', 'Admin'] }));
    
    expect(authApi.hasRole('Finance')).toBe(true);
    expect(authApi.hasRole('Admin')).toBe(true);
    expect(authApi.hasRole('Engineering Worker')).toBe(false);
  });

  it('isLoggedIn returns true only when token exists', () => {
    expect(authApi.isLoggedIn()).toBe(false);
    
    localStorage.setItem('auth_token', 'token');
    
    expect(authApi.isLoggedIn()).toBe(true);
  });
});
