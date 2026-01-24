import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import { HangoutCard } from '../components/social';
import {
  NEARBY_LOCATIONS_QUERY,
  SEARCH_LOCATIONS_QUERY,
  LOCATION_DETAILS_QUERY,
  CREATE_LOCATION_MUTATION,
  RATE_LOCATION_MUTATION,
  VOTE_LOCATION_COMMENT_MUTATION,
} from '../graphql';

// Types
interface LocationItem {
  id: string;
  name: string;
  type: string;
  city: string;
  description?: string;
  lat?: number;
  lng?: number;
  avgRating?: number;
  ratingCount?: number;
  distance?: number;
  createdAt?: string;
}

interface LocationRatings {
  avgRating?: number;
  avgSafety?: number;
  avgCrowd?: number;
  avgClean?: number;
  totalRatings?: number;
}

interface LocationAmenity {
  amenity: string;
  count: number;
}

interface LocationComment {
  id: string;
  userId: string;
  username?: string;
  comment: string;
  upvotes: number;
  createdAt: string;
}

interface LocationDetails {
  location: LocationItem;
  ratings?: LocationRatings;
  amenities?: LocationAmenity[];
  comments?: LocationComment[];
}

interface UserLocation {
  lat: number;
  lng: number;
}

interface NewLocationForm {
  name: string;
  type: string;
  city: string;
  description: string;
}

interface RatingForm {
  rating: number;
  safety_rating: number;
  crowd_level: number;
  cleanliness: number;
  comment: string;
}

interface LocationType {
  id: string;
  name: string;
  icon: string;
}

const TYPES: LocationType[] = [
  { id: 'gym', name: 'Gym', icon: '🏋️' },
  { id: 'park', name: 'Park', icon: '🌳' },
  { id: 'outdoor', name: 'Outdoor', icon: '🌄' },
  { id: 'studio', name: 'Studio', icon: '🧘' },
  { id: 'home', name: 'Home', icon: '🏠' },
];

