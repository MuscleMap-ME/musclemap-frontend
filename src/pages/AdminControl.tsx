import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// motion available for future animations
// import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { format } from 'date-fns';
import { useAuth } from '../store/authStore';

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  Users: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>,
  Group: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>,
  Credit: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Pipeline: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/></svg>,
  Script: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>,
  Shield: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
  Alert: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
  Audit: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>,
  Chart: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
  Play: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg>,
  Pause: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6"/></svg>,
  Stop: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>,
  Refresh: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>,
};

const SCOPES = ['LIVE', 'SANDBOX'];

const sections = [
  { id: 'overview', label: 'Overview', icon: Icons.Chart },
  { id: 'users', label: 'Users', icon: Icons.Users },
  { id: 'groups', label: 'Groups', icon: Icons.Group },
  { id: 'credits', label: 'Credits', icon: Icons.Credit },
  { id: 'issues', label: 'Issues', icon: Icons.Alert, link: '/admin/issues' },
  { id: 'metrics', label: 'Metrics', icon: Icons.Chart, link: '/admin/metrics' },
  { id: 'monitoring', label: 'Monitoring', icon: Icons.Shield, link: '/admin/monitoring' },
  { id: 'pipelines', label: 'Pipelines', icon: Icons.Pipeline },
  { id: 'scripts', label: 'Scripts', icon: Icons.Script },
  { id: 'emergency', label: 'Emergency', icon: Icons.Alert },
  { id: 'audit', label: 'Audit Logs', icon: Icons.Audit },
];

