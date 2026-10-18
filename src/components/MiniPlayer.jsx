import { memo } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Maximize2 } from 'lucide-react';
import { usePlayback, usePlayerActions, useCurrentTime } from '../context/PlayerContext';
import ReciterAvatar from './ReciterAvatar';
import './MiniPlayer.css';

const clock = value => { const s = Math.max(0, Math.floor(value || 0)); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; };
function CompactTimeline({duration}) {
  const time = useCurrentTime();
  const { seek } = usePlayerActions();
  return <div className="compact-timeline"><span>{clock(time)}</span><input type="range" className="audio-range" min="0" max={duration || 1} step="0.1" value={Math.min(time,duration || 0)} disabled={!duration} aria-label="Seek from playback bar" onChange={event => seek(Number(event.target.value))}/><span>{clock(duration)}</span></div>;
}
const MiniPlayer = memo(() => {
  const { currentTrack, isPlaying, isBuffering, audioError, duration, volume } = usePlayback();
  const { togglePlay, playNext, playPrev, openPlayer, setVolume } = usePlayerActions();
  if (!currentTrack?.surah || !currentTrack?.reciter) return null;
  const { surah, reciter } = currentTrack;
  return <section className="mini-player" aria-label="Playback controls">
    <button className="compact-track" onClick={openPlayer} aria-label="Open full player"><span className="compact-avatar"><ReciterAvatar name={reciter.name} src={reciter.avatar}/></span><span className="compact-track-text"><strong>{surah.nameEnglish}</strong><small>{audioError ? 'Audio unavailable · select Play to retry' : isBuffering && isPlaying ? 'Loading audio…' : reciter.name}</small></span></button>
    <div className="compact-center"><div className="compact-transport"><button aria-label="Previous" onClick={playPrev}><SkipBack size={17} fill="currentColor"/></button><button className="compact-play" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={togglePlay}>{isPlaying ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor"/>}</button><button aria-label="Next" onClick={playNext}><SkipForward size={17} fill="currentColor"/></button></div><CompactTimeline duration={duration}/></div>
    <div className="compact-right"><label className="compact-volume"><Volume2 size={16}/><input type="range" className="audio-range" min="0" max="1" step="0.01" value={volume} aria-label="Playback bar volume" onChange={event => setVolume(Number(event.target.value))}/></label><button className="compact-expand" aria-label="Expand player" title="Expand player" onClick={openPlayer}><Maximize2 size={17}/></button></div>
  </section>;
});
MiniPlayer.displayName = 'MiniPlayer';
export default MiniPlayer;
