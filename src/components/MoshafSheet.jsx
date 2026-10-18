import { X, Play, Heart } from 'lucide-react';
import { useUserData, usePlayerActions } from '../context/PlayerContext';
import ReciterAvatar from './ReciterAvatar';
import './MoshafSheet.css';

/**
 * MoshafSheet — shows the available moshaf (Quran reading editions) for a reciter
 * and lets the user pick one before playing.
 */
const MoshafSheet = ({ reciter, surahs, onSelect, onClose }) => {
  const { favouriteReciterIds } = useUserData();
  const { toggleFavouriteReciter } = usePlayerActions();
  if (!reciter) return null;

  const hasMoshaf = reciter.moshaf?.length > 0;
  const isFav = favouriteReciterIds.has(reciter.id);

  return (
    <div className="modal-overlay moshaf-overlay" onClick={onClose}>
      <div className="moshaf-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="moshaf-header">
          <div className="moshaf-reciter-info">
            <ReciterAvatar name={reciter.name} src={reciter.avatar} alt={reciter.name} className="moshaf-avatar" />
            <div>
              <h3>{reciter.name}</h3>
              <p>{hasMoshaf ? `${reciter.moshaf.length} edition${reciter.moshaf.length > 1 ? 's' : ''}` : 'No editions available'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="icon-btn dark" onClick={() => toggleFavouriteReciter(reciter.id)}>
              <Heart size={20} fill={isFav ? 'var(--text-primary)' : 'none'} color={isFav ? 'var(--text-primary)' : '#fff'} />
            </button>
            <button className="icon-btn dark" onClick={onClose}>
              <X size={20} color="#fff" />
            </button>
          </div>
        </div>

        <p className="moshaf-subtitle">Choose a reading (riwayah) to play:</p>

        {/* Moshaf list */}
        <div className="moshaf-list">
          {hasMoshaf ? reciter.moshaf.map((m, idx) => (
            <button
              key={m.id}
              className="moshaf-item"
              onClick={() => onSelect(reciter, surahs, idx)}
            >
              <div className="moshaf-item-left">
                <div className="moshaf-index">{idx + 1}</div>
                <div className="moshaf-info">
                  <span className="moshaf-name">{m.name || `Edition ${idx + 1}`}</span>
                  <span className="moshaf-meta">{m.surah_total ?? '?'} surahs</span>
                </div>
              </div>
              <Play size={18} fill="currentColor" color="currentColor" />
            </button>
          )) : (
            <p className="moshaf-empty">No editions found for this reciter.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MoshafSheet;


