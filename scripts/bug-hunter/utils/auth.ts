/**
 * Authentication Utilities
 * Handle test user creation, login, and session management
 */

import type { Page } from 'playwright';
import { v4 as uuidv4 } from 'uuid';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  username: string;
  token?: string;
}

export interface AuthContext {
  user: TestUser;
  token: string;
  refreshToken?: string;
  expiresAt?: string;
}

// ============================================================================
// TEST USER MANAGEMENT
// ============================================================================

export function generateTestUser(): TestUser {
  const uniqueId = uuidv4().slice(0, 8);
  return {
    id: uniqueId,
    email: `bughunter-${uniqueId}@test.musclemap.me`,
    password: 'BugHunter123!@#',
    username: `bughunter_${uniqueId}`,
  };
}

// ============================================================================
// API-BASED AUTHENTICATION
// ============================================================================

export async function registerUserViaAPI(baseUrl: string, user: TestUser): Promise<AuthContext | null> {
  try {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        username: user.username,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Registration failed: ${response.status} - ${error}`);
      return null;
    }

    const data = await response.json();
    return {
      user,
      token: data.token || data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
    };
  } catch (error) {
    console.error('Registration error:', error);
    return null;
  }
}

export async function loginUserViaAPI(baseUrl: string, user: TestUser): Promise<AuthContext | null> {
  try {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Login failed: ${response.status} - ${error}`);
      return null;
    }

    const data = await response.json();
    return {
      user,
      token: data.token || data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
    };
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

export async function deleteUserViaAPI(baseUrl: string, token: string, userId: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Delete user error:', error);
    return false;
  }
}

export async function verifyToken(baseUrl: string, token: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

// ============================================================================
// BROWSER-BASED AUTHENTICATION
// ============================================================================

export async function loginViaBrowser(page: Page, baseUrl: string, user: TestUser): Promise<boolean> {
  try {
    // Navigate to login page
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });

    // Fill login form
    await page.fill('input[type="email"], input[name="email"]', user.email);
    await page.fill('input[type="password"], input[name="password"]', user.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect (should go to dashboard)
    await page.waitForURL('**/dashboard**', { timeout: 10000 });

    return true;
  } catch (error) {
    console.error('Browser login failed:', error);
    return false;
  }
}

export async function registerViaBrowser(page: Page, baseUrl: string, user: TestUser): Promise<boolean> {
  try {
    // Navigate to signup page
    await page.goto(`${baseUrl}/signup`, { waitUntil: 'networkidle' });

    // Fill registration form
    const usernameInput = await page.$('input[name="username"]');
    if (usernameInput) {
      await usernameInput.fill(user.username);
    }

    await page.fill('input[type="email"], input[name="email"]', user.email);
    await page.fill('input[type="password"], input[name="password"]', user.password);

    // Check for confirm password field
    const confirmPassword = await page.$('input[name="confirmPassword"], input[name="passwordConfirm"]');
    if (confirmPassword) {
      await confirmPassword.fill(user.password);
    }

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for success (either redirect or success message)
    await Promise.race([
      page.waitForURL('**/dashboard**', { timeout: 10000 }),
      page.waitForURL('**/login**', { timeout: 10000 }),
      page.waitForSelector('[class*="success"]', { timeout: 10000 }),
    ]);

    return true;
  } catch (error) {
    console.error('Browser registration failed:', error);
    return false;
  }
}

export async function logoutViaBrowser(page: Page): Promise<boolean> {
  try {
    // Try to find and click logout button
    const logoutButton = await page.$('button:has-text("Logout"), a:has-text("Logout"), [data-action="logout"]');
    if (logoutButton) {
      await logoutButton.click();
      await page.waitForLoadState('networkidle');
      return true;
    }

    // Try clicking on profile menu first
    const profileMenu = await page.$('[data-testid="profile-menu"], .profile-menu, .user-menu');
    if (profileMenu) {
      await profileMenu.click();
      await page.waitForTimeout(500);

      const logoutItem = await page.$('button:has-text("Logout"), a:has-text("Logout")');
      if (logoutItem) {
        await logoutItem.click();
        await page.waitForLoadState('networkidle');
        return true;
      }
    }

    // Fallback: clear storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    return true;
  } catch (error) {
    console.error('Browser logout failed:', error);
    return false;
  }
}

// ============================================================================
// TOKEN INJECTION
// ============================================================================

export async function injectToken(page: Page, token: string): Promise<void> {
  await page.evaluate((t) => {
    localStorage.setItem('token', t);
    localStorage.setItem('accessToken', t);
    localStorage.setItem('auth_token', t);
  }, token);
}

export async function injectAuthContext(page: Page, authContext: AuthContext): Promise<void> {
  await page.evaluate((ctx) => {
    localStorage.setItem('token', ctx.token);
    localStorage.setItem('accessToken', ctx.token);
    localStorage.setItem('auth_token', ctx.token);

    if (ctx.refreshToken) {
      localStorage.setItem('refreshToken', ctx.refreshToken);
    }

    if (ctx.user) {
      localStorage.setItem('user', JSON.stringify(ctx.user));
    }
  }, authContext);
}

export async function clearAuth(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    sessionStorage.clear();
  });
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

export async function isLoggedIn(page: Page, baseUrl: string): Promise<boolean> {
  try {
    // Check localStorage for token
    const token = await page.evaluate(() => {
      return localStorage.getItem('token') ||
             localStorage.getItem('accessToken') ||
             localStorage.getItem('auth_token');
    });

    if (!token) return false;

    // Verify token is valid
    return await verifyToken(baseUrl, token);
  } catch {
    return false;
  }
}

export async function getStoredToken(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    return localStorage.getItem('token') ||
           localStorage.getItem('accessToken') ||
           localStorage.getItem('auth_token');
  });
}

// ============================================================================
// AUTH STATE FOR TESTS
// ============================================================================

export interface AuthState {
  isAuthenticated: boolean;
  user?: TestUser;
  token?: string;
}

export async function getAuthState(page: Page, baseUrl: string): Promise<AuthState> {
  const token = await getStoredToken(page);

  if (!token) {
    return { isAuthenticated: false };
  }

  const isValid = await verifyToken(baseUrl, token);

  if (!isValid) {
    return { isAuthenticated: false };
  }

  const userStr = await page.evaluate(() => localStorage.getItem('user'));
  let user: TestUser | undefined;

  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch {
      // Invalid user data
    }
  }

  return {
    isAuthenticated: true,
    user,
    token,
  };
}

// ============================================================================
// ADMIN AUTHENTICATION
// ============================================================================

export async function loginAsAdmin(baseUrl: string): Promise<AuthContext | null> {
  // Try to login with admin credentials from environment
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@musclemap.me';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';

  return loginUserViaAPI(baseUrl, {
    id: 'admin',
    email: adminEmail,
    password: adminPassword,
    username: 'admin',
  });
}

export async function isAdmin(baseUrl: string, token: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) return false;

    const data = await response.json();
    return data.role === 'admin' || data.isAdmin === true;
  } catch {
    return false;
  }
}
