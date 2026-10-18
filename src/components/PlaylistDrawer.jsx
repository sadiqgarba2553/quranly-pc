import { useState } from 'react';
import { Search, Shuffle, Repeat, Repeat1, Menu } from 'lucide-react';
import { usePlayback, useData, usePlayerActions } from '../context/PlayerContext';
import './PlaylistDrawer.css';

const PlaylistDrawer = () => {
  const { queue: savedQueue, currentTrack, repeatMode, shuffleOn } = usePlayback();
  const { surahs } = useData();
  const available = currentTrack?.reciter?.moshaf?.[currentTrack.moshafIndex || 0]?.surah_list;
  const supportedIds = available ? new Set(String(available).split(',').map(Number)) : null;
  const queue = savedQueue.length ? savedQueue : surahs.filter(s => !supportedIds || supportedIds.has(s.id));
  const { setTrack, shuffleQueue, toggleRepeat, togglePlaylistDrawer } = usePlayerActions();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredQueue = queue.filter(s =>
    String(s.nameEnglish || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(s.nameArabic || '').includes(searchQuery) ||
    String(s.meaning || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="drawer-overlay" onClick={togglePlaylistDrawer}>
      <div className="playlist-drawer" role="dialog" aria-label="Surah queue" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h3>Continue Playing</h3>
          <div className="drawer-actions">
            <button
              className={`icon-btn dark ${shuffleOn ? 'btn-active' : ''}`}
              onClick={shuffleQueue}
            >
              <Shuffle size={18} color={shuffleOn ? 'var(--text-primary)' : 'var(--text-primary)'} />
            </button>
            <button
              className={`icon-btn dark ${repeatMode !== 'off' ? 'btn-active' : ''}`}
              onClick={toggleRepeat}
            >
              {repeatMode === 'one'
                ? <Repeat1 size={18} color="currentColor" />
                : <Repeat size={18} color={repeatMode === 'all' ? 'var(--text-primary)' : 'var(--text-primary)'} />
              }
            </button>
          </div>
        </div>

        <div className="search-bar drawer-search">
          <Search size={20} color="currentColor" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="queue-list">
          {filteredQueue.map((surah) => {
            const isCurrentTrack = currentTrack.surah.id === surah.id;
            const originalIndex = queue.findIndex(s => s.id === surah.id);
            return (
              <button
                className={`queue-item ${isCurrentTrack ? 'current' : ''}`}
                key={surah.id}
                onClick={() => setTrack(surah, currentTrack.reciter, queue, originalIndex, currentTrack.moshafIndex || 0)}
              >
                <span className={`queue-index ${isCurrentTrack ? 'highlight' : ''}`}>
                  {surah.id}
                </span>
                <div className="queue-info">
                  <h4>{surah.nameEnglish} ({surah.nameArabic})</h4>
                  <p>{surah.meaning}</p>
                </div>
                <Menu size={20} color="currentColor" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlaylistDrawer;


