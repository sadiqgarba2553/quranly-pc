import { useEffect, useRef } from 'react';
import './AudioWaveform.css';

const AudioWaveform = ({ isPlaying, barCount = 28 }) => {
  const barsRef = useRef([]);

  useEffect(() => {
    let animId;

    const animate = () => {
      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        if (isPlaying) {
          // Dynamic sine + random organic wave motion
          const time = Date.now() * 0.005;
          const height = Math.abs(Math.sin(time + i * 0.45) * 65 + Math.random() * 35);
          bar.style.height = `${Math.max(12, Math.min(height, 95))}%`;
          bar.style.opacity = '0.95';
        } else {
          bar.style.height = '15%';
          bar.style.opacity = '0.4';
        }
      });

      if (isPlaying) {
        animId = requestAnimationFrame(animate);
      }
    };

    if (isPlaying) {
      animId = requestAnimationFrame(animate);
    } else {
      animate();
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying]);

  return (
    <div className="audio-waveform-container" title={isPlaying ? "Audio playing" : "Audio paused"}>
      {Array.from({ length: barCount }).map((_, idx) => (
        <div
          key={idx}
          ref={(el) => (barsRef.current[idx] = el)}
          className={`waveform-bar ${isPlaying ? 'playing' : ''}`}
        />
      ))}
    </div>
  );
};

export default AudioWaveform;


