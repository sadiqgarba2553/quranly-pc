import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Check, Search } from 'lucide-react';
import { usePlayback, usePlayerActions } from '../context/PlayerContext';
import sounds, { getSoundIcon } from '../data/sounds';
import './SoundModal.css';

// Inline MinusCircle SVG component
function MinusCircle(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="8" y1="12" x2="16" y2="12"></line>
    </svg>
  );
}

const SoundModal = () => {
  const { activeSound } = usePlayback();
  const { setSound, toggleSoundModal } = usePlayerActions();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSounds = sounds.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (soundId) => {
    setSound(soundId);
  };

  // ── Swipe-to-Dismiss State ─────────────────────────────────
  const [swipeDeltaY, setSwipeDeltaY] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const swipeStartRef = useRef({ y: 0, time: 0 });
  const swipeHistoryRef = useRef([]);

  const rubberband = (overshoot, dimension, constant = 0.55) => {
    return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
  };

  const handleSwipeStart = useCallback((e) => {
    const tag = e.target.tagName;
    if (['INPUT', 'BUTTON', 'A'].includes(tag)) return;
    if (e.target.closest('.sounds-grid') || e.target.closest('.sound-search')) return; // Allow normal scroll in grid

    const clientY = e.clientY;
    swipeStartRef.current = { y: clientY, time: Date.now() };
    swipeHistoryRef.current = [{ y: clientY, t: Date.now() }];
    setIsSwiping(true);

    const onMove = (ev) => {
      const cy = ev.clientY;
      const delta = cy - swipeStartRef.current.y;

      swipeHistoryRef.current.push({ y: cy, t: Date.now() });
      if (swipeHistoryRef.current.length > 5) swipeHistoryRef.current.shift();

      const clamped = delta > 0 ? delta : rubberband(delta, window.innerHeight);
      setSwipeDeltaY(clamped);
    };

    const onEnd = () => {
      setIsSwiping(false);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onEnd);
      document.removeEventListener('pointercancel', onEnd);

      const history = swipeHistoryRef.current;
      let velocityY = 0;
      if (history.length >= 2) {
        const last = history[history.length - 1];
        const first = history[0];
        const dt = (last.t - first.t) / 1000;
        if (dt > 0) velocityY = (last.y - first.y) / dt;
      }

      const currentDelta = swipeStartRef.current.y;
      const finalDelta = (history.length > 0 ? history[history.length - 1].y : currentDelta) - swipeStartRef.current.y;

      if (finalDelta > 80 || velocityY > 400) {
        setIsClosing(true);
        setSwipeDeltaY(window.innerHeight);
        setTimeout(() => {
          toggleSoundModal();
          setIsClosing(false);
          setSwipeDeltaY(0);
        }, 300);
      } else {
        setSwipeDeltaY(0);
      }
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onEnd);
    document.addEventListener('pointercancel', onEnd);
  }, [toggleSoundModal]);

  return (
    <div className={`modal-overlay ${isClosing ? 'closing-overlay' : ''}`} onClick={toggleSoundModal}>
      <div 
        className={`sound-modal ${isClosing ? 'closing' : ''} ${isSwiping ? 'dragging' : ''}`} 
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handleSwipeStart}
        style={{
          transform: swipeDeltaY !== 0 ? `translateY(${swipeDeltaY}px)` : undefined,
          transition: isSwiping ? 'none' : 'transform 0.35s cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      >
        <div className="sheet-drag-handle"><div className="sheet-drag-pill" /></div>
        <div className="modal-header">
          <button className="icon-btn dark" onClick={toggleSoundModal}>
            <X size={20} color="#fff" />
          </button>
          <h3>Background sound</h3>
          <button className="icon-btn light" onClick={toggleSoundModal}>
            <Check size={20} color="#000" />
          </button>
        </div>

        <div className="search-bar sound-search">
          <Search size={20} color="currentColor" />
          <input
            type="text"
            placeholder="Search sounds..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="sounds-grid">
          {filteredSounds.map((sound) => {
            const Icon = sound.iconName === 'MinusCircle' ? MinusCircle : getSoundIcon(sound.iconName);
            const isActive = activeSound === sound.id;
            if (!Icon && sound.iconName !== 'MinusCircle') return null;
            return (
              <div
                key={sound.id}
                className={`sound-item ${isActive ? 'active' : ''}`}
                onClick={() => handleSelect(sound.id)}
              >
                <div className="sound-icon-wrapper">
                  <Icon size={28} color="#fff" />
                  {isActive && <div className="active-badge"><Check size={10} color="#000" strokeWidth={4} /></div>}
                  {sound.type === 'download' && !isActive && (
                    <div className="download-badge">↓</div>
                  )}
                </div>
                <span className="sound-name">{sound.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SoundModal;


