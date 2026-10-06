import React, { useState, useEffect, useRef } from 'react';
import api from '../api/config';

export default function SearchModal({ show, onClose, onSelectNote }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ notes: [], tasks: [], categories: [] });
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (show) {
      const saved = localStorage.getItem('minddesk_recent_searches');
      if (saved) {
        try {
          setRecentSearches(JSON.parse(saved));
        } catch {
          setRecentSearches([]);
        }
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [show]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ notes: [], tasks: [], categories: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/search?q=${encodeURIComponent(query.trim())}`);
        setResults(res.data.results || { notes: [], tasks: [], categories: [] });
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const saveRecentSearch = (term) => {
    const updated = [term, ...recentSearches.filter((s) => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('minddesk_recent_searches', JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('minddesk_recent_searches');
  };

  const handleSelectNote = (note) => {
    saveRecentSearch(note.title);
    if (onSelectNote) onSelectNote(note);
    onClose();
  };

  if (!show) return null;

  const totalResults = results.notes.length + results.tasks.length + results.categories.length;

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content shadow-lg border-0" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          {/* Search Header */}
          <div className="p-3 bg-white border-bottom d-flex align-items-center gap-2">
            <i className="bi bi-search text-muted fs-5"></i>
            <input
              ref={inputRef}
              type="text"
              className="form-control border-0 shadow-none fs-5"
              placeholder="Search notes, tags, categories, tasks..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ backgroundColor: 'transparent' }}
            />
            {query && (
              <button
                type="button"
                className="btn btn-sm btn-link text-muted p-0"
                onClick={() => setQuery('')}
              >
                <i className="bi bi-x-circle-fill fs-5"></i>
              </button>
            )}
            <button type="button" className="btn-close ms-2" onClick={onClose}></button>
          </div>

          <div className="modal-body p-3" style={{ maxHeight: '450px', overflowY: 'auto', backgroundColor: '#FAF6F0' }}>
            {/* Loading */}
            {loading && (
              <div className="text-center py-4 text-muted">
                <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                Searching across your MindDesk...
              </div>
            )}

            {/* Recent Searches */}
            {!query && recentSearches.length > 0 && (
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="small text-muted fw-bold text-uppercase">Recent Searches</span>
                  <button
                    type="button"
                    className="btn btn-link btn-sm text-decoration-none text-muted p-0 small"
                    onClick={clearRecentSearches}
                  >
                    Clear All
                  </button>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {recentSearches.map((term, i) => (
                    <button
                      key={i}
                      type="button"
                      className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                      style={{ borderRadius: '20px', backgroundColor: '#FFF' }}
                      onClick={() => setQuery(term)}
                    >
                      <i className="bi bi-clock-history small"></i>
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {!loading && query && totalResults === 0 && (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-search fs-1 d-block mb-2 text-secondary opacity-50"></i>
                <h6 className="fw-semibold">No matches found for "{query}"</h6>
                <p className="small mb-0">Try searching with a different keyword, tag, or category.</p>
              </div>
            )}

            {/* Notes Results */}
            {!loading && results.notes.length > 0 && (
              <div className="mb-3">
                <div className="small text-muted fw-bold text-uppercase mb-2">
                  Notes ({results.notes.length})
                </div>
                <div className="list-group shadow-sm">
                  {results.notes.map((note) => (
                    <button
                      key={note._id}
                      type="button"
                      className="list-group-item list-group-item-action p-3 text-start bg-white border"
                      style={{ borderRadius: '8px', marginBottom: '6px' }}
                      onClick={() => handleSelectNote(note)}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <strong className="text-dark">{note.title}</strong>
                        {note.category && (
                          <span className="badge bg-secondary-subtle text-secondary small border">
                            {note.category}
                          </span>
                        )}
                      </div>
                      <p className="small text-muted mb-2 text-truncate" style={{ maxWidth: '95%' }}>
                        {note.description?.replace(/<[^>]*>/g, '') || 'No text content'}
                      </p>
                      {note.tags && note.tags.length > 0 && (
                        <div className="d-flex flex-wrap gap-1">
                          {note.tags.map((tag, idx) => (
                            <span key={idx} className="badge bg-warning-subtle text-dark border small" style={{ fontSize: '0.72rem' }}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks Results */}
            {!loading && results.tasks.length > 0 && (
              <div className="mb-3">
                <div className="small text-muted fw-bold text-uppercase mb-2">
                  Tasks ({results.tasks.length})
                </div>
                <div className="list-group shadow-sm">
                  {results.tasks.map((task) => (
                    <div
                      key={task._id}
                      className="list-group-item d-flex justify-content-between align-items-center p-2 bg-white border mb-1"
                      style={{ borderRadius: '8px' }}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <i className={`bi ${task.completed ? 'bi-check-circle-fill text-success' : 'bi-circle text-muted'}`}></i>
                        <span className={task.completed ? 'text-decoration-line-through text-muted' : 'text-dark'}>
                          {task.task}
                        </span>
                      </div>
                      <span className="badge bg-light text-muted border">{task.taskDate}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Categories Results */}
            {!loading && results.categories.length > 0 && (
              <div className="mb-3">
                <div className="small text-muted fw-bold text-uppercase mb-2">
                  Categories ({results.categories.length})
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {results.categories.map((cat) => (
                    <span key={cat._id} className="badge bg-dark px-3 py-2 fs-6">
                      <i className="bi bi-folder2-open me-1"></i> {cat.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer border-0 bg-white py-2 px-3 d-flex justify-content-between">
            <span className="small text-muted">
              Press <strong>Esc</strong> to close
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
