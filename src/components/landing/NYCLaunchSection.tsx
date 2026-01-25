import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { SafeMotion } from '../../utils/safeMotion';

const SafeMotionDiv = SafeMotion.div;

const nycStats = [
  { number: '8.3M', label: 'People' },
  { number: '2,000+', label: 'Gyms' },
  { number: '24/7', label: 'Culture' },
  { number: '#1', label: 'Diversity' },
];

const boroughs = [
  {
    name: 'Manhattan',
    color: 'blue',
    hangouts: ['Equinox Columbus Circle', 'Chelsea Piers Fitness', 'Tone House'],
  },
  {
    name: 'Brooklyn',
    color: 'purple',
    hangouts: ['Brooklyn Boulders', 'Aerospace High Performance', 'Prospect Park Runners'],
  },
  {
    name: 'Outdoor',
    color: 'green',
    hangouts: ['Central Park Great Lawn', 'Brooklyn Bridge Park', 'Hudson River Greenway'],
  },
];

const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' },
  green: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400' },
};

export function NYCLaunchSection() {
  return (
    <section className="relative z-10 py-20 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <SafeMotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="text-6xl mb-4">🗽</div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span
              style={{
                background: 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Built & Tested in New York City
            </span>
          </h2>
          <p className="text-xl text-gray-400">
            The world&apos;s toughest fitness market. The perfect proving ground.
          </p>
        </SafeMotionDiv>

        {/* NYC Stats */}
        <SafeMotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          {nycStats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"
            >
              <div className="text-2xl md:text-3xl font-bold text-orange-400">{stat.number}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </SafeMotionDiv>

        {/* Why NYC */}
        <SafeMotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-500/10 border border-orange-500/20 rounded-2xl p-6 mb-12"
        >
          <h3 className="text-xl font-bold text-orange-400 mb-4">Why NYC?</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-gray-300">
            <div className="flex items-start gap-2">
              <span className="text-lg">🏙️</span>
              <span>8.3 million people with every fitness goal imaginable</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">💪</span>
              <span>Thousands of gyms from boutique to mega-chains</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">🌡️</span>
              <span>Extreme weather testing (hot summers, cold winters)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">🕐</span>
              <span>24/7 culture means any-time workout schedules</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">🚇</span>
              <span>Transit-dependent = creative workout solutions</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">🌍</span>
              <span>Most diverse city = most inclusive design</span>
            </div>
          </div>
        </SafeMotionDiv>

        {/* Featured Hangouts */}
        <SafeMotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-12"
        >
          <h3 className="text-xl font-bold text-white mb-6 text-center">Featured NYC Hangouts</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {boroughs.map((borough) => {
              const colors = colorClasses[borough.color];
              return (
                <div
                  key={borough.name}
                  className={`${colors.bg} ${colors.border} border rounded-xl p-5`}
                >
                  <h4 className={`font-bold ${colors.text} mb-3`}>{borough.name}</h4>
                  <ul className="space-y-2">
                    {borough.hangouts.map((hangout) => (
                      <li key={hangout} className="text-gray-300 text-sm flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                        {hangout}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </SafeMotionDiv>

        {/* CTAs */}
        <SafeMotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <RouterLink
            to="/hangouts/new"
            className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500/10 border border-orange-500/30 hover:border-orange-500/50 hover:bg-orange-500/20 transition-all"
          >
            <span className="text-xl">➕</span>
            <span className="font-semibold text-orange-300">Add Your NYC Gym</span>
          </RouterLink>

          <RouterLink
            to="/request-city"
            className="text-gray-400 hover:text-white transition-colors"
          >
            Not in NYC? <span className="text-orange-400">Request your city →</span>
          </RouterLink>
        </SafeMotionDiv>

        {/* Expansion Note */}
        <SafeMotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-8"
        >
          <p className="text-gray-500 text-sm">
            NYC is our proving ground — but MuscleMap is for everyone.
            <br />
            Same privacy-first, community-driven approach, everywhere.
          </p>
        </SafeMotionDiv>
      </div>
    </section>
  );
}

export default NYCLaunchSection;
