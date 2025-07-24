/**
 * Search Section Component for OpenAIP Sidebar
 * 
 * Handles search functionality for airports, airspaces, navaids, and coordinates
 */

import React, { useState, useRef, useEffect } from 'react';

export const SearchSection = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef(null);

  // Handle search input changes with debouncing
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const performSearch = async (query) => {
    setIsSearching(true);
    try {
      // Call the search handler passed from parent
      const results = await onSearch(query);
      setSearchResults(results || []);
      setShowSuggestions(results && results.length > 0);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    }
  };

  const handleResultClick = (result) => {
    setSearchQuery(result.name || result.identifier || '');
    setShowSuggestions(false);
    // Trigger navigation to the selected result
    if (onSearch) {
      onSearch(result, 'navigate');
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  };

  const getResultIcon = (result) => {
    switch (result.type) {
      case 'airport':
        return '✈️';
      case 'airspace':
        return '🛡️';
      case 'navaid':
        return '📡';
      case 'obstacle':
        return '⚠️';
      case 'coordinate':
        return '📍';
      default:
        return '📌';
    }
  };

  const formatResultSubtitle = (result) => {
    const parts = [];
    
    if (result.icaoCode) parts.push(result.icaoCode);
    if (result.country) parts.push(result.country);
    if (result.type) parts.push(result.type.toUpperCase());
    if (result.frequency) parts.push(`${result.frequency} MHz`);
    
    return parts.join(' • ');
  };

  return (
    <div className="search-section">
      {/* Search Input */}
      <form onSubmit={handleSearchSubmit} className="search-form">
        <div className="search-input-container">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search airports, navaids, coordinates..."
            className="search-input"
            autoComplete="off"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="clear-search-btn"
              title="Clear search"
            >
              ✕
            </button>
          )}
          <button
            type="submit"
            className="search-submit-btn"
            disabled={!searchQuery.trim() || isSearching}
            title="Search"
          >
            {isSearching ? '⏳' : '🔍'}
          </button>
        </div>
      </form>

      {/* Search Suggestions/Results */}
      {showSuggestions && searchResults.length > 0 && (
        <div className="search-results">
          <div className="results-header">
            <span className="results-count">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="results-list">
            {searchResults.slice(0, 10).map((result, index) => (
              <div
                key={index}
                className="result-item"
                onClick={() => handleResultClick(result)}
              >
                <div className="result-icon">
                  {getResultIcon(result)}
                </div>
                <div className="result-content">
                  <div className="result-title">
                    {result.name || result.identifier || 'Unknown'}
                  </div>
                  <div className="result-subtitle">
                    {formatResultSubtitle(result)}
                  </div>
                  {result.coordinates && (
                    <div className="result-coordinates">
                      {result.coordinates.lat?.toFixed(4)}°, {result.coordinates.lng?.toFixed(4)}°
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Help */}
      <div className="search-help">
        <details>
          <summary>Search Help</summary>
          <div className="help-content">
            <p><strong>Search examples:</strong></p>
            <ul>
              <li><code>KJFK</code> - Airport by ICAO code</li>
              <li><code>Kennedy</code> - Airport by name</li>
              <li><code>VOR</code> - Navigation aids</li>
              <li><code>40.6413, -73.7781</code> - Coordinates</li>
              <li><code>40°38'28"N 73°46'41"W</code> - DMS coordinates</li>
            </ul>
          </div>
        </details>
      </div>
    </div>
  );
};
