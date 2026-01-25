import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client/core';
import SEO from '../components/SEO';
import Logo from '../components/Logo';

const RESET_PASSWORD = gql`
  mutation ResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input) {
      success
      message
    }
  }
`;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [resetPassword, { loading }] = useMutation(RESET_PASSWORD);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      const { data } = await resetPassword({
        variables: {
          input: {
            token,
            newPassword: form.password,
          },
        },
      });

      if (data?.resetPassword?.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (err: any) {
      const gqlError = err?.graphQLErrors?.[0]?.message;
      setError(gqlError || 'Something went wrong. Please try again.');
    }
  };

  // Check for missing token
  if (!token) {
    return (
      <>
        <SEO title="Reset Password" description="Reset your MuscleMap password." />
        <div
          className="min-h-screen flex items-center justify-center p-4"
          style={{
            backgroundColor: '#0a0a0f',
            backgroundImage:
              'radial-gradient(circle at 30% 20%, rgba(99, 102, 241, 0.12), transparent 40%), radial-gradient(circle at 70% 80%, rgba(168, 85, 247, 0.12), transparent 40%)',
          }}
        >
          <div className="w-full max-w-md">
            <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Invalid Reset Link</h2>
              <p className="text-gray-400 mb-6">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Link
                to="/forgot-password"
                className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-lg"
              >
                Request New Link
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title="Reset Password" description="Create a new password for your MuscleMap account." />
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundColor: '#0a0a0f',
          backgroundImage:
            'radial-gradient(circle at 30% 20%, rgba(99, 102, 241, 0.12), transparent 40%), radial-gradient(circle at 70% 80%, rgba(168, 85, 247, 0.12), transparent 40%)',
        }}
      >
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <div className="mx-auto mb-4 w-20 h-20 rounded-2xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-shadow duration-300 overflow-hidden">
                <Logo size="xl" priority className="rounded-2xl" />
              </div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                MuscleMap
              </h1>
            </Link>
            <p className="text-gray-400 mt-2">Create new password</p>
          </div>

          {success ? (
            <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Password Reset!</h2>
              <p className="text-gray-400 mb-6">
                Your password has been reset successfully. Redirecting you to login...
              </p>
              <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                Go to login now
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 space-y-4"
            >
              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-gray-300 text-sm mb-1">New Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Re-enter your password"
                  required
                  minLength={8}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full p-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-lg disabled:opacity-50"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>

              <p className="text-center text-gray-400 text-sm">
                Remember your password?{' '}
                <Link to="/login" className="text-blue-400 hover:text-blue-300">
                  Log in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
