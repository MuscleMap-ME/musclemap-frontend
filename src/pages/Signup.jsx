import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { api } from '../utils/api';
import SEO from '../components/SEO';
import { sanitizeText, sanitizeEmail } from '../utils/sanitize';
import { trackSignUp, trackLogin, setUserProperties } from '../lib/analytics';

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
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      // Sanitize user input before sending to API
      const sanitizedData = {
        username: sanitizeText(form.username),
        email: sanitizeEmail(form.email),
        password: form.password, // Don't sanitize password - it may contain special chars
      };
      const data = await api.auth.register(sanitizedData);
      login(data.user, data.token);

      // Track signup event
      trackSignUp('email');
      setUserProperties(data.user.id, {
        archetype: 'none',
        has_completed_onboarding: false,
      });

      navigate('/onboarding');
    } catch (err) {
      const message = err.message || '';
      if (message.toLowerCase().includes('exist')) {
        setError('Account already exists. Trying to log you in...');
        try {
          const loginData = await api.auth.login(form.email, form.password);
          login(loginData.user, loginData.token);

          // Track login event (user already exists)
          trackLogin('email');
          setUserProperties(loginData.user.id, {
            archetype: loginData.user.archetype || 'none',
            has_completed_onboarding: !!loginData.user.archetype,
          });

          navigate(loginData.user?.archetype ? '/dashboard' : '/onboarding');
          return;
        } catch (loginErr) {
          setError(loginErr.message || 'Account exists but password is different. Please log in.');
          setLoading(false);
          return;
        }
      }
      setError(message || 'Registration failed');
    }
    finally { setLoading(false); }
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
            <img
              src="/logo.png"
              alt="MuscleMap"
              className="w-20 h-20 mx-auto mb-4 rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-shadow duration-300"
            />
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
