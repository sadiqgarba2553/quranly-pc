import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Play, Pause, Shuffle, Star, Info, Folder,
  CloudDownload, MoreHorizontal, Search, ChevronDown, Check, CheckCircle2,
  Loader, Share2, Plus, BookOpen, Heart, X, Sparkles,
  BarChart3, Activity, TrendingUp, ChevronRight
} from 'lucide-react';
import { usePlayback, useData, useUserData, usePlayerActions } from '../context/PlayerContext';
import { getReciterPhotoPath } from '../utils/reciterPhotos';
import ReciterAvatar from './ReciterAvatar';
import photoCredits from '../../public/reciters/photo-credits.json';
import { getQariUniqueAttributes } from '../data/qariBios';
import { recordProfileView, getReciterAnalytics } from '../utils/reciterAnalytics';
import ReciterAnalyticsModal from './ReciterAnalyticsModal';
import './ReciterProfile.css';
import CollectionDownload from './CollectionDownload';

/**
 * ReciterProfile — Redesigned with Unobstructed Qari Photo Header:
 * - Clear Qari Portrait Photo at top with zero text overlapping their face
 * - Qari Details (Name, Subtitle, Tags, Actions, Bio) placed cleanly below photo
 * - Numbered Surah list container
 */
const ReciterProfile = ({ reciter, onBack }) => {
  const profileRef=useRef(null);
  useEffect(()=>{profileRef.current?.closest('.page-content')?.scrollTo({top:0,behavior:'instant'});},[reciter?.id]);
  const { currentTrack, isPlaying } = usePlayback();
  const { surahs = [] } = useData();
  const {
    favouriteReciterIds, downloadingTrackId, downloadProgress,
    favouriteSurahIds, customPlaylists = [],
  } = useUserData();
  const {
    setTrack, togglePlay, openPlayer, toggleFavouriteReciter,
    downloadTrack, removeTrack, isDownloaded, toggleFavouriteSurah,
    addSurahToPlaylist, createPlaylist, toggleQuranText,
  } = usePlayerActions();

  const [selectedMoshafIndex, setSelectedMoshafIndex] = useState(0);
  const [surahSearch, setSurahSearch] = useState('');
  const [showMoshafDropdown, setShowMoshafDropdown] = useState(false);
  const [showFullBio, setShowFullBio] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCollection,setShowCollection]=useState(false);
  useEffect(()=>{if(showCollection)profileRef.current?.querySelector('.collection-panel')?.scrollIntoView({block:'center',behavior:'instant'});},[showCollection]);
  const [analytics, setAnalytics] = useState(null);

  // Three dots menu state
  const [activeMenuSurah, setActiveMenuSurah] = useState(null);
  const [showPlaylistOptions, setShowPlaylistOptions] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const isCurrentlyPlaying = isPlaying && currentTrack?.reciter?.id === reciter.id;

  // Record profile impression and compute 100% real site metrics
  useEffect(() => {
    if (reciter?.id) {
      recordProfileView(reciter.id);
    }
  }, [reciter?.id]);

  useEffect(() => {
    if (reciter?.id) {
      setAnalytics(getReciterAnalytics(reciter, surahs, isCurrentlyPlaying));
    }
  }, [reciter?.id, surahs, isCurrentlyPlaying, isPlaying, currentTrack?.surah?.id]);

  if (!reciter) return null;

  const qariAttr = getQariUniqueAttributes(reciter);
  const bioText = reciter.bio || qariAttr.bio;
  const photoCredit=photoCredits[getReciterPhotoPath(reciter.name)];

  const isFav = favouriteReciterIds?.has
    ? (favouriteReciterIds.has(reciter.id) ||
       favouriteReciterIds.has(String(reciter.id)) ||
       (!isNaN(Number(reciter.id)) && favouriteReciterIds.has(Number(reciter.id))))
    : false;
  const isCurrentReciter = currentTrack?.reciter?.id === reciter.id;

  // Available Moshaf options from API
  const moshafList = reciter.moshaf?.length > 0
    ? reciter.moshaf
    : [{ name: 'Hafs A\'n Assem - Murattal', surah_total: 114 }];

  const currentMoshaf = moshafList[selectedMoshafIndex] ?? moshafList[0];

  // Parse available surah IDs for selected moshaf
  const safeSurahs = Array.isArray(surahs) ? surahs : [];
  const availableSurahIds = currentMoshaf?.surah_list
    ? currentMoshaf.surah_list.split(',').map(n => parseInt(n.trim(), 10)).filter(Boolean)
    : safeSurahs.map(s => s.id);

  // Filter surahs present in this moshaf & match search query
  const availableSurahs = safeSurahs.filter(s => {
    if (!s) return false;
    const isAvailable = availableSurahIds.length === 0 || availableSurahIds.includes(s.id);
    if (!isAvailable) return false;
    if (!surahSearch) return true;
    const q = surahSearch.toLowerCase();
    return (s.nameEnglish || '').toLowerCase().includes(q) || (s.nameArabic || '').includes(q);
  });

  const handlePlaySurah = (surahItem, index) => {
    setTrack(surahItem, reciter, availableSurahs, index, selectedMoshafIndex);
    openPlayer();
  };

  const handleTogglePlayAll = () => {
    if (isCurrentReciter && isPlaying) {
      togglePlay();
    } else if (availableSurahs.length > 0) {
      setTrack(availableSurahs[0], reciter, availableSurahs, 0, selectedMoshafIndex);
      openPlayer();
    }
  };

  const handleShufflePlay = () => {
    if (availableSurahs.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableSurahs.length);
      setTrack(availableSurahs[randomIndex], reciter, availableSurahs, randomIndex, selectedMoshafIndex);
      openPlayer();
    }
  };

  const handleDownloadClick = async (e, surahItem) => {
    e.stopPropagation();
    const downloaded = isDownloaded(surahItem.id, reciter.id);
    if (downloaded) {
      await removeTrack(surahItem.id, reciter.id);
    } else {
      await downloadTrack(surahItem, reciter, selectedMoshafIndex);
    }
  };

  const handleDownloadAll = () => setShowCollection(value=>!value);

  const handleShareSurah = (surahItem) => {
    const text = `Listen to Surah ${surahItem.nameEnglish} (${surahItem.nameArabic}) by ${reciter.name} on Quranly!`;
    if (navigator.share) {
      navigator.share({ title: `Surah ${surahItem.nameEnglish}`, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
      alert('Link copied to clipboard!');
    }
  };

  const handleShareQari = () => {
    const text = `Listen to the beautiful recitations of ${reciter.name} on Quranly!`;
    if (navigator.share) {
      navigator.share({ title: reciter.name, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="reciter-profile-view" ref={profileRef}>
      <div className="hero-top-nav">
          <button className="icon-circle-btn" onClick={onBack} aria-label="Back">
            <ArrowLeft size={18} color="currentColor" />
          </button>
          <div className="top-nav-right">
            <button className="icon-circle-btn" title="Reciter Analytics & Stats" onClick={() => setShowAnalytics(true)}>
              <BarChart3 size={16} color="currentColor" />
            </button>
            <button className="icon-circle-btn" title="Share Reciter" onClick={handleShareQari}>
              <Share2 size={16} color="currentColor" />
            </button>
            <button className="icon-circle-btn" title="Reciter Info" onClick={() => setShowFullBio(v => !v)}>
              <Info size={16} color="currentColor" />
            </button>
          </div>
        </div>
      <section className="profile-summary glass-panel" aria-label="Reciter profile">
        <div className="profile-hero-cover">
          <div className="hero-portrait-wrap">
            <ReciterAvatar name={reciter.name} alt={reciter.name} className="hero-qari-img" width={220} height={240}/>
          </div>
          {photoCredit && <p className="reciter-photo-credit"><a href={photoCredit.source} target="_blank" rel="noreferrer">Photo: {photoCredit.author}</a><span> · </span><a href={photoCredit.licenseUrl} target="_blank" rel="noreferrer">{photoCredit.license}</a></p>}
        </div>

      {/* Qari Details Container: Placed Cleanly BELOW the Photo */}
      <div className="hero-details-container">
        <h1 className="qari-hero-name">{reciter.name}</h1>
        
        <div className="qari-sub-title">Quran reciter{reciter.country ? ` · ${reciter.country}` : ''}</div>

        <div className="qari-tags-row">
          {qariAttr.tags.map((tag, idx) => (
            <span key={idx} className="qari-tag-chip">{tag}</span>
          ))}
        </div>

        {/* Live Analytics Trigger Card */}
        <button className="profile-analytics-trigger-card" onClick={() => setShowAnalytics(true)} aria-label="View your listening statistics">
          <span className="analytics-card-left">
            <span className="analytics-card-badge">
              <span className={`live-dot-mini ${isCurrentlyPlaying ? 'playing' : ''}`} />
              <span>{isCurrentlyPlaying ? 'PLAYING NOW' : 'YOUR LISTENING'}</span>
            </span>
            <span className="analytics-card-headline">
              <span><strong>{analytics?.totalPlays || 0}</strong> {analytics?.totalPlays === 1 ? 'play' : 'plays'}</span>
              <span className="dot-sep">•</span>
              <span><strong>{analytics?.totalMinutes || 0}m</strong> listened</span>
              <span className="dot-sep">•</span>
              <span><strong>{analytics?.profileViews || 1}</strong> {analytics?.profileViews === 1 ? 'view' : 'views'}</span>
            </span>
          </span>
          <span className="analytics-card-btn">
            <BarChart3 size={14} />
            <span>Analytics</span>
            <ChevronRight size={14} />
          </span>
        </button>

        {/* Action Control Buttons */}
        <div className="hero-action-buttons">
          <button
            className="action-circle-btn"
            onClick={handleShufflePlay}
            title="Shuffle Recitations"
          >
            <Shuffle size={18} color="currentColor" />
          </button>

          <button
            className="play-hero-pill"
            onClick={handleTogglePlayAll}
          >
            {isCurrentReciter && isPlaying ? (
              <>
                <Pause size={18} fill="currentColor" color="currentColor" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play size={18} fill="currentColor" color="currentColor" style={{ marginLeft: 2 }} />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            className={`action-circle-btn ${isFav ? 'active-fav' : ''}`}
            onClick={() => toggleFavouriteReciter(reciter.id)}
            title={isFav ? "Following Qari" : "Follow Qari"} aria-pressed={isFav}
          >
            <Star size={18} fill={isFav ? 'currentColor' : 'none'} color="currentColor" />
          </button>
        </div>

        {/* Bio Snippet */}
        <div className="qari-bio-text">
          <span>{showFullBio ? bioText : bioText.slice(0, 110) + (bioText.length > 110 ? '... ' : '')}</span>
          {bioText.length > 110 && (
            <button className="bio-more-toggle" onClick={() => setShowFullBio(v => !v)}>
              {showFullBio ? 'Less' : 'More'}
            </button>
          )}
        </div>
      </div>

      </section>

      {showCollection&&<CollectionDownload reciter={reciter} surahs={safeSurahs} initialEdition={selectedMoshafIndex} onClose={()=>setShowCollection(false)}/>}

      {/* Popular Recitations (Top 5) Section */}
      <div className="popular-recitations-section">
        <h3 className="popular-section-title">
          <Star size={16} fill="var(--text-primary)" color="var(--text-primary)" style={{ marginRight: 6 }} /> Popular Recitations
        </h3>
        <div className="popular-surahs-list">
          {(() => {
            const popularSurahIds = [1, 18, 36, 55, 67];
            let pop = availableSurahs.filter(s => popularSurahIds.includes(s.id));
            if (pop.length < 5) {
              const remaining = availableSurahs.filter(s => !popularSurahIds.includes(s.id));
              pop = [...pop, ...remaining].slice(0, 5);
            } else {
              pop = pop.slice(0, 5);
            }

            return pop.map((surahItem, idx) => {
              const isPlayingThis = currentTrack?.surah?.id === surahItem.id && currentTrack?.reciter?.id === reciter.id && isPlaying;

              return (
                <div
                  key={surahItem.id}
                  className={`popular-surah-row ${isPlayingThis ? 'playing' : ''}`}
                  onClick={() => handlePlaySurah(surahItem, availableSurahs.indexOf(surahItem))}
                >
                  <span className="popular-rank">{idx + 1}</span>
                  <div className="popular-info">
                    <h4>{surahItem.nameEnglish}</h4>
                    <p>{surahItem.nameArabic}</p>
                  </div>
                  <button className="popular-play-btn" title={`Play ${surahItem.nameEnglish}`}>
                    {isPlayingThis ? <Pause size={14} fill="currentColor" color="currentColor" /> : <Play size={14} fill="currentColor" color="currentColor" style={{ marginLeft: 2 }} />}
                  </button>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Surahs Section Header */}
      <div className="surahs-recorded-header">
        <h2>{availableSurahs.length} surahs recorded</h2>
        <button className="cloud-header-btn" title="Download collection" aria-label="Download reciter collection" onClick={handleDownloadAll}>
          <CloudDownload size={20} color="var(--text-primary)" />
        </button>
      </div>

      {/* Search & Moshaf / Riwayat Selector Bar */}
      <div className="profile-utility-bar">
        <div className="utility-search-input">
          <Search size={15} color="currentColor" />
          <input
            type="text"
            placeholder="Search surahs..."
            value={surahSearch}
            onChange={(e) => setSurahSearch(e.target.value)}
          />
        </div>

        {moshafList.length > 1 && (
          <div className="moshaf-dropdown-container">
            <button
              className="moshaf-selector-pill"
              onClick={() => setShowMoshafDropdown(v => !v)}
            >
              <span>{currentMoshaf.name.split(' ')[0]}</span>
              <ChevronDown size={14} />
            </button>

            {showMoshafDropdown && (
              <div className="moshaf-dropdown-menu">
                {moshafList.map((m, idx) => (
                  <div
                    key={idx}
                    className={`moshaf-option ${selectedMoshafIndex === idx ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedMoshafIndex(idx);
                      setShowMoshafDropdown(false);
                    }}
                  >
                    <span>{m.name}</span>
                    {selectedMoshafIndex === idx && <Check size={14} color="var(--text-primary)" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Surah List Dark Container */}
      <div className="surahs-dark-container">
        {availableSurahs.map((surahItem, index) => {
          const isThisTrackPlaying =
            currentTrack?.surah?.id === surahItem.id &&
            currentTrack?.reciter?.id === reciter.id &&
            isPlaying;

          const downloaded = isDownloaded(surahItem.id, reciter.id);
          const trackId = `${surahItem.id}_${reciter.id}`;
          const isDownloading = downloadingTrackId === trackId;

          return (
            <div
              key={surahItem.id}
              className={`surah-card-row ${isThisTrackPlaying ? 'playing' : ''}`}
              onClick={() => handlePlaySurah(surahItem, index)}
            >
              <div className="row-num-circle">{surahItem.id}</div>

              <div className="row-surah-info">
                <div className="row-title-arabic">
                  <span className="en-title">{surahItem.nameEnglish}</span>
                  <span className="ar-title">({surahItem.nameArabic})</span>
                </div>
                <p className="row-meaning">{surahItem.meaning || 'The Chapter'}</p>
              </div>

              <div className="row-actions">
                <button
                  className={`row-icon-btn ${downloaded ? 'downloaded-active' : ''}`}
                  title={downloaded ? "Remove Download" : "Download Audio"}
                  onClick={(e) => handleDownloadClick(e, surahItem)}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <Loader size={16} className="spin" color="currentColor" />
                  ) : downloaded ? (
                    <CheckCircle2 size={16} color="currentColor" />
                  ) : (
                    <CloudDownload size={16} color="currentColor" />
                  )}
                </button>

                <button
                  className="row-icon-btn"
                  title="More Options"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuSurah(surahItem);
                  }}
                >
                  <MoreHorizontal size={18} color="currentColor" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Interactive Three Dots Options Modal / Bottom Sheet ───────────────── */}
      {activeMenuSurah && (
        <div className="surah-menu-overlay" onClick={() => { setActiveMenuSurah(null); setShowPlaylistOptions(false); }}>
          <div className="surah-menu-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="surah-menu-header">
              <div className="surah-menu-title-wrap">
                <h3>{activeMenuSurah.nameEnglish} ({activeMenuSurah.nameArabic})</h3>
                <p>Recited by {reciter.name}</p>
              </div>
              <button className="surah-menu-close-btn" onClick={() => { setActiveMenuSurah(null); setShowPlaylistOptions(false); }}>
                <X size={18} color="var(--text-primary)" />
              </button>
            </div>

            <div className="surah-menu-options-list">
              <button
                className="surah-menu-item"
                onClick={() => {
                  handlePlaySurah(activeMenuSurah, availableSurahs.indexOf(activeMenuSurah));
                  setActiveMenuSurah(null);
                }}
              >
                <Play size={18} color="var(--text-primary)" />
                <span>Play Surah</span>
              </button>

              <button
                className="surah-menu-item"
                onClick={() => {
                  if (activeMenuSurah?.id && toggleFavouriteSurah) {
                    toggleFavouriteSurah(activeMenuSurah.id);
                  }
                }}
              >
                <Star
                  size={18}
                  fill={favouriteSurahIds?.has && favouriteSurahIds.has(activeMenuSurah.id) ? 'var(--text-primary)' : 'none'}
                  color={favouriteSurahIds?.has && favouriteSurahIds.has(activeMenuSurah.id) ? 'var(--text-primary)' : 'var(--text-primary)'}
                />
                <span>{favouriteSurahIds?.has && favouriteSurahIds.has(activeMenuSurah.id) ? 'Remove from Favorites' : 'Add to Favorite Surahs'}</span>
              </button>

              <button
                className="surah-menu-item"
                onClick={(e) => {
                  handleDownloadClick(e, activeMenuSurah);
                }}
              >
                {isDownloaded(activeMenuSurah.id, reciter.id) ? (
                  <>
                    <CheckCircle2 size={18} color="currentColor" />
                    <span>Downloaded (Tap to delete)</span>
                  </>
                ) : (
                  <>
                    <CloudDownload size={18} color="var(--text-primary)" />
                    <span>Download Audio for Offline</span>
                  </>
                )}
              </button>

              <button
                className="surah-menu-item"
                onClick={() => {
                  setTrack(activeMenuSurah, reciter, availableSurahs, availableSurahs.indexOf(activeMenuSurah));
                  toggleQuranText();
                  setActiveMenuSurah(null);
                }}
              >
                <BookOpen size={18} color="var(--text-primary)" />
                <span>Read Verses &amp; Translation</span>
              </button>

              <button
                className="surah-menu-item"
                onClick={() => setShowPlaylistOptions(prev => !prev)}
              >
                <Plus size={18} color="var(--text-primary)" />
                <span>Add to Playlist</span>
              </button>

              {showPlaylistOptions && (
                <div className="playlist-sub-options">
                  {customPlaylists?.length > 0 ? (
                    customPlaylists.map(pl => (
                      <button
                        key={pl.id}
                        className="playlist-sub-item"
                        onClick={() => {
                          addSurahToPlaylist(pl.id, activeMenuSurah.id);
                          alert(`Added to playlist "${pl.name}"`);
                          setActiveMenuSurah(null);
                        }}
                      >
                        <Sparkles size={14} color="var(--text-primary)" />
                        <span>{pl.name}</span>
                      </button>
                    ))
                  ) : (
                    <p className="no-playlists-hint">No custom playlists yet. Create one in Playlists tab.</p>
                  )}
                </div>
              )}

              <button
                className="surah-menu-item"
                onClick={() => {
                  handleShareSurah(activeMenuSurah);
                  setActiveMenuSurah(null);
                }}
              >
                <Share2 size={18} color="var(--text-primary)" />
                <span>Share Surah Link</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reciter Analytics & Live Stats Sheet */}
      <ReciterAnalyticsModal
        reciter={reciter}
        surahs={surahs}
        isCurrentlyPlaying={isCurrentlyPlaying}
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
      />
    </div>
  );
};

export default ReciterProfile;


