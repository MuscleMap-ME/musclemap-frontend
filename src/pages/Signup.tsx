import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client/react';
import { useUser } from '../contexts/UserContext';
import SEO from '../components/SEO';
import Logo from '../components/Logo';
import { sanitizeText, sanitizeEmail } from '../utils/sanitize';
import { trackSignUp, trackLogin, setUserProperties } from '../lib/analytics';
import { REGISTER_MUTATION, LOGIN_MUTATION } from '../graphql/mutations';
import { extractErrorMessage } from '@musclemap/shared';

export default function Signup() {
  // SEO structured data for signup
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Sign Up for MuscleMap',
    description: 'Create your free MuscleMap account. Start tracking your fitness journey with real-time muscle visualization.',
    url: 'https://musclemap.me/signup',
  };
  const navigate = useNavigate();
  const { login } = useUser();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');

  const [registerMutation, { loading: registerLoading }] = useMutation(REGISTER_MUTATION);
  const [loginMutation, { loading: loginLoading }] = useMutation(LOGIN_MUTATION);
  const loading = registerLoading || loginLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }

    try {
      const { data } = await registerMutation({
        variables: {
          input: {
            username: sanitizeText(form.username),
            email: sanitizeEmail(form.email),
            password: form.password,
          },
        },
      });

      const result = data?.register;
      login(result.user, result.token);

      // Track signup event
      trackSignUp('email');
      setUserProperties(result.user.id, {
        archetype: 'none',
        has_completed_onboarding: false,
      });

      navigate('/onboarding');
    } catch (err) {
      const message = extractErrorMessage(err, '');
      if (message.toLowerCase().includes('exist')) {
        setError('Account already exists. Trying to log you in...');
        try {
          const { data: loginData } = await loginMutation({
            variables: {
              input: {
                email: sanitizeEmail(form.email),
                password: form.password,
              },
            },
          });

          const loginResult = loginData?.login;
          login(loginResult.user, loginResult.token);

          // Track login event (user already exists)
          trackLogin('email');
          setUserProperties(loginResult.user.id, {
            archetype: loginResult.user.archetype || 'none',
            has_completed_onboarding: !!loginResult.user.archetype,
          });

          navigate(loginResult.user?.archetype ? '/dashboard' : '/onboarding');
          return;
        } catch (loginErr) {
          setError(extractErrorMessage(loginErr, 'Account exists but password is different. Please log in.'));
          return;
        }
      }
      setError(message || 'Registration failed');
    }
  };

  return (
    <>
      <SEO
        title="Sign Up"
        description="Create your free MuscleMap account. Start tracking your fitness journey with real-time muscle visualization."
        structuredData={structuredData}
      />
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundColor: '#0a0a0f',
        backgroundImage: 'radial-gradient(circle at 70% 20%, rgba(99, 102, 241, 0.12), transparent 40%), radial-gradient(circle at 30% 80%, rgba(168, 85, 247, 0.12), transparent 40%)',
      }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <div className="mx-auto mb-4 w-20 h-20 rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-shadow duration-300 overflow-hidden">
              <Logo size="xl" priority className="rounded-2xl" />
            </div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">MuscleMap</h1>
          </Link>
          <p className="text-gray-400 mt-2">Create your account</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 space-y-4">
          {error && <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-300 text-sm">{error}</div>}
          <div>
            <label className="block text-gray-300 text-sm mb-1">Username</label>
            <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none" placeholder="Choose a username" required />
          </div>
          <div>
            <label className="block text-gray-300 text-sm mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none" placeholder="you@example.com" required />
          </div>
          <div>
            <label className="block text-gray-300 text-sm mb-1">Password</label>
            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none" placeholder="At least 8 characters" required />
          </div>
          <div>
            <label className="block text-gray-300 text-sm mb-1">Confirm Password</label>
            <input type="password" value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none" placeholder="Confirm password" required />
          </div>
          <button type="submit" disabled={loading} className="w-full p-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-lg disabled:opacity-50">{loading ? 'Please wait...' : 'Create Account'}</button>
          <p className="text-center text-gray-400 text-sm">Already have an account? <Link to="/login" className="text-blue-400 hover:text-blue-300">Log in</Link></p>
        </form>
      </div>
    </div>
    </>
  );
}
