import { createPortal } from 'react-dom';
import { X, Play, Headphones } from 'lucide-react';
import { usePlayback, usePlayerActions } from '../context/PlayerContext';
import { SURAH_JUZ } from '../data/juz';
import { fetchLecturesForSurah } from '../services/lecturesApi';
import './SurahInfoSheet.css';

/**
 * SurahInfoSheet — slide-up bottom sheet with surah info + play button.
 * Uses createPortal to mount cleanly outside page transform stacking contexts.
 */
const SurahInfoSheet = ({ surah, reciter, availableSurahs, surahIndex, moshafIndex, onClose }) => {
  const { currentTrack, isPlaying } = usePlayback();
  const { setTrack, openPlayer, togglePlay, pause } = usePlayerActions();

  if (!surah) return null;

  const juz = SURAH_JUZ[surah.id] ?? '—';
  const isCurrentSurah = currentTrack?.surah?.id === surah.id && currentTrack?.reciter?.id === reciter?.id;

  const handlePlay = () => {
    if (isCurrentSurah) {
      togglePlay();
    } else {
      setTrack(surah, reciter, availableSurahs, surahIndex, moshafIndex ?? 0);
      openPlayer();
    }
    onClose();
  };

  const content = (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="surah-info-sheet">
        <div className="sheet-handle" />

        {/* Header */}
        <div className="sheet-header">
          <div className="sheet-title-group">
            <span className="sheet-number">{surah.id}</span>
            <div className="sheet-titles">
              <h2 className="sheet-name-en">{surah.nameEnglish}</h2>
              <span className="sheet-name-ar">{surah.nameArabic}</span>
            </div>
          </div>
          <button className="sheet-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Meaning */}
        {surah.meaning && (
          <p className="sheet-meaning">"{surah.meaning}"</p>
        )}

        {/* Stats grid */}
        <div className="sheet-stats-grid">
          <div className="sheet-stat">
            <span className="stat-value">{juz}</span>
            <span className="stat-label">Juz</span>
          </div>
          <div className="sheet-stat">
            <span className="stat-value">{surah.verseCount}</span>
            <span className="stat-label">Verses</span>
          </div>
          <div className="sheet-stat">
            <span className={`stat-value type-badge ${surah.type === 'Meccan' ? 'meccan' : 'medinan'}`}>
              {surah.type}
            </span>
            <span className="stat-label">Revelation</span>
          </div>
        </div>

        {/* Surah recitation samples (not third-party lectures) */}
        {fetchLecturesForSurah(surah.id).length > 0 && (
          <div className="surah-lectures-section">
            <div className="lectures-section-header">
              <Headphones size={15} color="var(--accent-color)" />
              <span>Surah Recitation Sample</span>
            </div>
            {fetchLecturesForSurah(surah.id).map((lec, idx) => (
              <div key={idx} className="sheet-lecture-card">
                <div className="lecture-scholar-info">
                  <img src={lec.avatar} alt={lec.scholarName} className="scholar-avatar" width={36} height={36} loading="lazy" decoding="async" />
                  <div className="scholar-meta">
                    <span className="scholar-name">{lec.scholarName}</span>
                    <span className="lecture-title">{lec.title} ({lec.duration})</span>
                  </div>
                </div>
                <button 
                  className="lecture-play-btn"
                  onClick={() => {
                    if (isPlaying && typeof pause === 'function') pause();
                    const audio = new Audio(lec.audioUrl);
                    audio.play().catch(e => console.error(e));
                  }}
                  title="Play recitation sample"
                >
                  <Play size={14} fill="currentColor" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Play button */}
        <button className="sheet-play-btn" onClick={handlePlay}>
          <Play size={18} fill="currentColor" />
          <span>{isCurrentSurah && isPlaying ? 'Pause Recitation' : 'Play Recitation'}</span>
        </button>
      </div>
    </>
  );

  const container = document.querySelector('.app-container') || document.body;
  return createPortal(content, container);
};

export default SurahInfoSheet;


