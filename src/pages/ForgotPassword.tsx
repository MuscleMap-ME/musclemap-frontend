import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client/core';
import SEO from '../components/SEO';
import Logo from '../components/Logo';
import { sanitizeEmail } from '../utils/sanitize';

const REQUEST_PASSWORD_RESET = gql`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email) {
      success
      message
    }
  }
`;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [requestReset, { loading }] = useMutation(REQUEST_PASSWORD_RESET);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const { data } = await requestReset({
        variables: { email: sanitizeEmail(email) },
      });

      if (data?.requestPasswordReset?.success) {
        setSubmitted(true);
      }
    } catch (err: any) {
      const gqlError = err?.graphQLErrors?.[0]?.message;
      setError(gqlError || 'Something went wrong. Please try again.');
    }
  };

  return (
    <>
      <SEO
        title="Forgot Password"
        description="Reset your MuscleMap password. Enter your email to receive a password reset link."
      />
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
            <p className="text-gray-400 mt-2">Reset your password</p>
          </div>

          {submitted ? (
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
              <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
              <p className="text-gray-400 mb-6">
                If an account exists for <span className="text-white">{email}</span>, you&apos;ll
                receive a password reset link shortly.
              </p>
              <Link
                to="/login"
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Back to login
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

              <p className="text-gray-400 text-sm">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>

              <div>
                <label className="block text-gray-300 text-sm mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  placeholder="you@example.com"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full p-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-lg disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
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