export default function Locations() {
  const [tab, setTab] = useState('nearby');
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [userLoc, setUserLoc] = useState<UserLocation | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newLoc, setNewLoc] = useState<NewLocationForm>({ name: '', type: 'gym', city: '', description: '' });
  const [showRate, setShowRate] = useState(false);
  const [rating, setRating] = useState<RatingForm>({ rating: 5, safety_rating: 5, crowd_level: 3, cleanliness: 5, comment: '' });

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // Geo denied
      );
    }
  }, []);

  // GraphQL queries
  const { data: nearbyData, loading: nearbyLoading, refetch: refetchNearby } = useQuery<{ nearbyLocations: LocationItem[] }>(
    NEARBY_LOCATIONS_QUERY,
    {
      variables: {
        lat: userLoc?.lat || 0,
        lng: userLoc?.lng || 0,
        type: filterType,
        limit: 50,
      },
      skip: tab !== 'nearby' || !userLoc,
      fetchPolicy: 'cache-and-network',
    }
  );

  const [searchLocations, { data: searchData, loading: searchLoading }] = useLazyQuery<{ searchLocations: LocationItem[] }>(
    SEARCH_LOCATIONS_QUERY,
    { fetchPolicy: 'cache-and-network' }
  );

  const [getLocationDetails, { data: detailsData }] = useLazyQuery<{ location: LocationDetails }>(
    LOCATION_DETAILS_QUERY,
    { fetchPolicy: 'cache-and-network' }
  );

  // GraphQL mutations
  const [createLocationMutation] = useMutation(CREATE_LOCATION_MUTATION, {
    onCompleted: () => {
      setShowAdd(false);
      setNewLoc({ name: '', type: 'gym', city: '', description: '' });
      if (tab === 'search') {
        loadSearch();
      } else if (userLoc) {
        refetchNearby();
      }
    },
    onError: (err) => {
      console.error('Failed to create location:', err);
      alert('Failed to create location: ' + err.message);
    },
  });

  const [rateLocationMutation] = useMutation(RATE_LOCATION_MUTATION, {
    onCompleted: () => {
      setShowRate(false);
      if (selected) {
        getLocationDetails({ variables: { id: selected } });
      }
    },
    onError: (err) => {
      console.error('Failed to rate location:', err);
      alert('Failed to submit rating: ' + err.message);
    },
  });

  const [voteCommentMutation] = useMutation(VOTE_LOCATION_COMMENT_MUTATION, {
    onCompleted: () => {
      if (selected) {
        getLocationDetails({ variables: { id: selected } });
      }
    },
    onError: (err) => {
      console.error('Failed to vote:', err);
    },
  });

  // Extract data from queries
  const locations = useMemo(() => {
    if (tab === 'nearby') {
      return nearbyData?.nearbyLocations || [];
    }
    return searchData?.searchLocations || [];
  }, [tab, nearbyData, searchData]);

  const details = useMemo(() => detailsData?.location || null, [detailsData]);
  const loading = tab === 'nearby' ? nearbyLoading : searchLoading;

  // Handlers
  const loadSearch = useCallback(() => {
    searchLocations({
      variables: {
        query: search,
        type: filterType,
        limit: 50,
      },
    });
  }, [search, filterType, searchLocations]);

  useEffect(() => {
    if (tab === 'search' && search) {
      loadSearch();
    }
  }, [tab, filterType, loadSearch, search]);

  const loadDetails = useCallback((id: string) => {
    getLocationDetails({ variables: { id } });
    setSelected(id);
  }, [getLocationDetails]);

  const addLocation = useCallback(() => {
    if (!newLoc.name) {
      alert('Name required');
      return;
    }
    createLocationMutation({
      variables: {
        input: {
          name: newLoc.name,
          type: newLoc.type,
          city: newLoc.city,
          description: newLoc.description,
          lat: userLoc?.lat,
          lng: userLoc?.lng,
        },
      },
    });
  }, [newLoc, userLoc, createLocationMutation]);

  const submitRating = useCallback(() => {
    if (!selected) return;
    rateLocationMutation({
      variables: {
        locationId: selected,
        input: {
          rating: rating.rating,
          safetyRating: rating.safety_rating,
          crowdLevel: rating.crowd_level,
          cleanliness: rating.cleanliness,
          comment: rating.comment || undefined,
        },
      },
    });
  }, [selected, rating, rateLocationMutation]);

  const voteComment = useCallback((commentId: string, vote: number) => {
    voteCommentMutation({
      variables: {
        commentId,
        vote,
      },
    });
  }, [voteCommentMutation]);

  const getTypeIcon = (t: string) => TYPES.find(x => x.id === t)?.icon || '📍';

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
          <input
            type="text"
            placeholder="Search by name or city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyUp={e => e.key === 'Enter' && loadSearch()}
            className="w-full bg-gray-800 p-3 rounded-xl mb-4"
          />
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
                hangout={{
                  id: 'demo-1',
                  name: 'Morning Leg Day',
                  location: 'Iron Fitness Gym, Downtown',
                  distance: '0.5 mi',
                  members: 5,
                  activity: 'Strength Training',
                  time: 'Tomorrow, 7:00 AM',
                  memberAvatars: ['JD', 'MK'],
                }}
                onJoin={() => {}}
              />
              <HangoutCard
                hangout={{
                  id: 'demo-2',
                  name: 'CrossFit WOD',
                  location: 'CrossFit Box, Midtown',
                  distance: '1.2 mi',
                  members: 8,
                  activity: 'CrossFit',
                  time: 'Saturday, 9:00 AM',
                  memberAvatars: ['TR', 'AK'],
                }}
                onJoin={() => {}}
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
                  {l.avgRating && <div className="text-yellow-400">⭐ {Number(l.avgRating).toFixed(1)}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {details && selected && (
          <div className="mt-6 bg-gray-800 rounded-2xl p-4">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">{details.location?.name}</h2>
              <button onClick={() => { setSelected(null); }} className="text-gray-400">✕</button>
            </div>

            {details.ratings && (
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="bg-gray-700 p-2 rounded text-center">
                  <div className="text-yellow-400 font-bold">{details.ratings.avgRating?.toFixed(1) || '-'}</div>
                  <div className="text-xs text-gray-400">Rating</div>
                </div>
                <div className="bg-gray-700 p-2 rounded text-center">
                  <div className="text-green-400 font-bold">{details.ratings.avgSafety?.toFixed(1) || '-'}</div>
                  <div className="text-xs text-gray-400">Safety</div>
                </div>
                <div className="bg-gray-700 p-2 rounded text-center">
                  <div className="text-orange-400 font-bold">{details.ratings.avgCrowd?.toFixed(1) || '-'}</div>
                  <div className="text-xs text-gray-400">Crowd</div>
                </div>
                <div className="bg-gray-700 p-2 rounded text-center">
                  <div className="text-blue-400 font-bold">{details.ratings.avgClean?.toFixed(1) || '-'}</div>
                  <div className="text-xs text-gray-400">Clean</div>
                </div>
              </div>
            )}

            {details.amenities && details.amenities.length > 0 && (
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-2">Amenities</div>
                <div className="flex flex-wrap gap-2">
                  {details.amenities.map(a => (
                    <span key={a.amenity} className="bg-gray-600 px-2 py-1 rounded text-sm">{a.amenity}</span>
                  ))}
                </div>
              </div>
            )}

            {details.comments && details.comments.length > 0 && (
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
            {(['rating', 'safety_rating', 'crowd_level', 'cleanliness'] as const).map(f => (
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
