import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { extractErrorMessage } from '@musclemap/shared';
import { useUser } from '../contexts/UserContext';
import { fetchWithLogging } from '../utils/logger';
import SEO from '../components/SEO';
import Logo from '../components/Logo';
import { sanitizeEmail } from '../utils/sanitize';
import { trackLogin, setUserProperties } from '../lib/analytics';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useUser();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Sanitize email before sending to API
      const res = await fetchWithLogging('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sanitizeEmail(form.email), password: form.password }),
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(extractErrorMessage(data, `Login failed (${res.status})`));
      }

      // API returns { data: { token, user } }
      const payload = data?.data ?? data;
      const token = payload?.token;
      const user = payload?.user;

      if (!token || !user) {
        throw new Error('Login response missing token/user (API contract mismatch).');
      }

      login(user, token);

      // Track login event
      trackLogin('email');
      setUserProperties(user.id, {
        archetype: user.archetype || 'none',
        has_completed_onboarding: !!user.onboardingCompletedAt || !!user.archetype,
      });

      // Check both archetype AND onboarding completion status
      // User should go to dashboard if they have completed onboarding OR have an archetype
      const hasCompletedOnboarding = !!user.onboardingCompletedAt || !!user.archetype;
      navigate(hasCompletedOnboarding ? '/dashboard' : '/onboarding');
    } catch (err) {
      setError(extractErrorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Log In"
        description="Log in to your MuscleMap account. Access your workouts, progress, and community features."
      />
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundColor: '#0a0a0f',
        backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(99, 102, 241, 0.12), transparent 40%), radial-gradient(circle at 70% 80%, rgba(168, 85, 247, 0.12), transparent 40%)',
      }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <div className="mx-auto mb-4 w-20 h-20 rounded-2xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-shadow duration-300 overflow-hidden">
              <Logo size="xl" priority className="rounded-2xl" />
            </div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">MuscleMap</h1>
          </Link>
          <p className="text-gray-400 mt-2">Welcome back</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 space-y-4">
          {error && <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-300 text-sm">{error}</div>}
          <div>
            <label className="block text-gray-300 text-sm mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none" placeholder="you@example.com" required />
          </div>
          <div>
            <label className="block text-gray-300 text-sm mb-1">Password</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none" placeholder="Your password" required />
          </div>
          <button type="submit" disabled={loading} className="w-full p-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-lg disabled:opacity-50">
            {loading ? 'Logging in...' : 'Log In'}
          </button>
          <p className="text-center text-gray-400 text-sm">Don&apos;t have an account? <Link to="/signup" className="text-blue-400 hover:text-blue-300">Sign up</Link></p>
        </form>
      </div>
    </div>
    </>
  );
}
