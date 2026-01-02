import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

export default function Landing() {
  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: '#0a0a0f',
        backgroundImage:
          'radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.15), transparent 35%), radial-gradient(circle at 80% 0%, rgba(168, 85, 247, 0.2), transparent 30%)',
        color: '#e5e7eb',
      }}
    >
      <header className="w-full border-b border-white/5">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <RouterLink
            to="/"
            className="flex items-center gap-2 text-xl font-extrabold"
            style={{
              background: 'linear-gradient(90deg, #60a5fa 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            <img src="/logo.png" alt="" className="w-8 h-8 rounded-lg" style={{ WebkitTextFillColor: 'initial' }} />
            MuscleMap
          </RouterLink>

          <div className="flex items-center gap-3">
            <RouterLink
              to="/login"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-200 transition hover:text-white"
            >
              Log In
            </RouterLink>
            <RouterLink
              to="/signup"
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400"
            >
              Sign Up
            </RouterLink>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col items-center px-6 py-20 text-center md:py-28">
        <h1 className="mb-4 text-4xl font-black leading-tight text-white md:text-6xl">
          See Every Rep.
          <br />
          <span
            style={{
              display: 'inline-block',
              background: 'linear-gradient(90deg, #60a5fa 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Know Every Muscle.
          </span>
        </h1>

        <p className="mb-8 max-w-2xl text-lg text-gray-300 md:text-xl">
          Real-time muscle activation visualization. Log a set, watch it light up.
        </p>

        <RouterLink
          to="/signup"
          className="rounded-xl bg-indigo-500 px-6 py-3 text-lg font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400"
        >
          Start Your Journey
        </RouterLink>
      </main>
    </div>
  );
}
