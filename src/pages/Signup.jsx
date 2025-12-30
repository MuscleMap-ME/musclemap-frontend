import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { api } from '../utils/api';

export default function Signup() {
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
      const data = await api.auth.register({ username: form.username, email: form.email, password: form.password });
      login(data.user, data.token);
      navigate('/onboarding');
    } catch (err) {
      const message = err.message || '';
      if (message.toLowerCase().includes('exist')) {
        setError('Account already exists. Trying to log you in...');
        try {
          const loginData = await api.auth.login(form.email, form.password);
          login(loginData.user, loginData.token);
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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/"><h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">MuscleMap</h1></Link>
          <p className="text-gray-400 mt-2">Create your account</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-6 space-y-4">
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
  );
}
