import { useState } from 'react';
import {
  ArrowLeft, Play, MoreVertical, Download, Lock, Trash2, Star, Bookmark,
  Plus, FolderPlus, Music, Check, X, Heart, User, Sparkles, Moon, Pencil
} from 'lucide-react';
import { usePlayback, useData, useUserData, usePlayerActions } from '../context/PlayerContext';
import { MOOD_MIXES } from '../data/moodMixes';
import ReciterAvatar from '../components/ReciterAvatar';
import './Playlists.css';

const Playlists = () => {
  const { currentTrack } = usePlayback();
  const { reciters = [], surahs = [] } = useData();
  const {
    favouriteSurahIds, favouriteReciterIds, downloadedTracks,
    bookmarkedVerses = [], customPlaylists = [],
  } = useUserData();
  const {
    toggleFavouriteReciter, setTrack, openPlayer, setSleepTimer,
    removeTrack, toggleBookmark,
    createPlaylist, renamePlaylist, deletePlaylist, addSurahToPlaylist, removeSurahFromPlaylist,
  } = usePlayerActions();

  const [selectedPlaylistKey, setSelectedPlaylistKey] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showAddSurahModal, setShowAddSurahModal] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // Followed Qaris / Reciters objects (handles both string and number IDs)
  const isReciterFav = (id) =>
    favouriteReciterIds.has(id) ||
    favouriteReciterIds.has(String(id)) ||
    (!isNaN(Number(id)) && favouriteReciterIds.has(Number(id)));

  const isSurahFav = (id) =>
    favouriteSurahIds.has(id) ||
    favouriteSurahIds.has(String(id)) ||
    (!isNaN(Number(id)) && favouriteSurahIds.has(Number(id)));

  const followedReciters = reciters.filter(r => isReciterFav(r.id));

  // System playlists
  const systemPlaylists = {
    bookmarks: {
      name: 'Bookmarked Verses',
      type: 'verses',
      items: bookmarkedVerses,
      bgClass: 'fav-card',
    },
    downloads: {
      name: 'Offline Downloads',
      type: 'surahs',
      surahs: downloadedTracks.map(t => {
        const found = surahs.find(s => s.id === t.surahId);
        return found || {
          id: t.surahId,
          nameEnglish: t.surahName,
          nameArabic: t.surahArabic || '',
          type: 'Downloaded',
        };
      }),
      bgClass: 'downloads-card',
    },
    favourites: {
      name: 'Favourites',
      type: 'surahs',
      surahs: surahs.filter(s => isSurahFav(s.id)),
      bgClass: 'fav-card',
    },
    focus: {
      name: 'Focus & Work',
      type: 'surahs',
      surahs: surahs.filter(s => s.verseCount >= 100),
      bgClass: 'focus-card',
    },
    beautiful: {
      name: 'Most Beautiful Recitations',
      type: 'surahs',
      surahs: surahs.filter(s => [36, 55, 56, 67, 18, 19, 12, 20, 44].includes(s.id)),
      bgClass: 'beautiful-card',
    },
    sleep: {
      name: 'Sleep Mode',
      type: 'surahs',
      surahs: surahs.filter(s => s.id >= 78),
      bgClass: 'sleep-card',
    },
  };

  // Check if selected key is custom playlist
  const isCustom = selectedPlaylistKey?.startsWith('custom_');
  const customPlaylistObj = isCustom
    ? customPlaylists.find(p => `custom_${p.id}` === selectedPlaylistKey)
    : null;

  let selectedPlaylist = null;
  if (isCustom && customPlaylistObj) {
    selectedPlaylist = {
      id: customPlaylistObj.id,
      name: customPlaylistObj.name,
      type: 'surahs',
      isCustom: true,
      surahs: (customPlaylistObj.surahIds || [])
        .map(id => surahs.find(s => s.id === id))
        .filter(Boolean),
      bgClass: 'custom-card',
    };
  } else if (selectedPlaylistKey) {
    selectedPlaylist = systemPlaylists[selectedPlaylistKey];
  }

  const handleCreatePlaylist = (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    createPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setShowCreateModal(false);
  };

  const handlePlaySurah = (surah, playlist) => {
    if (selectedPlaylistKey === 'downloads') {
      const track = downloadedTracks.find(t => t.surahId === surah.id);
      if (track) {
        setTrack(surah, { id: track.reciterId, name: track.reciterName, offlineAudioUrl: track.audioUrl, offlineSurahId: track.surahId }, [surah], 0);
        openPlayer();
        return;
      }
    }
    const startIndex = playlist.surahs.findIndex(s => s.id === surah.id);
    setTrack(surah, currentTrack.reciter, playlist.surahs, startIndex);
    if (playlist.name === 'Sleep Mode') {
      setSleepTimer(30);
    }
    openPlayer();
  };

  const handlePlayVerse = (bv) => {
    const surah = surahs.find(s => s.id === bv.surahId);
    if (surah) {
      const idx = surahs.findIndex(s => s.id === surah.id);
      setTrack(surah, currentTrack.reciter, surahs, idx >= 0 ? idx : 0);
      openPlayer();
    }
  };

  const handlePlayAll = () => {
    if (!selectedPlaylist) return;
    if (selectedPlaylist.type === 'verses' && selectedPlaylist.items.length > 0) {
      handlePlayVerse(selectedPlaylist.items[0]);
    } else if (selectedPlaylist.surahs && selectedPlaylist.surahs.length > 0) {
      handlePlaySurah(selectedPlaylist.surahs[0], selectedPlaylist);
    }
  };

  if (selectedPlaylist) {
    const itemCount = selectedPlaylist.type === 'verses'
      ? selectedPlaylist.items.length
      : selectedPlaylist.surahs.length;

    return (
      <div className="playlists-page detail-view">
        <div className={`playlist-header glass-panel ${selectedPlaylist.bgClass}`}>
          <button className="back-btn icon-btn dark" onClick={() => setSelectedPlaylistKey(null)}>
            <ArrowLeft size={24} color="#fff" />
          </button>
          <div className="playlist-header-info">
            {renaming ? <form className="playlist-rename-form" onSubmit={e => { e.preventDefault(); renamePlaylist(selectedPlaylist.id, renameValue); setRenaming(false); }}><input aria-label="Playlist name" value={renameValue} onChange={e => setRenameValue(e.target.value)} maxLength={50} required autoFocus/><button aria-label="Save playlist name"><Check size={18}/></button><button type="button" aria-label="Cancel rename" onClick={() => setRenaming(false)}><X size={18}/></button></form> : <h1>{selectedPlaylist.name}</h1>}
            <p>{itemCount} {selectedPlaylist.type === 'verses' ? 'bookmarked verses' : 'surahs'}</p>
          </div>
          <div className="header-actions-right">
            {selectedPlaylist.isCustom && <button aria-label="Rename playlist" className="icon-btn dark" onClick={() => { setRenameValue(selectedPlaylist.name); setRenaming(true); }}><Pencil size={18}/></button>}
            {selectedPlaylist.isCustom && (
              <button
                className="add-surah-btn icon-btn dark"
                onClick={() => setShowAddSurahModal(true)}
                title="Add Surah to Playlist"
              >
                <Plus size={20} color="#fff" />
              </button>
            )}
            <button className="play-all-btn" aria-label="Play playlist" disabled={!itemCount} onClick={handlePlayAll}>
              <Play size={24} fill="currentColor" />
            </button>
          </div>
        </div>

        {/* Playlist Content */}
        <div className="playlist-surahs">
          {!itemCount && selectedPlaylist.type !== 'verses' && <div className="playlist-empty-state"><Music size={28}/><h3>Your playlist is empty</h3><p>Add surahs to start listening.</p>{selectedPlaylist.isCustom && <button onClick={() => setShowAddSurahModal(true)}>Add surahs</button>}</div>}
          {selectedPlaylist.type === 'verses' ? (
            selectedPlaylist.items.length === 0 ? (
              <p className="empty-msg">No verses bookmarked yet. Tap the bookmark icon while reading any surah!</p>
            ) : (
              selectedPlaylist.items.map((bv, idx) => {
                const s = surahs.find(item => item.id === bv.surahId);
                return (
                  <div className="playlist-surah-row" key={bv.key} onClick={() => handlePlayVerse(bv)}>
                    <div className="surah-number">{idx + 1}</div>
                    <div className="surah-info">
                      <h4>{s ? s.nameEnglish : `Surah ${bv.surahId}`}: Verse {bv.verseNumber}</h4>
                      <p className="arabic-preview" style={{ fontFamily: 'serif', direction: 'rtl' }}>
                        {bv.verseText}
                      </p>
                    </div>
                    <button
                      className="surah-more-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(bv.surahId, bv.verseNumber);
                      }}
                      title="Remove Bookmark"
                    >
                      <Trash2 size={18} color="rgba(255, 255, 255, 0.6)" />
                    </button>
                  </div>
                );
              })
            )
          ) : selectedPlaylist.surahs.length === 0 ? (
            <div className="empty-playlist-box">
              <p>This playlist is empty.</p>
              {selectedPlaylist.isCustom && (
                <button className="add-surahs-action-btn" onClick={() => setShowAddSurahModal(true)}>
                  <Plus size={16} /> Add Surahs to Playlist
                </button>
              )}
            </div>
          ) : (
            selectedPlaylist.surahs.map((surah, idx) => {
              const isPlaying = currentTrack.surah.id === surah.id;
              return (
                <div
                  className={`playlist-surah-row ${isPlaying ? 'active' : ''}`}
                  key={surah.id}
                  onClick={() => handlePlaySurah(surah, selectedPlaylist)}
                >
                  <div className="surah-number">{idx + 1}</div>
                  <div className="surah-info">
                    <h4>{surah.nameEnglish}</h4>
                    <p>{surah.nameArabic} • {surah.type}</p>
                  </div>
                  {selectedPlaylist.isCustom ? (
                    <button
                      className="surah-more-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSurahFromPlaylist(selectedPlaylist.id, surah.id);
                      }}
                      title="Remove from playlist"
                    >
                      <Trash2 size={18} color="rgba(255, 255, 255, 0.6)" />
                    </button>
                  ) : (
                    <span className="surah-more-btn" aria-hidden="true"><Play size={18}/></span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal: Add Surah to Custom Playlist */}
        {showAddSurahModal && selectedPlaylist.isCustom && (
          <div className="modal-overlay" onClick={() => setShowAddSurahModal(false)}>
            <div role="dialog" aria-label="Add surahs" className="surah-picker-modal" onClick={(e) => e.stopPropagation()}>
              <div className="picker-header">
                <h3>Add Surah to Playlist</h3>
                <button className="icon-btn dark" onClick={() => setShowAddSurahModal(false)}>
                  <X size={20} color="#fff" />
                </button>
              </div>
              <input aria-label="Search surahs to add" placeholder="Find a surah…" value={pickerSearch} onChange={e => setPickerSearch(e.target.value)}/>
              <div className="surah-picker-list">
                {surahs.filter(s => `${s.id} ${s.nameEnglish} ${s.nameArabic}`.toLowerCase().includes(pickerSearch.toLowerCase())).map(s => {
                  const inPlaylist = selectedPlaylist.surahs.some(existing => existing.id === s.id);
                  return (
                    <div
                      key={s.id}
                      role="button" tabIndex={0} aria-label={`${inPlaylist ? 'Remove' : 'Add'} ${s.nameEnglish}`}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}
                      className={`picker-row ${inPlaylist ? 'added' : ''}`}
                      onClick={() => {
                        if (inPlaylist) {
                          removeSurahFromPlaylist(selectedPlaylist.id, s.id);
                        } else {
                          addSurahToPlaylist(selectedPlaylist.id, s.id);
                        }
                      }}
                    >
                      <span className="picker-num">{s.id}</span>
                      <div className="picker-info">
                        <h5>{s.nameEnglish}</h5>
                        <p>{s.nameArabic}</p>
                      </div>
                      {inPlaylist ? <Check size={18} color="currentColor" /> : <Plus size={18} color="currentColor" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const handlePlayMoodMix = (mix) => {
    if (!surahs?.length || !reciters?.length) return;
    const matchedReciter = reciters.find(r => r.name.toLowerCase().includes(mix.reciterName.toLowerCase())) || reciters[0];
    const mixSurahs = mix.surahIds.map(id => surahs.find(s => s.id === id)).filter(Boolean);
    if (mixSurahs.length > 0) {
      setTrack(mixSurahs[0], matchedReciter, mixSurahs, 0);
      openPlayer();
    }
  };

  return (
    <div className={`playlists-page ${selectedPlaylistKey ? 'detail-view' : ''}`}>
      {/* ── Top Header ── */}
      <div className="playlists-header">
        <h1>Playlists</h1>
        <button
          className="create-playlist-btn"
          onClick={() => setShowCreateModal(true)}
          title="Create New Playlist"
          aria-label="Create New Playlist"
        >
          <Plus size={18} />
          <span>New</span>
        </button>
      </div>

      {/* ── Made For You Mood Mixes (Clean Spotify-like Cards) ── */}
      <div className="section-mood-mixes">
        <div className="section-header">
          <h2>Made For You</h2>
          <span className="mood-badge-top">Curated Mood Mixes</span>
        </div>

        <div className="mood-mixes-scroll">
          {MOOD_MIXES.map((mix) => (
            <div
              key={mix.id}
              className="mood-mix-card glass-panel"
              style={{
                background: mix.gradient,
                borderColor: mix.border,
              }}
              onClick={() => {
                const targetReciter = reciters.find(r => r.name.toLowerCase().includes(mix.reciterName.toLowerCase())) || reciters[0];
                const mixSurahs = mix.surahIds.map(id => surahs.find(s => s.id === id)).filter(Boolean);
                if (mixSurahs.length > 0 && targetReciter) {
                  setTrack(mixSurahs[0], targetReciter, mixSurahs, 0);
                  openPlayer();
                }
              }}
            >
              <div className="mood-mix-header">
                <span className="mood-mix-badge">{mix.badge}</span>
                <span className="mood-mix-duration">{mix.duration}</span>
              </div>

              <div className="mood-mix-content">
                <h3 className="mood-mix-title">{mix.title}</h3>
                <p className="mood-mix-subtitle">{mix.subtitle}</p>
              </div>

              <div className="mood-mix-footer">
                <span className="mood-mix-reciter">🎙️ {mix.reciterName}</span>
                <button
                  className="mood-mix-play-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    const targetReciter = reciters.find(r => r.name.toLowerCase().includes(mix.reciterName.toLowerCase())) || reciters[0];
                    const mixSurahs = mix.surahIds.map(id => surahs.find(s => s.id === id)).filter(Boolean);
                    if (mixSurahs.length > 0 && targetReciter) {
                      setTrack(mixSurahs[0], targetReciter, mixSurahs, 0);
                      openPlayer();
                    }
                  }}
                  title="Play Mix"
                >
                  <Play size={12} fill="currentColor" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px', marginTop: '24px' }}>
        Your Collections
      </h2>

      <div className="playlists-grid">
        {/* Custom Playlists created by User */}
        {customPlaylists.map(pl => (
          <div
            key={pl.id}
            className="playlist-card glass-panel custom-card"
            onClick={() => setSelectedPlaylistKey(`custom_${pl.id}`)}
            style={{ cursor: 'pointer' }}
          >
            <button
              className="delete-playlist-corner"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete playlist "${pl.name}"?`)) {
                  deletePlaylist(pl.id);
                }
              }}
              title="Delete Playlist"
            >
              <Trash2 size={14} color="currentColor" />
            </button>
            <div className="playlist-icon-badge"><Music size={20} color="var(--text-primary)" /></div>
            <div className="playlist-card-info">
              <h3>{pl.name}</h3>
              <span className="playlist-count">{pl.surahIds?.length || 0} surahs</span>
            </div>
          </div>
        ))}

        {/* System Playlists */}
        <div
          className="playlist-card glass-panel fav-card"
          onClick={() => setSelectedPlaylistKey('bookmarks')}
          style={{ cursor: 'pointer' }}
        >
          <div className="playlist-icon-badge"><Bookmark size={20} fill="var(--text-primary)" color="var(--text-primary)" /></div>
          <div className="playlist-card-info">
            <h3>Bookmarked Verses</h3>
            <span className="playlist-count">{bookmarkedVerses.length} verses saved</span>
          </div>
        </div>

        <div
          className="playlist-card glass-panel downloads-card"
          onClick={() => setSelectedPlaylistKey('downloads')}
          style={{ cursor: 'pointer' }}
        >
          <div className="playlist-icon-badge">
            <Download size={20} color="var(--text-primary)" />
          </div>
          <div className="playlist-card-info">
            <h3>Offline Downloads</h3>
            <span className="playlist-count">
              {downloadedTracks?.length || 0} surahs downloaded
            </span>
          </div>
        </div>

        <div
          className="playlist-card glass-panel fav-card"
          onClick={() => setSelectedPlaylistKey('favourites')}
          style={{ cursor: 'pointer' }}
        >
          <div className="playlist-icon-badge"><Star size={20} fill="var(--text-primary)" color="var(--text-primary)" /></div>
          <div className="playlist-card-info">
            <h3>Favourites</h3>
            <span className="playlist-count">{systemPlaylists.favourites.surahs.length} surahs</span>
          </div>
        </div>

        <div
          className="playlist-card glass-panel focus-card"
          onClick={() => setSelectedPlaylistKey('focus')}
          style={{ cursor: 'pointer' }}
        >
          <div className="playlist-icon-badge"><Sparkles size={20} color="var(--text-primary)" /></div>
          <div className="playlist-card-info">
            <h3>Focus &amp; Work</h3>
            <span className="playlist-count">{systemPlaylists.focus.surahs.length} surahs</span>
          </div>
        </div>

        <div
          className="playlist-card glass-panel beautiful-card"
          onClick={() => setSelectedPlaylistKey('beautiful')}
          style={{ cursor: 'pointer' }}
        >
          <div className="playlist-icon-badge"><Heart size={20} color="var(--text-primary)" /></div>
          <div className="playlist-card-info">
            <h3>Most Beautiful Recitations</h3>
            <span className="playlist-count">{systemPlaylists.beautiful.surahs.length} surahs</span>
          </div>
        </div>

        <div
          className="playlist-card glass-panel sleep-card"
          onClick={() => setSelectedPlaylistKey('sleep')}
          style={{ cursor: 'pointer' }}
        >
          <div className="playlist-icon-badge"><Moon size={20} color="var(--text-primary)" /></div>
          <div className="playlist-card-info">
            <h3>Sleep Mode</h3>
            <span className="playlist-count">{systemPlaylists.sleep.surahs.length} surahs</span>
          </div>
        </div>
      </div>

      {/* ── Followed Qaris / Reciters Section ── */}
      <div className="section-header-qaris">
        <h2>Followed Qaris</h2>
        <span className="qaris-count">{followedReciters.length} Qaris followed</span>
      </div>

      {followedReciters.length === 0 ? (
        <div className="empty-qaris-banner glass-panel">
          <Heart size={22} color="currentColor" />
          <p>No Qaris followed yet. Tap the heart icon on any reciter to add them here!</p>
        </div>
      ) : (
        <div className="followed-qaris-grid">
          {followedReciters.map(reciter => (
            <div
              key={reciter.id}
              className="qari-card glass-panel"
              onClick={() => {
                setTrack(surahs[0], reciter, surahs, 0);
                openPlayer();
              }}
            >
              <div className="qari-avatar-wrap">
                <ReciterAvatar name={reciter.name} src={reciter.avatar} alt={reciter.name} />
              </div>
              <div className="qari-info">
                <h4>{reciter.name}</h4>
                <p>{reciter.country || 'Quran Reciter'}</p>
              </div>
              <div className="qari-actions">
                <button
                  className="qari-unfollow-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavouriteReciter(reciter.id);
                  }}
                  title="Unfollow Qari"
                >
                  <Heart size={16} fill="currentColor" color="currentColor" />
                </button>
                <button className="qari-play-btn" title="Play Recitations">
                  <Play size={16} fill="currentColor" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create New Custom Playlist */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <form role="dialog" aria-label="Create playlist" className="create-playlist-modal" onSubmit={handleCreatePlaylist} onClick={(e) => e.stopPropagation()}>
            <div className="cp-header">
              <h3>Create Custom Playlist</h3>
              <button type="button" className="icon-btn dark" onClick={() => setShowCreateModal(false)}>
                <X size={20} color="#fff" />
              </button>
            </div>
            <input
              type="text"
              aria-label="New playlist name" maxLength={50}
              placeholder="Playlist Name (e.g. Tahajjud, Morning)"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              autoFocus
              required
            />
            <button type="submit" className="cp-submit-btn">
              Create Playlist
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Playlists;


