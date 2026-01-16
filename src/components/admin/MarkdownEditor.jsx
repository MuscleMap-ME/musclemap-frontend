/**
 * Markdown Editor Panel
 *
 * A file browser and editor for managing markdown documentation:
 * - File tree navigation for docs/ and docs-plain/ directories
 * - Markdown editor with syntax highlighting
 * - Live preview with rendered markdown
 * - Search across all documentation
 * - Create, edit, and delete files
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  Eye,
  File,
  FileText,
  Folder,
  FolderOpen,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import GlassSurface from '../glass/GlassSurface';

// ============================================
// CONSTANTS
// ============================================

const API_BASE = '/api';

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Simple markdown to HTML converter (basic support)
function renderMarkdown(text) {
  if (!text) return '';

  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-white mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-white mt-6 mb-3">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-white mt-6 mb-4">$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-black/40 rounded-lg p-3 my-3 overflow-x-auto"><code class="text-green-400 text-sm">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-white/10 text-cyan-400 px-1 py-0.5 rounded text-sm">$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-cyan-400 hover:underline" target="_blank" rel="noopener">$1</a>')
    // Lists
    .replace(/^\s*[-*] (.*$)/gm, '<li class="ml-4 text-gray-300">$1</li>')
    .replace(/^\s*\d+\. (.*$)/gm, '<li class="ml-4 text-gray-300 list-decimal">$1</li>')
    // Blockquotes
    .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-cyan-500 pl-4 my-2 text-gray-400 italic">$1</blockquote>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="border-white/20 my-4" />')
    // Tables (basic)
    .replace(/^\|(.+)\|$/gm, (match, content) => {
      const cells = content.split('|').map(c => c.trim());
      const isHeader = cells.some(c => c.startsWith('---'));
      if (isHeader) return '';
      return '<tr>' + cells.map(c => `<td class="border border-white/20 px-3 py-2 text-gray-300">${c}</td>`).join('') + '</tr>';
    })
    // Line breaks
    .replace(/\n\n/g, '</p><p class="text-gray-300 my-2">')
    .replace(/\n/g, '<br />');

  return `<div class="prose prose-invert max-w-none"><p class="text-gray-300 my-2">${html}</p></div>`;
}

// ============================================
// SUBCOMPONENTS
// ============================================

function FileTreeItem({ item, onSelect, selectedFile, onRefresh, level = 0 }) {
  const [expanded, setExpanded] = useState(level < 2);
  const isSelected = selectedFile?.relativePath === item.relativePath;

  const handleClick = () => {
    if (item.isDirectory) {
      setExpanded(!expanded);
    } else {
      onSelect(item);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={`
          w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors
          ${isSelected ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-white/5 text-gray-300'}
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {item.isDirectory ? (
          <>
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
            )}
            {expanded ? (
              <FolderOpen className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            )}
          </>
        ) : (
          <>
            <span className="w-4" />
            <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
          </>
        )}
        <span className="truncate flex-1">{item.name}</span>
        {!item.isDirectory && item.size && (
          <span className="text-xs text-gray-500 flex-shrink-0">{formatBytes(item.size)}</span>
        )}
      </button>
      {item.isDirectory && expanded && item.children && (
        <div>
          {item.children.map((child) => (
            <FileTreeItem
              key={child.relativePath}
              item={child}
              onSelect={onSelect}
              selectedFile={selectedFile}
              onRefresh={onRefresh}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SearchResults({ results, onSelect, onClose: _onClose }) {
  if (!results || results.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400">
        No results found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {results.map((result, idx) => (
        <button
          key={`${result.relativePath}-${idx}`}
          onClick={() => onSelect({ relativePath: result.relativePath, name: result.file }, result.directory)}
          className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">{result.file}</span>
            <span className="text-xs text-gray-500">({result.directory})</span>
          </div>
          <div className="text-xs text-gray-400 truncate">{result.relativePath}</div>
          {result.matches.slice(0, 2).map((match, mIdx) => (
            <div key={mIdx} className="mt-1 text-xs text-gray-500">
              <span className="text-gray-600">L{match.line}:</span>{' '}
              <span dangerouslySetInnerHTML={{ __html: match.highlight.replace(/\*\*(.*?)\*\*/g, '<span class="text-cyan-400 font-medium">$1</span>') }} />
            </div>
          ))}
        </button>
      ))}
    </div>
  );
}

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, danger }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/10 rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          {danger && <AlertTriangle className="w-6 h-6 text-red-400" />}
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <p className="text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg transition-colors ${
              danger
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400'
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function NewFileModal({ isOpen, onClose, onSubmit, directory }) {
  const [fileName, setFileName] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [isFolder, setIsFolder] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isFolder) {
      onSubmit({ type: 'folder', path: folderPath || fileName });
    } else {
      const fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;
      const finalPath = fullPath.endsWith('.md') ? fullPath : `${fullPath}.md`;
      onSubmit({ type: 'file', path: finalPath });
    }
    setFileName('');
    setFolderPath('');
    setIsFolder(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/10 rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {isFolder ? 'New Folder' : 'New File'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setIsFolder(false)}
                className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                  !isFolder ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-400'
                }`}
              >
                <File className="w-4 h-4 inline mr-2" />
                File
              </button>
              <button
                type="button"
                onClick={() => setIsFolder(true)}
                className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                  isFolder ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-400'
                }`}
              >
                <Folder className="w-4 h-4 inline mr-2" />
                Folder
              </button>
            </div>
          </div>

          {!isFolder && (
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Folder (optional)</label>
              <input
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="e.g., guides/advanced"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-1">
              {isFolder ? 'Folder Name' : 'File Name'}
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder={isFolder ? 'e.g., guides' : 'e.g., README.md'}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
              required
            />
            {!isFolder && (
              <p className="text-xs text-gray-500 mt-1">
                Will create in: {directory}/{folderPath ? `${folderPath}/` : ''}{fileName || 'filename'}{fileName?.endsWith('.md') ? '' : '.md'}
              </p>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!fileName}
              className="px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 transition-colors disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function MarkdownEditor() {
  // State
  const [directory, setDirectory] = useState('docs');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [fileLoading, setFileLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('split'); // 'edit', 'preview', 'split'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [stats, setStats] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });
  const [toast, setToast] = useState(null);
  const editorRef = useRef(null);

  // Auth header
  const getAuthHeader = useCallback(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // Show toast notification
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Fetch file tree
  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/docs/list?directory=${directory}`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error('Failed to fetch files:', err);
    } finally {
      setLoading(false);
    }
  }, [directory, getAuthHeader]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/docs/stats`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [getAuthHeader]);

  // Load file content
  const loadFile = useCallback(async (file, dir = directory) => {
    setFileLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/admin/docs/file?filePath=${encodeURIComponent(file.relativePath)}&directory=${dir}`,
        { headers: getAuthHeader() }
      );
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content);
        setOriginalContent(data.content);
        setSelectedFile({ ...file, directory: dir, ...data });
      }
    } catch (err) {
      console.error('Failed to load file:', err);
      showToast('Failed to load file', 'error');
    } finally {
      setFileLoading(false);
    }
  }, [directory, getAuthHeader, showToast]);

  // Save file
  const saveFile = useCallback(async () => {
    if (!selectedFile) return;
    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE}/admin/docs/file?directory=${selectedFile.directory || directory}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
          },
          body: JSON.stringify({
            filePath: selectedFile.relativePath,
            content: fileContent,
          }),
        }
      );
      if (res.ok) {
        setOriginalContent(fileContent);
        showToast('File saved successfully');
        fetchFiles();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save', 'error');
      }
    } catch (err) {
      console.error('Failed to save:', err);
      showToast('Failed to save file', 'error');
    } finally {
      setSaving(false);
    }
  }, [selectedFile, fileContent, directory, getAuthHeader, showToast, fetchFiles]);

  // Delete file
  const deleteFile = useCallback(async () => {
    if (!selectedFile) return;
    try {
      const res = await fetch(
        `${API_BASE}/admin/docs/file?filePath=${encodeURIComponent(selectedFile.relativePath)}&directory=${selectedFile.directory || directory}`,
        {
          method: 'DELETE',
          headers: getAuthHeader(),
        }
      );
      if (res.ok) {
        showToast('File deleted');
        setSelectedFile(null);
        setFileContent('');
        setOriginalContent('');
        fetchFiles();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to delete', 'error');
      }
    } catch (err) {
      console.error('Failed to delete:', err);
      showToast('Failed to delete file', 'error');
    }
    setConfirmModal({ isOpen: false });
  }, [selectedFile, directory, getAuthHeader, showToast, fetchFiles]);

  // Create new file/folder
  const createNew = useCallback(async ({ type, path }) => {
    try {
      const endpoint = type === 'folder' ? '/admin/docs/folder' : '/admin/docs/file';
      const body = type === 'folder'
        ? { folderPath: path }
        : { filePath: path, content: `# ${path.split('/').pop().replace('.md', '')}\n\nStart writing here...\n` };

      const res = await fetch(`${API_BASE}${endpoint}?directory=${directory}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showToast(`${type === 'folder' ? 'Folder' : 'File'} created`);
        fetchFiles();
        if (type === 'file') {
          // Auto-select the new file
          setTimeout(() => {
            loadFile({ relativePath: path, name: path.split('/').pop() });
          }, 500);
        }
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to create', 'error');
      }
    } catch (err) {
      console.error('Failed to create:', err);
      showToast('Failed to create', 'error');
    }
    setShowNewModal(false);
  }, [directory, getAuthHeader, showToast, fetchFiles, loadFile]);

  // Search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `${API_BASE}/admin/docs/search?query=${encodeURIComponent(searchQuery)}&directory=all`,
        { headers: getAuthHeader() }
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, getAuthHeader]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges) {
          saveFile();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveFile, hasUnsavedChanges]);

  // Initial load
  useEffect(() => {
    fetchFiles();
    fetchStats();
  }, [fetchFiles, fetchStats]);

  // Reload files when directory changes
  useEffect(() => {
    fetchFiles();
  }, [directory, fetchFiles]);

  const hasUnsavedChanges = fileContent !== originalContent;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-cyan-400" />
            Documentation Editor
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Browse and edit markdown files in docs/ and docs-plain/
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
            title="Search (Cmd+F)"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={fetchFiles}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <GlassSurface className="p-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search in documentation..."
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                autoFocus
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className="px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 transition-colors disabled:opacity-50"
            >
              {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
            </button>
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchResults(null);
                setSearchQuery('');
              }}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {searchResults && (
            <div className="mt-4 max-h-64 overflow-auto">
              <SearchResults
                results={searchResults}
                onSelect={(file, dir) => {
                  loadFile(file, dir);
                  setShowSearch(false);
                  setSearchResults(null);
                }}
                onClose={() => setSearchResults(null)}
              />
            </div>
          )}
        </GlassSurface>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <GlassSurface className="p-3">
            <div className="text-xs text-gray-400">docs/ Files</div>
            <div className="text-xl font-bold text-white">{stats.docs?.files || 0}</div>
          </GlassSurface>
          <GlassSurface className="p-3">
            <div className="text-xs text-gray-400">docs/ Size</div>
            <div className="text-xl font-bold text-white">{formatBytes(stats.docs?.totalSize || 0)}</div>
          </GlassSurface>
          <GlassSurface className="p-3">
            <div className="text-xs text-gray-400">docs-plain/ Files</div>
            <div className="text-xl font-bold text-white">{stats.docsPlain?.files || 0}</div>
          </GlassSurface>
          <GlassSurface className="p-3">
            <div className="text-xs text-gray-400">docs-plain/ Size</div>
            <div className="text-xl font-bold text-white">{formatBytes(stats.docsPlain?.totalSize || 0)}</div>
          </GlassSurface>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ minHeight: '600px' }}>
        {/* File Tree Sidebar */}
        <GlassSurface className="p-4 lg:col-span-1 overflow-hidden flex flex-col">
          {/* Directory Tabs */}
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setDirectory('docs')}
              className={`flex-1 py-1.5 px-2 rounded text-sm transition-colors ${
                directory === 'docs' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              docs/
            </button>
            <button
              onClick={() => setDirectory('docs-plain')}
              className={`flex-1 py-1.5 px-2 rounded text-sm transition-colors ${
                directory === 'docs-plain' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              docs-plain/
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setShowNewModal(true)}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
          </div>

          {/* File Tree */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : files.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No files found</p>
              </div>
            ) : (
              files.map((file) => (
                <FileTreeItem
                  key={file.relativePath}
                  item={file}
                  onSelect={(f) => loadFile(f)}
                  selectedFile={selectedFile}
                  onRefresh={fetchFiles}
                />
              ))
            )}
          </div>
        </GlassSurface>

        {/* Editor/Preview */}
        <GlassSurface className="p-4 lg:col-span-3 overflow-hidden flex flex-col">
          {selectedFile ? (
            <>
              {/* File Header */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <span className="font-medium text-white truncate">{selectedFile.relativePath}</span>
                  {hasUnsavedChanges && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded flex-shrink-0">
                      Unsaved
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* View Mode Toggle */}
                  <div className="flex bg-white/5 rounded-lg p-0.5">
                    <button
                      onClick={() => setViewMode('edit')}
                      className={`p-1.5 rounded ${viewMode === 'edit' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400'}`}
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('split')}
                      className={`p-1.5 rounded ${viewMode === 'split' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400'}`}
                      title="Split"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('preview')}
                      className={`p-1.5 rounded ${viewMode === 'preview' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400'}`}
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={saveFile}
                    disabled={!hasUnsavedChanges || saving}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm transition-colors disabled:opacity-50"
                    title="Save (Cmd+S)"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob([fileContent], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = selectedFile.name;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmModal({
                      isOpen: true,
                      title: 'Delete File',
                      message: `Are you sure you want to delete "${selectedFile.name}"? This cannot be undone.`,
                      onConfirm: deleteFile,
                      danger: true,
                    })}
                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Editor Content */}
              <div className="flex-1 overflow-hidden">
                {fileLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                  </div>
                ) : (
                  <div className={`h-full grid ${viewMode === 'split' ? 'grid-cols-2 gap-4' : ''}`}>
                    {/* Editor */}
                    {(viewMode === 'edit' || viewMode === 'split') && (
                      <div className="h-full overflow-hidden flex flex-col">
                        {viewMode === 'split' && (
                          <div className="text-xs text-gray-500 mb-2 font-medium">EDITOR</div>
                        )}
                        <textarea
                          ref={editorRef}
                          value={fileContent}
                          onChange={(e) => setFileContent(e.target.value)}
                          className="flex-1 w-full bg-black/40 border border-white/10 rounded-lg p-4 text-gray-200 font-mono text-sm resize-none focus:outline-none focus:border-cyan-500/30"
                          spellCheck={false}
                        />
                      </div>
                    )}

                    {/* Preview */}
                    {(viewMode === 'preview' || viewMode === 'split') && (
                      <div className="h-full overflow-hidden flex flex-col">
                        {viewMode === 'split' && (
                          <div className="text-xs text-gray-500 mb-2 font-medium">PREVIEW</div>
                        )}
                        <div
                          className="flex-1 overflow-auto bg-black/20 border border-white/10 rounded-lg p-4"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(fileContent) }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10 text-xs text-gray-500">
                <span>Size: {formatBytes(selectedFile.size)}</span>
                <span>Modified: {formatDate(selectedFile.modifiedAt)}</span>
                <span>Lines: {fileContent.split('\n').length}</span>
                <span>Characters: {fileContent.length}</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <FileText className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg">Select a file to view or edit</p>
              <p className="text-sm mt-1">Use the file tree on the left</p>
            </div>
          )}
        </GlassSurface>
      </div>

      {/* Modals */}
      <NewFileModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSubmit={createNew}
        directory={directory}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false })}
        danger={confirmModal.danger}
      />

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        } text-white`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
