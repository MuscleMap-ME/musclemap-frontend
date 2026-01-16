import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { HangoutCard } from '../components/social';

const TYPES = [
  { id: 'gym', name: 'Gym', icon: '🏋️' },
  { id: 'park', name: 'Park', icon: '🌳' },
  { id: 'outdoor', name: 'Outdoor', icon: '🌄' },
  { id: 'studio', name: 'Studio', icon: '🧘' },
  { id: 'home', name: 'Home', icon: '🏠' },
];

export default function Locations() {
  const { token } = useAuth();
  const [tab, setTab] = useState('nearby');
  const [locations, setLocations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState(null);
  const [userLoc, setUserLoc] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newLoc, setNewLoc] = useState({ name: '', type: 'gym', city: '', description: '' });
  const [showRate, setShowRate] = useState(false);
  const [rating, setRating] = useState({ rating: 5, safety_rating: 5, crowd_level: 3, cleanliness: 5, comment: '' });

  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log('Geo denied')
      );
    }
  }, []);

  useEffect(() => {
    if (tab === 'nearby' && userLoc) loadNearby();
    else if (tab === 'search') loadSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, userLoc, filterType]);

  const loadNearby = async () => {
    if (!userLoc) return;
    setLoading(true);
    const url = '/api/locations/nearby?lat=' + userLoc.lat + '&lng=' + userLoc.lng + (filterType ? '&type=' + filterType : '');
    const res = await fetch(url).then(r => r.json());
    setLocations(res.locations || []);
    setLoading(false);
  };

  const loadSearch = async () => {
    setLoading(true);
    const url = '/api/locations/search?q=' + encodeURIComponent(search) + (filterType ? '&type=' + filterType : '');
    const res = await fetch(url).then(r => r.json());
    setLocations(res.locations || []);
    setLoading(false);
  };

  const loadDetails = async (id) => {
    const res = await fetch('/api/locations/' + id).then(r => r.json());
    setDetails(res);
    setSelected(id);
  };

  const addLocation = async () => {
    if (!newLoc.name) return alert('Name required');
    const body = { ...newLoc };
    if (userLoc) { body.lat = userLoc.lat; body.lng = userLoc.lng; }
    await fetch('/api/locations', { method: 'POST', headers, body: JSON.stringify(body) });
    setShowAdd(false);
    setNewLoc({ name: '', type: 'gym', city: '', description: '' });
    loadSearch();
  };

  const submitRating = async () => {
    await fetch('/api/locations/' + selected + '/rate', { method: 'POST', headers, body: JSON.stringify(rating) });
    setShowRate(false);
    loadDetails(selected);
  };

  const voteComment = async (cid, v) => {
    await fetch('/api/locations/comment/' + cid + '/vote', { method: 'POST', headers, body: JSON.stringify({ vote: v }) });
    loadDetails(selected);
  };

  const getTypeIcon = (t) => TYPES.find(x => x.id === t)?.icon || '📍';

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-24">
      <header className="bg-gray-800 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="text-blue-400">← Back</Link>
          <h1 className="text-xl font-bold">📍 Locations</h1>
          <button onClick={() => setShowAdd(true)} className="bg-green-600 px-3 py-1 rounded">+ Add</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab('nearby')} className={'px-4 py-2 rounded-full ' + (tab === 'nearby' ? 'bg-purple-600' : 'bg-gray-700')}>📍 Nearby</button>
          <button onClick={() => setTab('search')} className={'px-4 py-2 rounded-full ' + (tab === 'search' ? 'bg-purple-600' : 'bg-gray-700')}>🔍 Search</button>
        </div>

        {tab === 'search' && (
          <input type="text" placeholder="Search by name or city..." value={search} onChange={e => setSearch(e.target.value)} onKeyUp={e => e.key === 'Enter' && loadSearch()} className="w-full bg-gray-800 p-3 rounded-xl mb-4" />
        )}

        <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
          <button onClick={() => setFilterType(null)} className={'px-3 py-1 rounded-full whitespace-nowrap ' + (!filterType ? 'bg-purple-600' : 'bg-gray-700')}>All</button>
          {TYPES.map(t => (
            <button key={t.id} onClick={() => setFilterType(t.id)} className={'px-3 py-1 rounded-full whitespace-nowrap ' + (filterType === t.id ? 'bg-purple-600' : 'bg-gray-700')}>{t.icon} {t.name}</button>
          ))}
        </div>

        {/* Upcoming Hangouts Section */}
        {tab === 'nearby' && (
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3">Upcoming Hangouts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <HangoutCard
                title="Morning Leg Day"
                location="Iron Fitness Gym, Downtown"
                time="Tomorrow, 7:00 AM"
                status="upcoming"
                participantCount={5}
                participants={[
                  { initials: 'JD', color: 'from-purple-500 to-pink-500' },
                  { initials: 'MK', color: 'from-blue-500 to-cyan-500' },
                ]}
                icon="🏋️"
                onJoin={() => console.log('Joining hangout')}
              />
              <HangoutCard
                title="CrossFit WOD"
                location="CrossFit Box, Midtown"
                time="Saturday, 9:00 AM"
                status="upcoming"
                participantCount={8}
                participants={[
                  { initials: 'TR', color: 'from-green-500 to-emerald-500' },
                  { initials: 'AK', color: 'from-yellow-500 to-orange-500' },
                ]}
                icon="⚡"
                onJoin={() => console.log('Joining hangout')}
              />
            </div>
          </div>
        )}

        {loading ? <div className="text-center py-8">Loading...</div> : (
          <div className="space-y-3">
            {locations.length === 0 && <div className="text-center text-gray-400 py-8">{tab === 'nearby' && !userLoc ? 'Enable location to see nearby spots' : 'No locations found'}</div>}
            {locations.map(l => (
              <div key={l.id} onClick={() => loadDetails(l.id)} className={'bg-gray-800 rounded-2xl p-4 cursor-pointer hover:bg-gray-700 ' + (selected === l.id ? 'ring-2 ring-purple-500' : '')}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getTypeIcon(l.type)}</span>
                      <span className="font-bold">{l.name}</span>
                    </div>
                    <div className="text-sm text-gray-400">{l.city}</div>
                  </div>
                  {l.avg_rating && <div className="text-yellow-400">⭐ {Number(l.avg_rating).toFixed(1)}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {details && selected && (
          <div className="mt-6 bg-gray-800 rounded-2xl p-4">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">{details.location?.name}</h2>
              <button onClick={() => { setSelected(null); setDetails(null); }} className="text-gray-400">✕</button>
            </div>
            
            {details.ratings && (
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="bg-gray-700 p-2 rounded text-center">
                  <div className="text-yellow-400 font-bold">{details.ratings.avg_rating?.toFixed(1) || '-'}</div>
                  <div className="text-xs text-gray-400">Rating</div>
                </div>
                <div className="bg-gray-700 p-2 rounded text-center">
                  <div className="text-green-400 font-bold">{details.ratings.avg_safety?.toFixed(1) || '-'}</div>
                  <div className="text-xs text-gray-400">Safety</div>
                </div>
                <div className="bg-gray-700 p-2 rounded text-center">
                  <div className="text-orange-400 font-bold">{details.ratings.avg_crowd?.toFixed(1) || '-'}</div>
                  <div className="text-xs text-gray-400">Crowd</div>
                </div>
                <div className="bg-gray-700 p-2 rounded text-center">
                  <div className="text-blue-400 font-bold">{details.ratings.avg_clean?.toFixed(1) || '-'}</div>
                  <div className="text-xs text-gray-400">Clean</div>
                </div>
              </div>
            )}

            {details.amenities?.length > 0 && (
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-2">Amenities</div>
                <div className="flex flex-wrap gap-2">
                  {details.amenities.map(a => (
                    <span key={a.amenity} className="bg-gray-600 px-2 py-1 rounded text-sm">{a.amenity}</span>
                  ))}
                </div>
              </div>
            )}

            {details.comments?.length > 0 && (
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-2">Tips & Reviews</div>
                {details.comments.map(c => (
                  <div key={c.id} className="bg-gray-700 p-3 rounded-xl mb-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">{c.username || 'Anon'}</span>
                      <div className="flex gap-2 items-center">
                        <button onClick={() => voteComment(c.id, 1)} className="text-green-400">▲</button>
                        <span>{c.upvotes}</span>
                        <button onClick={() => voteComment(c.id, -1)} className="text-red-400">▼</button>
                      </div>
                    </div>
                    <div className="mt-1">{c.comment}</div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => setShowRate(true)} className="w-full bg-purple-600 py-3 rounded-xl font-bold">⭐ Rate This Spot</button>
          </div>
        )}
      </main>

      {showAdd && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Location</h2>
            <input placeholder="Name" value={newLoc.name} onChange={e => setNewLoc({ ...newLoc, name: e.target.value })} className="w-full bg-gray-700 p-3 rounded-xl mb-3" />
            <input placeholder="City" value={newLoc.city} onChange={e => setNewLoc({ ...newLoc, city: e.target.value })} className="w-full bg-gray-700 p-3 rounded-xl mb-3" />
            <select value={newLoc.type} onChange={e => setNewLoc({ ...newLoc, type: e.target.value })} className="w-full bg-gray-700 p-3 rounded-xl mb-3">
              {TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
            </select>
            <textarea placeholder="Description" value={newLoc.description} onChange={e => setNewLoc({ ...newLoc, description: e.target.value })} className="w-full bg-gray-700 p-3 rounded-xl mb-3 h-20" />
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 bg-gray-600 py-3 rounded-xl">Cancel</button>
              <button onClick={addLocation} className="flex-1 bg-green-600 py-3 rounded-xl font-bold">Add</button>
            </div>
          </div>
        </div>
      )}

      {showRate && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Rate This Spot</h2>
            {['rating', 'safety_rating', 'crowd_level', 'cleanliness'].map(f => (
              <div key={f} className="mb-3">
                <label className="text-sm text-gray-400 capitalize">{f.replace('_', ' ')}</label>
                <input type="range" min="1" max="5" value={rating[f]} onChange={e => setRating({ ...rating, [f]: Number(e.target.value) })} className="w-full" />
                <div className="text-center">{rating[f]} / 5</div>
              </div>
            ))}
            <textarea placeholder="Add a tip or comment..." value={rating.comment} onChange={e => setRating({ ...rating, comment: e.target.value })} className="w-full bg-gray-700 p-3 rounded-xl mb-3 h-20" />
            <div className="flex gap-3">
              <button onClick={() => setShowRate(false)} className="flex-1 bg-gray-600 py-3 rounded-xl">Cancel</button>
              <button onClick={submitRating} className="flex-1 bg-purple-600 py-3 rounded-xl font-bold">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
