import { sanitizeHtml } from '../utils/sanitizeHtml';
import { useState, useEffect, useRef } from 'react';
import { X, Loader, WifiOff, Radio, Play, Globe, Bookmark, BookOpen } from 'lucide-react';
import { usePlayback, useCurrentTime, useUserData, usePlayerActions } from '../context/PlayerContext';
import { fetchTafsir } from '../services/quranApi';
import './QuranTextModal.css';

const TRANSLATIONS = [
  { id: 'en.sahih', name: 'English (Sahih)' },
  { id: 'ha.gumi', name: 'Hausa (Gumi)' },
  { id: 'fr.hamidullah', name: 'French (Hamidullah)' },
  { id: 'tr.diyanet', name: 'Turkish (Diyanet)' },
  { id: 'ur.jalandhry', name: 'Urdu (Jalandhry)' },
  { id: 'id.indonesian', name: 'Indonesian' },
];

/**
 * QuranTextModal — fetches Arabic + Multi-language translations for the current surah
 * with adaptive character-weighted Ayah tracking, breath pause compensation,
 * Bismillah offset estimation, auto-scroll, tap-to-seek, and live sync nudge controls!
 */
const QuranTextModal = ({ surahId, surahName, surahArabic }) => {
  const { duration } = usePlayback();
  const currentTime = useCurrentTime();
  const { bookmarkedVerses } = useUserData();
  const { toggleQuranText, seek, toggleBookmark } = usePlayerActions();
  const [selectedLang, setSelectedLang] = useState('en.sahih');
  const [ayahs, setAyahs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [syncOffset, setSyncOffset] = useState(0); // in seconds (-5s to +5s)
  
  // Tafsir state
  const [expandedTafsirAyah, setExpandedTafsirAyah] = useState(null);
  const [tafsirData, setTafsirData] = useState({});
  const [tafsirLoading, setTafsirLoading] = useState(false);

  const activeAyahRef = useRef(null);
  const bismillahRef = useRef(null);

  useEffect(() => {
    if (!surahId) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    // Fetch Arabic + selected translation in parallel
    Promise.all([
      fetch(`https://api.alquran.cloud/v1/surah/${surahId}`, { signal: controller.signal })
        .then(r => r.json()),
      fetch(`https://api.alquran.cloud/v1/surah/${surahId}/${selectedLang}`, { signal: controller.signal })
        .then(r => r.json()),
    ])
      .then(([arData, transData]) => {
        const arAyahs = arData?.data?.ayahs ?? [];
        const transAyahs = transData?.data?.ayahs ?? [];
        const combined = arAyahs.map((a, i) => ({
          number: a.numberInSurah,
          arabic: a.text,
          translation: transAyahs[i]?.text ?? '',
        }));
        setAyahs(combined);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError('Could not load Quran text. Check your network connection.');
        setLoading(false);
      });

    return () => controller.abort();
  }, [surahId, selectedLang]);

  // Total Arabic character count across all ayahs
  const totalChars = ayahs.reduce((sum, a) => sum + (a.arabic?.length || 0), 0);

  // Dynamic Bismillah intro estimation (~2.5% of duration, min 3.5s, max 7.5s for non At-Tawbah #9)
  const bismillahTime = (surahId !== 9 && duration > 12)
    ? Math.min(7.5, Math.max(3.5, duration * 0.025))
    : 0;

  // Apply user sync nudge offset
  const adjustedTime = Math.max(0, currentTime + syncOffset);

  let activeIndex = -1;
  let isBismillahActive = false;

  if (duration > 0 && totalChars > 0) {
    if (surahId !== 9 && adjustedTime < bismillahTime) {
      isBismillahActive = true;
      activeIndex = -1;
    } else {
      const effectiveTime = Math.max(0, adjustedTime - bismillahTime);
      const effectiveDuration = Math.max(1, duration - bismillahTime);
      const progressRatio = Math.max(0, Math.min(1, effectiveTime / effectiveDuration));

      // Add breath pause weight (~15 char equivalent) per verse to account for pauses
      const pauseWeight = 15;
      const totalWeighted = ayahs.reduce((sum, a) => sum + (a.arabic?.length || 0) + pauseWeight, 0);
      const targetWeighted = progressRatio * totalWeighted;

      let accumulated = 0;
      for (let i = 0; i < ayahs.length; i++) {
        accumulated += (ayahs[i].arabic?.length || 0) + pauseWeight;
        if (accumulated >= targetWeighted || i === ayahs.length - 1) {
          activeIndex = i;
          break;
        }
      }
    }
  }

  // Auto-scroll active Ayah or Bismillah into view smoothly
  useEffect(() => {
    if (!autoScroll) return;
    if (isBismillahActive && bismillahRef.current) {
      bismillahRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (activeAyahRef.current) {
      activeAyahRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIndex, isBismillahActive, autoScroll]);

  const handleAyahClick = (index) => {
    if (duration > 0 && totalChars > 0) {
      const pauseWeight = 15;
      let weightedBefore = 0;
      for (let i = 0; i < index; i++) {
        weightedBefore += (ayahs[i].arabic?.length || 0) + pauseWeight;
      }
      const totalWeighted = ayahs.reduce((sum, a) => sum + (a.arabic?.length || 0) + pauseWeight, 0);
      const ratio = weightedBefore / totalWeighted;
      const effectiveDuration = Math.max(1, duration - bismillahTime);
      const targetTime = bismillahTime + ratio * effectiveDuration - syncOffset;
      seek(Math.max(0, targetTime));
    }
  };

  const loadTafsir = async (ayahNumber) => {
    if (expandedTafsirAyah === ayahNumber) {
      setExpandedTafsirAyah(null);
      return;
    }
    setExpandedTafsirAyah(ayahNumber);
    if (!tafsirData[ayahNumber]) {
      setTafsirLoading(true);
      const text = await fetchTafsir(169, surahId, ayahNumber);
      setTafsirData(prev => ({ ...prev, [ayahNumber]: text?.text || 'Tafsir not available for this verse.' }));
      setTafsirLoading(false);
    }
  };

  return (
    <div className="modal-overlay quran-overlay" onClick={toggleQuranText}>
      <div className="quran-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header with two rows for clean un-squeezed layout */}
        <div className="quran-modal-header">
          <div className="quran-modal-top-row">
            <div className="quran-modal-title">
              <span className="quran-arabic-title">{surahArabic}</span>
              <h3>{surahName}</h3>
            </div>
            <button className="icon-btn dark close-quran-btn" onClick={toggleQuranText}>
              <X size={20} color="#fff" />
            </button>
          </div>

          <div className="quran-modal-toolbar">
            {/* Translation language picker */}
            <div className="lang-picker">
              <Globe size={13} color="currentColor" />
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="translation-select"
              >
                {TRANSLATIONS.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Live Sync & Offset Controls */}
            <div className="sync-control-group">
              <button
                className={`live-sync-pill ${autoScroll ? 'active' : ''}`}
                onClick={() => setAutoScroll(!autoScroll)}
                title="Toggle Live Auto-Scroll"
              >
                <Radio size={13} className={autoScroll ? 'pulse-icon' : ''} />
                <span>{autoScroll ? 'Live Sync' : 'Sync Off'}</span>
              </button>

              <div className="nudge-controls">
                <button
                  className="nudge-btn"
                  onClick={() => setSyncOffset(s => parseFloat((s - 1.0).toFixed(1)))}
                  title="Nudge 1s earlier"
                >
                  -1s
                </button>
                <span className="nudge-value">
                  {syncOffset > 0 ? `+${syncOffset.toFixed(1)}s` : `${syncOffset.toFixed(1)}s`}
                </span>
                <button
                  className="nudge-btn"
                  onClick={() => setSyncOffset(s => parseFloat((s + 1.0).toFixed(1)))}
                  title="Nudge 1s later"
                >
                  +1s
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="quran-ayahs">
          {/* Bismillah (shown for all surahs except At-Tawbah #9) */}
          {surahId !== 9 && (
            <div
              ref={bismillahRef}
              className={`bismillah ${isBismillahActive ? 'active-bismillah' : ''}`}
              onClick={() => seek(0)}
              style={{ cursor: 'pointer' }}
            >
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </div>
          )}

          {loading && (
            <div className="quran-loading">
              <Loader size={28} className="spin" />
              <span>Loading Quran text and translation…</span>
            </div>
          )}

          {error && !loading && (
            <div className="quran-error">
              <WifiOff size={20} color="currentColor" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && ayahs.map((ayah, index) => {
            const isActive = index === activeIndex;
            const bookmarkKey = `${surahId}:${ayah.number}`;
            const isBookmarked = bookmarkedVerses?.some(b => b.key === bookmarkKey);
            return (
              <div
                key={ayah.number}
                ref={isActive ? activeAyahRef : null}
                className={`ayah-block ${isActive ? 'active-ayah' : ''}`}
                onClick={() => handleAyahClick(index)}
              >
                <div className="ayah-arabic">
                  <span className="ayah-num">﴿{ayah.number}﴾</span>
                  {ayah.arabic}
                  <button
                    className={`ayah-bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleBookmark(surahId, ayah.number, ayah.arabic); }}
                    title={isBookmarked ? 'Remove bookmark' : 'Bookmark this verse'}
                  >
                    <Bookmark size={14} fill={isBookmarked ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <div className="ayah-english">
                  {isActive && <Play size={12} fill="currentColor" className="active-play-icon" />}
                  {ayah.translation}
                </div>
                <div className="ayah-actions">
                  <button 
                    className={`view-tafsir-btn ${expandedTafsirAyah === ayah.number ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); loadTafsir(ayah.number); }}
                    title="Read Tafsir"
                  >
                    <BookOpen size={14} />
                    <span>{expandedTafsirAyah === ayah.number ? 'Hide Tafsir' : 'Read Tafsir'}</span>
                  </button>
                </div>
                {expandedTafsirAyah === ayah.number && (
                  <div className="ayah-tafsir glass-panel" onClick={(e) => e.stopPropagation()}>
                    <div className="tafsir-header">
                      <BookOpen size={16} color="var(--accent-primary)" />
                      <strong>Tafsir Ibn Kathir</strong>
                    </div>
                    {tafsirLoading && !tafsirData[ayah.number] ? (
                      <div className="tafsir-loader"><Loader size={16} className="spin" /> Loading...</div>
                    ) : (
                      <div className="tafsir-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(tafsirData[ayah.number]) }} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuranTextModal;