export default function AdminControl() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [scope, setScope] = useState('LIVE');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({});
  const [emergencyStatus, setEmergencyStatus] = useState({});

  useEffect(() => {
    fetchEmergencyStatus();
    fetchSectionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, activeSection]);

  const fetchEmergencyStatus = async () => {
    try {
      const res = await fetch('/api/admin-control/emergency/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      // Backend returns flat object with maintenanceMode, readOnlyMode, etc.
      setEmergencyStatus(result || {});
    } catch {
      // Error occurred
    }
  };

  const fetchSectionData = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      switch (activeSection) {
        case 'users': endpoint = '/api/admin-control/users?limit=50'; break;
        case 'groups': endpoint = '/api/admin-control/groups'; break;
        case 'credits': endpoint = '/api/admin-control/audit/credits'; break;
        case 'pipelines': endpoint = '/api/admin-control/pipelines'; break;
        case 'scripts': endpoint = '/api/admin-control/scripts'; break;
        case 'audit': endpoint = '/api/admin-control/audit?limit=50'; break;
        default: endpoint = '/api/admin/metrics/realtime';
      }
      
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}`, 'X-Scope': scope }
      });
      const result = await res.json();
      setData(result);
    } catch {
      // Error occurred
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyAction = async (action) => {
    if (!confirm(`Are you sure you want to ${action}?`)) return;
    try {
      await fetch(`/api/admin-control/emergency/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEmergencyStatus();
    } catch {
      // Error occurred
    }
  };

  const handleUserAction = async (userId, action) => {
    if (!confirm(`${action} user ${userId}?`)) return;
    try {
      await fetch(`/api/admin-control/users/${userId}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'X-Scope': scope }
      });
      fetchSectionData();
    } catch {
      // Error occurred
    }
  };

  const StatusBadge = ({ active, labelOn, labelOff }) => (
    <span className={clsx(
      'px-2 py-1 text-xs font-medium rounded-full',
      active ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
    )}>
      {active ? labelOn : labelOff}
    </span>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }

    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">Total Requests</p>
                <p className="text-2xl font-bold">{data.requests?.total || 0}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">Requests/sec</p>
                <p className="text-2xl font-bold">{data.requests?.perSecond || 0}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">Avg Response</p>
                <p className="text-2xl font-bold">{(data.latency?.avg || 0).toFixed(1)}ms</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">Errors</p>
                <p className="text-2xl font-bold text-rose-400">{data.errors?.total || 0}</p>
              </div>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold mb-4">System Status</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <span>Credits</span>
                  <StatusBadge active={emergencyStatus.credits_frozen} labelOn="Frozen" labelOff="Active" />
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <span>Pipelines</span>
                  <StatusBadge active={emergencyStatus.pipelines_paused} labelOn="Paused" labelOff="Running" />
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <span>Scripts</span>
                  <StatusBadge active={emergencyStatus.scripts_paused} labelOn="Paused" labelOff="Running" />
                </div>
              </div>
            </div>
          </div>
        );

      case 'users': {
        // Backend returns { data: [...], total: N }
        const users = data.data || [];
        const total = data.total || 0;
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Users ({total})</h3>
              {scope === 'SANDBOX' && (
                <button className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-xl text-sm font-medium">
                  + Create Virtual User
                </button>
              )}
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-white/10">
                  <tr className="text-left text-sm text-gray-400">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Credits</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No users found</td>
                    </tr>
                  ) : (
                    users.slice(0, 20).map(user => (
                      <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3 text-sm font-mono text-gray-400">{user.id?.slice(0, 8)}...</td>
                        <td className="px-4 py-3 font-medium">{user.username}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{user.email}</td>
                        <td className="px-4 py-3">
                          {user.status === 'banned' ? (
                            <span className="px-2 py-0.5 text-xs bg-rose-500/20 text-rose-400 rounded-full">Banned</span>
                          ) : user.status === 'suspended' ? (
                            <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">Suspended</span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">Active</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {user.creditBalance || 0}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {user.status === 'banned' ? (
                              <button onClick={() => handleUserAction(user.id, 'unban')} className="text-xs text-emerald-400 hover:underline">Unban</button>
                            ) : (
                              <button onClick={() => handleUserAction(user.id, 'ban')} className="text-xs text-rose-400 hover:underline">Ban</button>
                            )}
                            <button onClick={() => handleUserAction(user.id, 'verify')} className="text-xs text-blue-400 hover:underline">
                              Verify
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'groups': {
        // Backend returns { data: [...] }
        const groups = data.data || [];
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Groups ({groups.length})</h3>
              <button className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-xl text-sm font-medium">
                + Create Group
              </button>
            </div>
            <div className="grid gap-4">
              {groups.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-gray-500">
                  No communities found
                </div>
              ) : (
                groups.map(group => (
                  <div key={group.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{group.name}</h4>
                      <span className="text-xs text-gray-500">ID: {group.id?.slice(0, 8)}...</span>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{group.description || 'No description'}</p>
                    <div className="flex gap-4 text-sm text-gray-400">
                      <span>Members: {group.memberCount || 0}</span>
                      <span>Created: {group.createdAt ? format(new Date(group.createdAt), 'MMM d, yyyy') : 'N/A'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      }

      case 'emergency':
        return (
          <div className="space-y-6">
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-5">
              <div className="flex items-center gap-2 text-rose-400 mb-2">
                <Icons.Alert />
                <span className="font-semibold">Emergency Controls</span>
              </div>
              <p className="text-sm text-gray-400 mb-4">These actions take effect immediately across the entire system.</p>
            </div>

            <div className="grid gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Maintenance Mode</h4>
                    <p className="text-sm text-gray-400">Block all non-admin requests (returns 503)</p>
                  </div>
                  <button
                    onClick={() => handleEmergencyAction(emergencyStatus.maintenanceMode ? 'maintenance-off' : 'maintenance-on')}
                    className={clsx(
                      'px-4 py-2 rounded-xl font-medium transition-all',
                      emergencyStatus.maintenanceMode
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-rose-600 hover:bg-rose-700'
                    )}
                  >
                    {emergencyStatus.maintenanceMode ? 'Disable Maintenance' : 'Enable Maintenance'}
                  </button>
                </div>
                {emergencyStatus.maintenanceMode && (
                  <div className="mt-3 p-3 bg-rose-500/10 rounded-lg text-sm">
                    <span className="text-rose-400 font-medium">ACTIVE</span>
                    {emergencyStatus.maintenanceStartedBy && (
                      <span className="text-gray-400 ml-2">Started by: {emergencyStatus.maintenanceStartedBy}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Read-Only Mode</h4>
                    <p className="text-sm text-gray-400">Block all write operations (POST/PUT/DELETE/PATCH)</p>
                  </div>
                  <button
                    onClick={() => handleEmergencyAction(emergencyStatus.readOnlyMode ? 'readonly-off' : 'readonly-on')}
                    className={clsx(
                      'px-4 py-2 rounded-xl font-medium transition-all',
                      emergencyStatus.readOnlyMode
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-amber-600 hover:bg-amber-700'
                    )}
                  >
                    {emergencyStatus.readOnlyMode ? 'Disable Read-Only' : 'Enable Read-Only'}
                  </button>
                </div>
                {emergencyStatus.readOnlyMode && (
                  <div className="mt-3 p-3 bg-amber-500/10 rounded-lg text-sm">
                    <span className="text-amber-400 font-medium">ACTIVE</span>
                    {emergencyStatus.readOnlyStartedBy && (
                      <span className="text-gray-400 ml-2">Started by: {emergencyStatus.readOnlyStartedBy}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h4 className="font-semibold mb-3">System Status</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span>Database</span>
                    <StatusBadge active={!emergencyStatus.databaseConnected} labelOn="Disconnected" labelOff="Connected" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span>Redis</span>
                    <StatusBadge active={!emergencyStatus.redisConnected} labelOn="Disconnected" labelOff="Connected" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'audit': {
        // Backend returns { data: [...] }
        const logs = data.data || [];
        return (
          <div className="space-y-4">
            <h3 className="font-semibold">Audit Logs ({logs.length})</h3>
            <div className="space-y-2">
              {logs.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-gray-500">
                  No audit logs found
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{log.action}</span>
                      <span className="text-xs text-gray-500">{log.createdAt ? format(new Date(log.createdAt), 'MMM d, HH:mm:ss') : 'N/A'}</span>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-400">
                      {log.userId && <span>User: {log.userId?.slice(0, 8)}...</span>}
                      {log.details && (
                        <span className="truncate max-w-xs">{typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      }

      case 'scripts': {
        // Backend returns { data: [...] }
        const scripts = data.data || [];
        return (
          <div className="space-y-4">
            <h3 className="font-semibold">Admin Scripts ({scripts.length})</h3>
            <div className="grid gap-4">
              {scripts.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-gray-500">
                  No scripts available
                </div>
              ) : (
                scripts.map(script => (
                  <div key={script.id} className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          <Icons.Script />
                          {script.name}
                        </h4>
                        <p className="text-sm text-gray-400 mt-1">{script.description}</p>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Run ${script.name}?`)) {
                            // Execute script via API
                            fetch(`/api/admin-control/scripts/${script.id}/run`, {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}` }
                            }).then(() => {
                              alert(`${script.name} executed successfully`);
                            }).catch(() => {
                              alert(`Failed to execute ${script.name}`);
                            });
                          }
                        }}
                        className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-xl text-sm font-medium flex items-center gap-2"
                      >
                        <Icons.Play />
                        Run
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      }

      case 'pipelines': {
        // Backend returns { data: [...] }
        const pipelines = data.data || [];
        return (
          <div className="space-y-4">
            <h3 className="font-semibold">Deployment Pipelines ({pipelines.length})</h3>
            <div className="space-y-2">
              {pipelines.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-gray-500">
                  No deployment logs found
                </div>
              ) : (
                pipelines.map(pipeline => (
                  <div key={pipeline.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{pipeline.name}</span>
                      <span className={clsx(
                        'px-2 py-0.5 text-xs rounded-full',
                        pipeline.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                        pipeline.status === 'failed' ? 'bg-rose-500/20 text-rose-400' :
                        pipeline.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      )}>
                        {pipeline.status}
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-400">
                      <span>Started: {pipeline.startedAt ? format(new Date(pipeline.startedAt), 'MMM d, HH:mm') : 'N/A'}</span>
                      {pipeline.completedAt && (
                        <span>Completed: {format(new Date(pipeline.completedAt), 'HH:mm')}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      }

      case 'credits': {
        // Backend returns { totalGifted, totalTransactions, recentTransactions }
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">Total Gifted</p>
                <p className="text-2xl font-bold">{data.totalGifted || 0}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">Total Transactions</p>
                <p className="text-2xl font-bold">{data.totalTransactions || 0}</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Recent Transactions</h3>
              <div className="space-y-2">
                {(data.recentTransactions || []).length === 0 ? (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-gray-500">
                    No transactions found
                  </div>
                ) : (
                  (data.recentTransactions || []).map(tx => (
                    <div key={tx.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{tx.action}</span>
                        <span className={clsx(
                          'font-mono',
                          tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                        )}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount}
                        </span>
                      </div>
                      <div className="flex gap-4 text-sm text-gray-400">
                        <span>User: {tx.userId?.slice(0, 8)}...</span>
                        <span>{tx.createdAt ? format(new Date(tx.createdAt), 'MMM d, HH:mm') : 'N/A'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      }

      default:
        return <div className="text-center py-20 text-gray-500">Section not implemented</div>;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-white/5">
              <Icons.Back />
            </Link>
            <div className="flex items-center gap-2">
              <Icons.Shield />
              <h1 className="text-xl font-semibold">Admin Control</h1>
            </div>
          </div>
          
          {/* Scope Selector */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
            {SCOPES.map(s => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={clsx(
                  'px-4 py-1.5 text-sm font-medium rounded-lg transition-all',
                  scope === s 
                    ? s === 'LIVE' ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-white/5 min-h-[calc(100vh-4rem)] p-4">
          <nav className="space-y-1">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => section.link ? navigate(section.link) : setActiveSection(section.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left',
                  activeSection === section.id
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                <section.icon />
                <span className="font-medium">{section.label}</span>
                {section.link && (
                  <svg className="w-3 h-3 ml-auto text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                  </svg>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-5xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold capitalize">{activeSection}</h2>
              <button onClick={fetchSectionData} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white">
                <Icons.Refresh />
              </button>
            </div>
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
