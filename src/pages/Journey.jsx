import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../contexts/UserContext";

const ARC = {
  bodybuilder: { i: "💪", c: "from-red-500 to-orange-500" },
  powerlifter: { i: "🏋️", c: "from-gray-600 to-gray-800" },
  gymnast: { i: "🤸", c: "from-purple-500 to-pink-500" },
  crossfit: { i: "⚡", c: "from-yellow-500 to-orange-500" },
  sprinter: { i: "🏃", c: "from-blue-400 to-cyan-400" },
  swimmer: { i: "🏊", c: "from-cyan-500 to-blue-500" },
  judoka: { i: "🥋", c: "from-red-600 to-red-800" },
  boxer: { i: "🥊", c: "from-red-500 to-yellow-500" },
  mma: { i: "👊", c: "from-gray-800 to-red-600" },
  wrestler: { i: "🤼", c: "from-blue-600 to-indigo-600" },
  rock_climber: { i: "🧗", c: "from-amber-500 to-orange-600" },
  marathon: { i: "🏅", c: "from-amber-400 to-yellow-500" },
  cyclist: { i: "🚴", c: "from-green-400 to-emerald-500" },
  functional: { i: "🔧", c: "from-green-500 to-teal-500" },
  default: { i: "🎯", c: "from-gray-500 to-gray-700" }
};
const getA = id => ARC[id] || ARC["default"];

export default function Journey() {
  const { user, login } = useUser();
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const token = localStorage.getItem("musclemap_token");
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch("/api/journey/paths", { headers: { Authorization: "Bearer " + token } });
      if (res.ok) { const d = await res.json(); setPaths(d.paths || []); }
    } catch(e) {}
    setLoading(false);
  }

  async function switchPath(id) {
    setSwitching(id);
    const token = localStorage.getItem("musclemap_token");
    try {
      const res = await fetch("/api/journey/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ archetype: id, reason: "user_choice" })
      });
      const data = await res.json();
      if (data.success) {
        const updatedUser = { ...user, archetype: id };
        login(updatedUser, token);
        setSuccess(id);
        setTimeout(() => setSuccess(null), 2000);
        await load();
      }
    } catch(e) {}
    setSwitching(null);
  }

  if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center"><div className="animate-pulse text-3xl">🎳 Loading...</div></div>;

  const cur = paths.find(p => p.isCurrent);
  const other = paths.filter(p => !p.isCurrent);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white pb-8">
      {success && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-8 py-4 rounded-2xl shadow-2xl text-lg font-bold bg-green-500 animate-bounce">✨ Switched to {success}!</div>}
      <header className="bg-gray-900/80 backdrop-blur-lg p-5 sticky top-0 z-10 border-b border-gray-700">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="text-blue-400 text-lg">← Back</Link>
          <h1 className="text-2xl font-bold">🌌 Your Journey</h1>
          <div className="w-16"></div>
        </div>
      </header>
      <div className="max-w-5xl mx-auto p-6">
        {cur && (
          <div className="mb-10">
            <h2 className="text-sm text-gray-400 mb-3 uppercase tracking-wider">CURRENT PATH</h2>
            <div className={`bg-gradient-to-br ${getA(cur.archetype).c} rounded-3xl p-8 shadow-2xl`}>
              <div className="flex items-center gap-6">
                <span className="text-8xl">{getA(cur.archetype).i}</span>
                <div className="flex-1">
                  <h3 className="text-3xl font-bold capitalize">{cur.name || cur.archetype}</h3>
                  <div className="bg-white/20 rounded-full h-4 mt-3 overflow-hidden"><div className="h-full bg-white rounded-full" style={{width: (cur.percentComplete||0) + "%"}}></div></div>
                  <p className="text-lg opacity-90 mt-2">{(cur.percentComplete||0).toFixed(1)}% complete</p>
                </div>
              </div>
            </div>
          </div>
        )}
        <h2 className="text-sm text-gray-400 mb-4 uppercase tracking-wider">EXPLORE OTHER PATHS</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {other.map(p => (
            <button key={p.archetype} onClick={() => switchPath(p.archetype)} disabled={!!switching}
              className={`relative bg-gradient-to-br ${getA(p.archetype).c} rounded-2xl p-6 aspect-square flex flex-col items-center justify-center active:scale-95 hover:scale-105 transition-all duration-200 shadow-xl`}>
              <span className="text-6xl">{switching===p.archetype ? "⏳⏳" : getA(p.archetype).i}</span>
              <span className="text-sm font-bold capitalize mt-2 text-center">{p.name||p.archetype}</span>
              <span className="absolute top-2 right-2 bg-black/40 rounded-full px-3 py-1 text-xs font-bold">{(p.percentComplete||0).toFixed(0)}%</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}