import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client/react';
import { Eye, EyeOff } from 'lucide-react';
import { extractErrorMessage } from '@musclemap/shared';
import { useUser } from '../contexts/UserContext';
import SEO from '../components/SEO';
import Logo from '../components/Logo';
import { sanitizeEmail } from '../utils/sanitize';
import { trackLogin, setUserProperties } from '../lib/analytics';
import { CockatriceToast } from '../components/mascot/cockatrice';
import { LOGIN_MUTATION } from '../graphql/mutations';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useUser();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [loginMutation, { loading }] = useMutation(LOGIN_MUTATION);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Read values directly from the DOM to handle iOS/browser autofill
    // which can bypass React's onChange events on controlled inputs
    const formEl = formRef.current;
    const emailInput = formEl?.querySelector<HTMLInputElement>('input[type="email"]');
    const passwordInput = formEl?.querySelector<HTMLInputElement>('input[type="password"], input[name="password"]');
    const emailValue = emailInput?.value || form.email;
    const passwordValue = passwordInput?.value || form.password;

    if (!emailValue || !passwordValue) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      const { data, errors } = await loginMutation({
        variables: {
          input: {
            email: sanitizeEmail(emailValue),
            password: passwordValue,
          },
        },
      });

      // Check for GraphQL errors first
      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      const result = data?.login;
      const token = result?.token;
      const user = result?.user;

      if (!token || !user) {
        throw new Error('Login failed. Please check your credentials.');
      }

      login(user, token);

      // Track login event
      trackLogin('email');
      const archetypeName = user.archetype?.name || 'none';
      setUserProperties(user.id, {
        archetype: archetypeName,
        has_completed_onboarding: !!user.archetype,
      });

      // User should go to dashboard if they have an archetype (completed onboarding)
      const hasCompletedOnboarding = !!user.archetype;
      navigate(hasCompletedOnboarding ? '/dashboard' : '/onboarding');
    } catch (err: unknown) {
      // Apollo GraphQL errors have a graphQLErrors array
      const apolloErr = err as { graphQLErrors?: { message: string }[]; networkError?: { message: string }; message?: string };
      const gqlError = apolloErr?.graphQLErrors?.[0]?.message;
      // Network errors have a message property
      const networkError = apolloErr?.networkError?.message;
      // Standard error message
      const standardError = apolloErr?.message;

      setError(gqlError || networkError || extractErrorMessage(standardError, 'Login failed'));
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
        <form ref={formRef} onSubmit={handleSubmit} className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 space-y-4" autoComplete="on">
          {error && (
            <CockatriceToast
              message={error}
              category="auth"
              onDismiss={() => setError('')}
              onRetry={handleSubmit}
              shouldReport={error.includes('500') || error.includes('server')}
            />
          )}
          <div>
            <label className="block text-gray-300 text-sm mb-1">Email</label>
            <input type="email" name="email" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none" placeholder="you@example.com" required />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-gray-300 text-sm">Password</label>
              <Link to="/forgot-password" className="text-blue-400 hover:text-blue-300 text-sm">Forgot password?</Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full p-3 pr-12 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                placeholder="Your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
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
