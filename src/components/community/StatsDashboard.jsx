/**
 * StatsDashboard Component
 *
 * Displays community-wide statistics with charts.
 */

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';

const COLORS = [
  '#8b5cf6',
  '#6366f1',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#ef4444',
  '#84cc16',
];

function StatCard({ title, value, subtitle, icon, trend }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-sm">{title}</span>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subtitle && <div className="text-sm text-gray-400 mt-1">{subtitle}</div>}
      {trend !== undefined && (
        <div
          className={`text-sm mt-1 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}
        >
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% from last period
        </div>
      )}
    </div>
  );
}

function OverviewCards({ overview }) {
  if (!overview) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <StatCard
        title="Total Users"
        value={overview.users?.total?.toLocaleString() || '0'}
        subtitle={`+${overview.users?.newInWindow || 0} new`}
        icon="👥"
      />
      <StatCard
        title="Workouts"
        value={overview.workouts?.countInWindow?.toLocaleString() || '0'}
        subtitle={`${overview.overview?.window || '24h'}`}
        icon="🏋️"
      />
      <StatCard
        title="Total TU"
        value={overview.workouts?.totalTuInWindow?.toLocaleString() || '0'}
        subtitle="Training units"
        icon="💪"
      />
      <StatCard
        title="Credits"
        value={overview.credits?.totalInCirculation?.toLocaleString() || '0'}
        subtitle={`Avg: ${overview.credits?.averagePerUser || 0}`}
        icon="🪙"
      />
    </div>
  );
}

function ArchetypeChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-4 h-64 flex items-center justify-center text-gray-400">
        No archetype data available
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <h3 className="text-lg font-bold text-white mb-4">Archetype Distribution</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            dataKey="userCount"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ name, percentage }) => `${name} (${percentage}%)`}
            labelLine={{ stroke: '#6b7280' }}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '8px' }}
            itemStyle={{ color: '#fff' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function ExerciseRanking({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-4 h-64 flex items-center justify-center text-gray-400">
        No exercise data available
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <h3 className="text-lg font-bold text-white mb-4">Popular Exercises</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data.slice(0, 10)} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis type="number" stroke="#9ca3af" />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            stroke="#9ca3af"
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '8px' }}
            itemStyle={{ color: '#fff' }}
          />
          <Bar dataKey="usageCount" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function FunnelChartComponent({ data }) {
  if (!data?.stages || data.stages.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-4 h-64 flex items-center justify-center text-gray-400">
        No funnel data available
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <h3 className="text-lg font-bold text-white mb-4">User Journey Funnel</h3>
      <div className="space-y-2">
        {data.stages.map((stage, index) => (
          <div key={stage.name} className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-300">{stage.name}</span>
              <span className="text-sm text-gray-400">
                {stage.count.toLocaleString()} ({stage.percentage}%)
              </span>
            </div>
            <div className="h-6 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${stage.percentage}%`,
                  background: COLORS[index % COLORS.length],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreditDistribution({ data }) {
  if (!data?.buckets || data.buckets.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-4 h-64 flex items-center justify-center text-gray-400">
        No credit data available
      </div>
    );
  }

  // Order buckets logically
  const orderedBuckets = ['negative', '0', '1-100', '101-500', '501-1000', '1001-5000', '5000+'];
  const chartData = orderedBuckets
    .map((bucket) => {
      const found = data.buckets.find((b) => b.bucket === bucket);
      return found ? { name: bucket, count: found.count } : null;
    })
    .filter(Boolean);

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <h3 className="text-lg font-bold text-white mb-4">Credit Distribution</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 10 }} />
          <YAxis stroke="#9ca3af" />
          <Tooltip
            contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '8px' }}
            itemStyle={{ color: '#fff' }}
          />
          <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      {data.stats && (
        <div className="grid grid-cols-4 gap-2 mt-4 text-center">
          <div>
            <div className="text-xs text-gray-400">Min</div>
            <div className="text-sm font-bold text-white">{data.stats.min}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Max</div>
            <div className="text-sm font-bold text-white">{data.stats.max}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Average</div>
            <div className="text-sm font-bold text-white">{data.stats.average}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Total</div>
            <div className="text-sm font-bold text-white">
              {data.stats.total.toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GeographicStats({ data }) {
  if (!data) {
    return (
      <div className="bg-gray-800 rounded-xl p-4 h-64 flex items-center justify-center text-gray-400">
        No geographic data available
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <h3 className="text-lg font-bold text-white mb-4">Geographic Distribution</h3>
      <div className="text-sm text-gray-400 mb-3">
        {data.totalWithLocation} users with location data
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Top Countries</h4>
          <div className="space-y-1">
            {data.byCountry?.slice(0, 5).map((country) => (
              <div
                key={country.country_code}
                className="flex justify-between text-sm"
              >
                <span className="text-gray-300">{country.country}</span>
                <span className="text-purple-400">{country.user_count}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Top Cities</h4>
          <div className="space-y-1">
            {data.byCity?.slice(0, 5).map((city, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-300">{city.city}</span>
                <span className="text-purple-400">{city.user_count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StatsDashboard({
  overview,
  archetypes,
  exercises,
  funnel,
  credits,
  geographic,
  loading = false,
}) {
  const [timeWindow, setTimeWindow] = useState('24h');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Window Selector */}
      <div className="flex gap-2">
        {['1h', '24h', '7d'].map((w) => (
          <button
            key={w}
            onClick={() => setTimeWindow(w)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeWindow === w
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      {/* Overview Cards */}
      <OverviewCards overview={overview} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ArchetypeChart data={archetypes} />
        <ExerciseRanking data={exercises} />
        <FunnelChartComponent data={funnel} />
        <CreditDistribution data={credits} />
        <GeographicStats data={geographic} />
      </div>
    </div>
  );
}
