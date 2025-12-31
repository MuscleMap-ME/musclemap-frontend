/**
 * NewConversation Component
 *
 * Modal/form for starting a new conversation.
 */

import { useState } from 'react';
import { authFetch } from '../../utils/auth';

export default function NewConversation({ onCreated, onCancel }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  async function searchUsers(query) {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      // Note: This endpoint would need to be implemented
      const res = await authFetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        // Fallback: just show the query as a user ID input
        setSearchResults([]);
        return;
      }
      const { data } = await res.json();
      setSearchResults(data || []);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  function handleSearchChange(e) {
    const value = e.target.value;
    setSearchQuery(value);
    // Debounce search
    const timeout = setTimeout(() => searchUsers(value), 300);
    return () => clearTimeout(timeout);
  }

  function addUser(user) {
    if (selectedUsers.some(u => u.id === user.id)) return;
    setSelectedUsers([...selectedUsers, user]);
    setSearchQuery('');
    setSearchResults([]);

    // Auto-enable group mode if more than 1 user selected
    if (selectedUsers.length >= 1) {
      setIsGroup(true);
    }
  }

  function removeUser(userId) {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
    // Disable group mode if only 1 user left
    if (selectedUsers.length <= 2) {
      setIsGroup(false);
      setGroupName('');
    }
  }

  async function handleCreate() {
    if (selectedUsers.length === 0) {
      setError('Please select at least one user');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const body = {
        type: isGroup ? 'group' : 'direct',
        participantIds: selectedUsers.map(u => u.id),
      };

      if (isGroup && groupName.trim()) {
        body.name = groupName.trim();
      }

      const res = await authFetch('/api/messaging/conversations', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Failed to create conversation');
      }

      const { data } = await res.json();
      onCreated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // For now, allow entering user IDs directly since user search isn't implemented
  function handleAddById() {
    if (!searchQuery.trim()) return;

    // Create a temporary user object from the ID
    const userId = searchQuery.trim();
    if (selectedUsers.some(u => u.id === userId)) {
      setError('User already added');
      return;
    }

    addUser({
      id: userId,
      username: userId.replace('user_', '').slice(0, 8) + '...',
      displayName: null,
    });
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">New Conversation</h2>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-700 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Selected users */}
      {selectedUsers.length > 0 && (
        <div className="mb-4">
          <label className="text-sm text-gray-400 mb-2 block">Selected:</label>
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map(user => (
              <span
                key={user.id}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-full text-sm"
              >
                {user.displayName || user.username}
                <button
                  onClick={() => removeUser(user.id)}
                  className="hover:text-red-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* User search/input */}
      <div className="mb-4">
        <label className="text-sm text-gray-400 mb-2 block">Add user by ID:</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Enter user ID..."
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddById}
            disabled={!searchQuery.trim()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 disabled:opacity-50"
          >
            Add
          </button>
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="mt-2 bg-gray-700 rounded-lg overflow-hidden">
            {searchResults.map(user => (
              <button
                key={user.id}
                onClick={() => addUser(user)}
                className="w-full px-4 py-2 text-left hover:bg-gray-600"
              >
                <span className="text-white">{user.displayName || user.username}</span>
                <span className="text-gray-400 text-sm ml-2">@{user.username}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Group options */}
      {selectedUsers.length > 1 && (
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <input
              type="checkbox"
              checked={isGroup}
              onChange={(e) => setIsGroup(e.target.checked)}
              className="rounded bg-gray-700 border-gray-600"
            />
            Create as group chat
          </label>

          {isGroup && (
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name (optional)"
              className="w-full mt-2 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
      )}

      {/* Create button */}
      <button
        onClick={handleCreate}
        disabled={selectedUsers.length === 0 || loading}
        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating...' : 'Start Conversation'}
      </button>
    </div>
  );
}
