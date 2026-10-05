import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import api from '../../lib/api';

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: string;
  url: string;
  avatarUrl?: string;
}

interface SearchData {
  members: SearchResult[];
  tasks: SearchResult[];
  departments: SearchResult[];
  events: SearchResult[];
  meetings: SearchResult[];
  communication: SearchResult[];
}

const TYPE_COLORS: Record<string, string> = {
  MEMBER: 'rgba(0,240,255,0.15)',
  TASK: 'rgba(59,130,246,0.15)',
  DEPARTMENT: 'rgba(139,92,246,0.15)',
  EVENT: 'rgba(16,185,129,0.15)',
  MEETING: 'rgba(245,158,11,0.15)',
  COMMUNICATION: 'rgba(236,72,153,0.15)',
};

const TYPE_TEXT_COLORS: Record<string, string> = {
  MEMBER: 'var(--cyan)',
  TASK: '#60A5FA',
  DEPARTMENT: 'var(--violet)',
  EVENT: '#34D399',
  MEETING: '#FCD34D',
  COMMUNICATION: '#F9A8D4',
};

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: SearchData }>(`/system/search?q=${encodeURIComponent(q)}`);
      setResults(res.data);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, performSearch]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (url: string) => {
    navigate(url);
    setQuery('');
    setIsOpen(false);
    setResults(null);
  };

  const hasResults = results && Object.values(results).some(arr => arr.length > 0);
  const groups = results ? Object.entries(results).filter(([, arr]) => arr.length > 0) : [];

  return (
    <div ref={containerRef} className="search-container">
      <Search size={16} className="search-icon" />
      <input
        id="global-search-input"
        type="text"
        className="search-input"
        placeholder="Search members, tasks, events… (Ctrl+K)"
        value={query}
        onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        aria-label="Global search"
        aria-expanded={isOpen && !!hasResults}
        aria-haspopup="listbox"
      />
      {isOpen && query && (
        <div className="search-results" role="listbox">
          {loading && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Searching…
            </div>
          )}
          {!loading && !hasResults && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No results found for "<strong>{query}</strong>"
            </div>
          )}
          {!loading && hasResults && groups.map(([key, items]) => (
            <div key={key}>
              <div className="search-group-label">{key.charAt(0).toUpperCase() + key.slice(1)}</div>
              {(items as SearchResult[]).map(item => (
                <div
                  key={item.id}
                  className="search-result-item"
                  role="option"
                  onClick={() => handleSelect(item.url)}
                >
                  <span
                    className="search-result-type"
                    style={{
                      background: TYPE_COLORS[item.type] || 'rgba(148,163,184,0.1)',
                      color: TYPE_TEXT_COLORS[item.type] || 'var(--text-muted)'
                    }}
                  >
                    {item.type}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="text-sm font-semibold truncate">{item.title}</div>
                    <div className="text-xs text-muted truncate">{item.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
