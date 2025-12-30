import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="flex items-center justify-between p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">MuscleMap</h1>
        <div className="flex gap-4">
          <Link to="/login" className="px-4 py-2 text-gray-300 hover:text-white">Log In</Link>
          <Link to="/signup" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium">Sign Up</Link>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-32 text-center">
        <h2 className="text-5xl md:text-7xl font-black text-white mb-6">See Every Rep.<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Know Every Muscle.</span></h2>
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">Real-time muscle activation visualization. Log a set, watch it light up.</p>
        <Link to="/signup" className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-lg font-bold rounded-xl inline-block">Start Your Journey</Link>
      </div>
    </div>
  );
}
