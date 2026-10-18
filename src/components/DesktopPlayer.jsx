import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Star, Download, Check, BookOpen, Moon, CloudRain, Volume2, Search, Loader, Share2 } from 'lucide-react';
import { usePlayback, useCurrentTime, useUserData, useData, useUIState, usePlayerActions } from '../context/PlayerContext';
import ReciterAvatar from './ReciterAvatar';
import SoundModal from './SoundModal';
import SleepTimerModal from './SleepTimerModal';
import QuranTextModal from './QuranTextModal';
import './DesktopPlayer.css';

const timeLabel = seconds => {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
};

export default function DesktopPlayer() {
  const { currentTrack, isPlaying, duration, isBuffering, audioError, volume, playbackSpeed, repeatMode, shuffleOn, queue, activeSound, soundVolume, sleepEndTime } = usePlayback();
  const currentTime = useCurrentTime();
  const { favouriteSurahIds, downloadingTrackId, downloadProgress } = useUserData();
  const { surahs } = useData();
  const { isSoundModalOpen, isSleepTimerOpen, isQuranTextOpen } = useUIState();
  const { closePlayer, togglePlay, playNext, playPrev, seek, setVolume, cycleSpeed, toggleRepeat, shuffleQueue, toggleFavouriteSurah, downloadTrack, isDownloaded, toggleQuranText, toggleSoundModal, toggleSleepTimerModal, setTrack, setSoundVolume } = usePlayerActions();
  const [query, setQuery] = useState('');
  const [scrub, setScrub] = useState(null);
  const [notice, setNotice] = useState('');
  const closeRef = useRef(null);
  const noticeTimer = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    closeRef.current?.focus();
    return () => { previous?.focus(); clearTimeout(noticeTimer.current); };
  }, []);
  const playQueue = useMemo(() => {
    if (queue.length) return queue;
    const available = currentTrack?.reciter?.moshaf?.[currentTrack.moshafIndex || 0]?.surah_list;
    if (!available) return surahs;
    const ids = new Set(String(available).split(',').map(Number));
    return surahs.filter(s => ids.has(s.id));
  }, [queue, surahs, currentTrack]);
  const filteredQueue = useMemo(() => {
    const term = query.trim().toLowerCase();
    return playQueue.filter(s => `${s.id} ${s.nameEnglish} ${s.nameArabic} ${s.meaning || ''}`.toLowerCase().includes(term));
  }, [playQueue, query]);
  if (!currentTrack?.surah || !currentTrack?.reciter) return null;
  const { surah, reciter } = currentTrack;
  const favourite = favouriteSurahIds.has(surah.id);
  const downloaded = isDownloaded(surah.id, reciter.id);
  const downloading = downloadingTrackId === `${surah.id}_${reciter.id}`;
  const showNotice = message => { setNotice(message); clearTimeout(noticeTimer.current); noticeTimer.current = setTimeout(() => setNotice(''), 3000); };
  const download = async () => {
    try { const result = await downloadTrack(surah,reciter); showNotice(result?.ok ? 'Saved to Downloads for offline listening.' : result?.error || 'Could not save this recitation.'); }
    catch (error) { showNotice(error.message || 'Could not download. Please try again.'); }
  };
  const share = async () => {
    try { await navigator.clipboard.writeText(`${surah.nameEnglish} — ${reciter.name}\nhttps://quran.com/${surah.id}`); showNotice('Listening link copied.'); }
    catch { showNotice('Could not copy the link.'); }
  };
  const commitSeek = event => { const value = Number(event.currentTarget.value); seek(value); setScrub(null); };
  return <section ref={closeRef} tabIndex={-1} className="player-workspace" role="region" aria-label="Now playing">
    <header className="workspace-header">
      <button className="workspace-back" onClick={closePlayer}><ArrowLeft size={18}/><span>Back to library</span></button>
      <span className="workspace-caption">NOW PLAYING</span>
      <span className="workspace-shortcut">Esc to close</span>
    </header>
    <div className="workspace-layout">
      <div className="workspace-stage">
        <div className="workspace-artwork"><ReciterAvatar name={reciter.name} src={reciter.avatar} alt={reciter.name}/><span className="workspace-surah-number">SURAH {String(surah.id).padStart(2,'0')}</span></div>
        <div className="workspace-track-heading"><p className="workspace-arabic" lang="ar" dir="rtl">{surah.nameArabic}</p><h1>{surah.nameEnglish}</h1><p>{reciter.name}</p></div>
        <div className="workspace-timeline">
          <label className="sr-only" htmlFor="workspace-seek">Seek recitation</label>
          <input id="workspace-seek" className="audio-range" type="range" min="0" max={duration || 1} step="0.1" value={Math.min(scrub ?? currentTime, duration || 0)} disabled={!duration} onChange={event => setScrub(Number(event.target.value))} onPointerUp={commitSeek} onKeyUp={event => { if (['ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(event.key)) commitSeek(event); }} aria-valuetext={`${timeLabel(scrub ?? currentTime)} of ${timeLabel(duration)}`}/>
          <div className="workspace-time"><span>{timeLabel(scrub ?? currentTime)}</span><span>{timeLabel(duration)}</span></div>
        </div>
        <div className="workspace-transport">
          <button className="workspace-icon" aria-label="Shuffle" aria-pressed={shuffleOn} onClick={shuffleQueue}><Shuffle size={19}/></button>
          <button className="workspace-icon transport-skip" aria-label="Previous surah" onClick={playPrev}><SkipBack size={25} fill="currentColor"/></button>
          <button className="workspace-play" aria-label={isPlaying ? 'Pause recitation' : 'Play recitation'} onClick={togglePlay}>{isBuffering && isPlaying ? <Loader className="spin" size={30}/> : isPlaying ? <Pause size={30} fill="currentColor"/> : <Play size={30} fill="currentColor"/>}</button>
          <button className="workspace-icon transport-skip" aria-label="Next surah" onClick={playNext}><SkipForward size={25} fill="currentColor"/></button>
          <button className="workspace-icon" aria-label={`Repeat: ${repeatMode}`} aria-pressed={repeatMode !== 'off'} onClick={toggleRepeat}>{repeatMode === 'one' ? <Repeat1 size={20}/> : <Repeat size={20}/>}</button>
        </div>
        <div className="workspace-toolbar">
          <button className="workspace-tool" aria-pressed={favourite} onClick={() => toggleFavouriteSurah(surah.id)}><Star size={17} fill={favourite ? 'currentColor' : 'none'}/>{favourite ? 'Saved' : 'Save'}</button>
          <button className="workspace-tool" disabled={downloading || downloaded} onClick={download}>{downloaded ? <Check size={17}/> : <Download size={17}/>}<span>{downloading ? `${downloadProgress}%` : downloaded ? 'Downloaded' : 'Download'}</span></button>
          <button className="workspace-tool" onClick={toggleQuranText}><BookOpen size={17}/>Read along</button>
          <button className="workspace-tool" onClick={share}><Share2 size={17}/>Share</button>
        </div>
        <div className="workspace-mixer">
          <label className="workspace-volume"><Volume2 size={17}/><span>Volume</span><input className="audio-range" type="range" min="0" max="1" step="0.01" value={volume} aria-label="Recitation volume" onChange={event => setVolume(Number(event.target.value))}/><output>{Math.round(volume*100)}%</output></label>
          <div className="workspace-options"><button onClick={cycleSpeed} aria-label={`Playback speed ${playbackSpeed} times`}>{playbackSpeed}× speed</button><button onClick={toggleSleepTimerModal} aria-pressed={Boolean(sleepEndTime)}><Moon size={15}/>{sleepEndTime ? 'Timer on' : 'Sleep timer'}</button><button onClick={toggleSoundModal}><CloudRain size={15}/>{activeSound === 'None' ? 'Ambient sound' : activeSound}</button></div>
          {activeSound !== 'None' && <label className="workspace-volume"><CloudRain size={17}/><span>Ambient</span><input className="audio-range" type="range" min="0" max="1" step="0.01" value={soundVolume} aria-label="Ambient volume" onChange={event => setSoundVolume(Number(event.target.value))}/><output>{Math.round(soundVolume*100)}%</output></label>}
        </div>
        <p className="workspace-status" role="status">{notice || audioError || (isBuffering && isPlaying ? 'Loading recitation…' : 'Space to play or pause · Use the sliders to seek and adjust volume')}</p>
      </div>
      <aside className="workspace-queue" aria-label="Surah queue">
        <div className="workspace-queue-heading"><div><p className="workspace-caption">YOUR LISTENING</p><h2>Surah queue</h2></div><span>{playQueue.length}</span></div>
        <label className="workspace-queue-search"><Search size={16}/><input type="search" placeholder="Find a surah" aria-label="Find a surah in queue" value={query} onChange={event => setQuery(event.target.value)}/></label>
        <div className="workspace-queue-list">{filteredQueue.length ? filteredQueue.map(item => <button key={item.id} className={`workspace-queue-item${item.id === surah.id ? ' current' : ''}`} aria-current={item.id === surah.id ? 'true' : undefined} onClick={() => { setScrub(null); setTrack(item,reciter,playQueue,playQueue.findIndex(s => s.id === item.id),currentTrack.moshafIndex || 0); }}><span className="workspace-queue-number">{item.id === surah.id && isPlaying ? <Volume2 size={15}/> : String(item.id).padStart(2,'0')}</span><span className="workspace-queue-name"><strong>{item.nameEnglish}</strong><small>{item.meaning || `${item.verseCount || ''} verses`}</small></span><span className="workspace-queue-arabic" lang="ar" dir="rtl">{item.nameArabic}</span></button>) : <p className="workspace-empty">No surahs match “{query}”.</p>}</div>
      </aside>
    </div>
    {isSoundModalOpen && <SoundModal/>}
    {isSleepTimerOpen && <SleepTimerModal/>}
    {isQuranTextOpen && <QuranTextModal surahId={surah.id} surahName={surah.nameEnglish} surahArabic={surah.nameArabic}/>}
  </section>;
}
