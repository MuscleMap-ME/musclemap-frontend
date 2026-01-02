import React, { useState, useEffect } from 'react';

const ADMIN_KEY = 'musclemap-admin-2024';

const api = async (path, opts = {}) => {
  const url = '/api/admin' + path + (path.includes('?') ? '&' : '?') + 'key=' + ADMIN_KEY;
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY, ...opts.headers }
  });
  return res.json();
};

export default function Admin() {
  const [tab, setTab] = useState('scripts');
  const [scripts, setScripts] = useState([]);
  const [output, setOutput] = useState('');
  const [logs, setLogs] = useState('');
  const [status, setStatus] = useState({});
  const [newScript, setNewScript] = useState({ name: '', content: '' });
  const [running, setRunning] = useState(null);

  useEffect(() => {
    api('/scripts').then(d => setScripts(d.scripts || []));
    api('/status').then(setStatus);
  }, []);

  const runScript = async (name) => {
    setRunning(name);
    setOutput('Running...');
    const res = await api('/scripts/run', { method: 'POST', body: JSON.stringify({ script: name }) });
    setOutput(res.output || res.error?.message || res.error || 'No output');
    setRunning(null);
  };

  const loadLogs = async (type) => {
    const res = await api('/logs?lines=100&type=' + (type || 'all'));
    setLogs(res.logs || 'No logs');
  };

  const uploadScript = async () => {
    if (!newScript.name || !newScript.content) { alert('Name and content required'); return; }
    const res = await api('/scripts/upload', { method: 'POST', body: JSON.stringify(newScript) });
    if (res.success) {
      alert('Uploaded!');
      setNewScript({ name: '', content: '' });
      api('/scripts').then(d => setScripts(d.scripts || []));
    } else {
      alert(res.error);
    }
  };

  const restart = async () => {
    if (!window.confirm('Restart server?')) return;
    await api('/restart', { method: 'POST' });
    alert('Restarting...');
    setTimeout(() => api('/status').then(setStatus), 3000);
  };

  const isOnline = status.status === 'online';

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <div className="flex gap-2 items-center">
            <span className={'px-3 py-1 rounded-full text-sm ' + (isOnline ? 'bg-green-600' : 'bg-red-600')}>
              {status.status || 'unknown'}
            </span>
            <button onClick={restart} className="bg-red-600 px-4 py-2 rounded">Restart</button>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {['scripts', 'logs', 'upload'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={'px-4 py-2 rounded capitalize ' + (tab === t ? 'bg-purple-600' : 'bg-gray-700')}>{t}</button>
          ))}
        </div>

        {tab === 'scripts' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-xl p-4">
              <h2 className="font-bold mb-4">Scripts</h2>
              <div className="space-y-2">
                {scripts.map(s => (
                  <div key={s.name} className="flex justify-between items-center bg-gray-700 p-3 rounded-lg">
                    <span>{s.name}</span>
                    <button onClick={() => runScript(s.name)} disabled={running === s.name} className="bg-green-600 px-4 py-1 rounded disabled:opacity-50">
                      {running === s.name ? '...' : 'Run'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-800 rounded-xl p-4">
              <h2 className="font-bold mb-4">Output</h2>
              <pre className="bg-black p-4 rounded-lg text-xs overflow-auto max-h-96 whitespace-pre-wrap">{output || 'Click a script to run'}</pre>
            </div>
          </div>
        )}

        {tab === 'logs' && (
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex gap-2 mb-4">
              <button onClick={() => loadLogs('all')} className="bg-blue-600 px-4 py-2 rounded">All Logs</button>
              <button onClick={() => loadLogs('error')} className="bg-red-600 px-4 py-2 rounded">Errors Only</button>
            </div>
            <pre className="bg-black p-4 rounded-lg text-xs overflow-auto max-h-screen whitespace-pre-wrap">{logs || 'Click to load logs'}</pre>
          </div>
        )}

        {tab === 'upload' && (
          <div className="bg-gray-800 rounded-xl p-4 max-w-xl">
            <h2 className="font-bold mb-4">Upload Script</h2>
            <input
              placeholder="script-name.sh"
              value={newScript.name}
              onChange={e => setNewScript({ ...newScript, name: e.target.value })}
              className="w-full bg-gray-700 p-3 rounded mb-4"
            />
            <textarea
              placeholder="#!/bin/bash"
              value={newScript.content}
              onChange={e => setNewScript({ ...newScript, content: e.target.value })}
              className="w-full bg-gray-700 p-3 rounded h-64 font-mono text-sm mb-4"
            />
            <button onClick={uploadScript} className="bg-green-600 px-6 py-2 rounded font-bold">Upload</button>
          </div>
        )}
      </div>
    </div>
  );
}
