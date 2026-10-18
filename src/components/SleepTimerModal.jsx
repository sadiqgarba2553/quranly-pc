import { useState, useRef, useCallback, useEffect } from 'react';
import { Moon, X } from 'lucide-react';
import { usePlayback, usePlayerActions } from '../context/PlayerContext';
import './SleepTimerModal.css';

const SleepTimerModal = () => {
  const { sleepEndTime, sleepMinutes } = usePlayback();
  const { setSleepTimer, toggleSleepTimerModal } = usePlayerActions();

  const presets = [
    { label: '5 min', value: 5 },
    { label: '10 min', value: 10 },
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '45 min', value: 45 },
    { label: '60 min', value: 60 },
    { label: 'End of Surah', value: -1 }, // special: will be handled by context
  ];

  const handleSelect = (minutes) => {
    if (minutes === -1) {
      // "End of Surah" — pause after the current surah ends instead of advancing
      setSleepTimer('endOfSurah');
      toggleSleepTimerModal();
      return;
    }
    setSleepTimer(minutes);
    toggleSleepTimerModal();
  };

  const handleClear = () => {
    setSleepTimer(null);
    toggleSleepTimerModal();
  };

  // Calculate remaining time if timer is active
  let remainingText = null;
  if (sleepEndTime) {
    const remaining = Math.max(0, Math.ceil((sleepEndTime - Date.now()) / 60000));
    remainingText = `${remaining} min remaining`;
  }

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
          toggleSleepTimerModal();
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
  }, [toggleSleepTimerModal]);

  return (
    <div className={`modal-overlay ${isClosing ? 'closing-overlay' : ''}`} onClick={toggleSleepTimerModal}>
      <div 
        className={`sleep-modal ${isClosing ? 'closing' : ''} ${isSwiping ? 'dragging' : ''}`} 
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handleSwipeStart}
        style={{
          transform: swipeDeltaY !== 0 ? `translateY(${swipeDeltaY}px)` : undefined,
          transition: isSwiping ? 'none' : 'transform 0.35s cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      >
        <div className="sheet-drag-handle"><div className="sheet-drag-pill" /></div>
        <div className="sleep-modal-header">
          <Moon size={24} color="currentColor" />
          <h3>Sleep Timer</h3>
          <button className="icon-btn dark" onClick={toggleSleepTimerModal}>
            <X size={20} color="#fff" />
          </button>
        </div>

        {remainingText && (
          <div className="sleep-active-banner">
            <span className="sleep-pulse"></span>
            <span>{remainingText}</span>
            <button className="clear-timer-btn" onClick={handleClear}>Clear</button>
          </div>
        )}

        <div className="sleep-presets">
          {presets.map((preset) => (
            <button
              key={preset.value}
              className={`sleep-preset-btn ${sleepMinutes === preset.value ? 'active' : ''}`}
              onClick={() => handleSelect(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SleepTimerModal;


