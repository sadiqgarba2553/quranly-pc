import { sanitizeHtml } from '../utils/sanitizeHtml';
import React, { useState, useEffect, useMemo } from 'react';
import { Search as SearchIcon, Users, FileText, Loader, ArrowRight, Play, BookOpen } from 'lucide-react';
import { usePlayerActions } from '../context/PlayerContext';
import surahs from '../data/surahs';
import reciters from '../data/reciters';
import './Search.css';

const Search = () => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [quranResults, setQuranResults] = useState([]);
  const [isSearchingQuran, setIsSearchingQuran] = useState(false);
  const { openReciterProfile, toggleQuranText } = usePlayerActions();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length < 3) {
      setQuranResults([]);
      setIsSearchingQuran(false);
      return;
    }

    const controller = new AbortController();
    const searchQuranAPI = async () => {
      setIsSearchingQuran(true);
      try {
        const response = await fetch(`https://api.quran.com/api/v4/search?q=${encodeURIComponent(debouncedQuery)}&size=20&language=en`, { signal: controller.signal });
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        setQuranResults(data.search?.results || []);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Quran search error:', error);
        setQuranResults([]);
      } finally {
        if (!controller.signal.aborted) setIsSearchingQuran(false);
      }
    };

    searchQuranAPI();
    return () => controller.abort();
  }, [debouncedQuery]);

  // Local Search Filters
  const reciterResults = useMemo(() => {
    if (!debouncedQuery) return [];
    const lower = debouncedQuery.toLowerCase();
    return reciters.filter(r => r.name.toLowerCase().includes(lower) || r.style?.toLowerCase().includes(lower)).slice(0, 5);
  }, [debouncedQuery]);

  const surahResults = useMemo(() => {
    if (!debouncedQuery) return [];
    const lower = debouncedQuery.toLowerCase();
    return surahs.filter(s => s.nameEnglish.toLowerCase().includes(lower) || s.nameArabic.includes(lower)).slice(0, 10);
  }, [debouncedQuery]);

  const handleReciterClick = (reciter) => {
    openReciterProfile(reciter);
  };

  const handleAyahClick = (result) => {
    const [surahId] = result.verse_key.split(':');
    const surah = surahs.find(s => s.id === parseInt(surahId, 10));
    if (surah) {
      toggleQuranText(surah.id, surah.nameEnglish, surah.nameArabic);
    }
  };

  return (
    <div className="search-page route-page">
      <div className="search-header glass-panel">
        <h1>Search</h1>
        <div className="search-input-wrapper">
          <SearchIcon size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search reciters, surahs, or verses (e.g. 'patience')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
            autoFocus
          />
        </div>
      </div>

      <div className="search-content">
        {!debouncedQuery ? (
          <div className="search-empty-state">
            <SearchIcon size={48} opacity={0.2} />
            <p>Start typing to search across the entire Quran, translations, and your favorite reciters.</p>
          </div>
        ) : (
          <div className="search-results-container">
            
            {/* Reciters Section */}
            {reciterResults.length > 0 && (
              <div className="search-section">
                <h3><Users size={16} /> Reciters</h3>
                <div className="search-reciter-list">
                  {reciterResults.map(r => (
                    <div key={r.id} className="search-reciter-card glass-panel" onClick={() => handleReciterClick(r)}>
                      <div className="search-reciter-info">
                        <h4>{r.name}</h4>
                        <p>{r.style || 'Hafs'}</p>
                      </div>
                      <ArrowRight size={16} color="var(--accent-primary)" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Surahs Section */}
            {surahResults.length > 0 && (
              <div className="search-section">
                <h3><BookOpen size={16} /> Surahs</h3>
                <div className="search-surah-list">
                  {surahResults.map(s => (
                    <div key={s.id} className="search-surah-row glass-panel" onClick={() => toggleQuranText(s.id, s.nameEnglish, s.nameArabic)}>
                      <div className="surah-badge">{s.id}</div>
                      <div className="search-surah-info">
                        <h4>{s.nameEnglish}</h4>
                        <p>{s.nameArabic}</p>
                      </div>
                      <BookOpen size={16} color="var(--accent-primary)" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quran Text Section (API) */}
            <div className="search-section">
              <h3><FileText size={16} /> Quran Verses</h3>
              
              {isSearchingQuran ? (
                <div className="search-loading">
                  <Loader size={24} className="spin" />
                  <p>Searching the Quran...</p>
                </div>
              ) : quranResults.length > 0 ? (
                <div className="search-verse-list">
                  {quranResults.map(res => (
                    <div key={res.verse_key} className="search-verse-card glass-panel" onClick={() => handleAyahClick(res)}>
                      <div className="verse-key-badge">{res.verse_key}</div>
                      <div className="verse-text-arabic">{res.text}</div>
                      <div className="verse-text-translation" dangerouslySetInnerHTML={{ __html: sanitizeHtml(res.translations[0]?.text || '') }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-results">
                  {debouncedQuery.length > 2 ? 'No verses found.' : 'Type at least 3 characters to search verses.'}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
