import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Radio as RadioIcon, Loader, WifiOff, Search } from 'lucide-react';
import { useData, usePlayback, usePlayerActions } from '../context/PlayerContext';
import GlassCard from '../components/GlassCard';
import './Radio.css';

const Radio = () => {
  const { radios = [], apiLoading } = useData();
  const { isPlaying } = usePlayback();
  const { pause } = usePlayerActions();
  const [playing, setPlaying] = useState(null); // currently playing radio id
  const [loading, setLoading] = useState(false);
  const [radioError, setRadioError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const radioAudioRef = useRef(null);

  const safeRadios = Array.isArray(radios) ? radios : [];

  // Create a persistent radio audio element
  useEffect(() => {
    radioAudioRef.current = new Audio();
    radioAudioRef.current.preload = 'none';
    return () => {
      radioAudioRef.current?.pause();
      radioAudioRef.current = null;
    };
  }, []);

  // Stop radio when the main Quran player starts
  useEffect(() => {
    if (isPlaying && playing != null) {
      radioAudioRef.current?.pause();
      setPlaying(null);
      setLoading(false);
    }
  }, [isPlaying, playing]);

  const stopRadio = () => {
    radioAudioRef.current?.pause();
    setPlaying(null);
    setLoading(false);
  };

  const handlePlay = (radio) => {
    const radioAudio = radioAudioRef.current;
    if (!radioAudio) return;

    // Stop if same station
    if (playing === radio.id) {
      stopRadio();
      return;
    }

    // Avoid clashing with the main player
    if (isPlaying && typeof pause === 'function') {
      pause();
    }

    setRadioError(null);
    setLoading(true);
    setPlaying(radio.id);
    const streamUrl = (radio.url || '').replace(/^http:\/\//i, 'https://');
    radioAudio.src = streamUrl;

    radioAudio.onerror = () => {
      setRadioError(`Could not connect to ${radio.name}`);
      setLoading(false);
      setPlaying(null);
    };
    radioAudio.oncanplay = () => setLoading(false);
    radioAudio.onwaiting = () => setLoading(true);
    radioAudio.onplaying = () => setLoading(false);

    radioAudio.play().catch(() => {
      setRadioError('Could not play this stream. Try another station.');
      setLoading(false);
      setPlaying(null);
    });
  };

  const filtered = searchQuery
    ? safeRadios.filter(r =>
        (r.name && r.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.reciter_name && r.reciter_name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : safeRadios;

  return (
    <div className="radio-page">
      <h1>Radio Stations</h1>

      {/* Hero Banner */}
      <GlassCard className="radio-banner">
        <div className="radio-banner-icon">
          <RadioIcon size={24} className="accent-icon" />
        </div>
        <div className="radio-banner-text">
          <h3>Live Broadcasts</h3>
          <p>24/7 continuous Quran recitations from around the world</p>
        </div>
      </GlassCard>

      {/* Search Bar */}
      <div className="radio-search-bar glass-panel">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Search radio stations or reciters…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Error banner */}
      {radioError && (
        <div className="radio-error-banner">
          <WifiOff size={18} color="currentColor" />
          <span>{radioError}</span>
        </div>
      )}

      {/* Loading state */}
      {apiLoading && (
        <div className="radio-loading">
          <Loader size={22} className="spin" />
          <span>Loading live stations…</span>
        </div>
      )}

      {/* Stations list */}
      <div className="radio-stations-list">
        {!apiLoading && filtered.length === 0 && (
          <div className="radio-empty-state">
            <RadioIcon size={28} className="accent-icon" />
            <p>{searchQuery ? 'No stations match your search.' : 'No radio stations available right now.'}</p>
          </div>
        )}
        {filtered.map((station) => {
          const isThisPlaying = playing === station.id;
          return (
            <GlassCard
              key={station.id}
              className={`radio-station-card ${isThisPlaying ? 'playing' : ''}`}
              onClick={() => handlePlay(station)}
            >
              <div className="station-left">
                <button className={`station-play-btn ${isThisPlaying ? 'playing' : ''}`}>
                  {isThisPlaying && loading ? (
                    <Loader size={18} className="spin" />
                  ) : isThisPlaying ? (
                    <Pause size={18} fill="currentColor" />
                  ) : (
                    <Play size={18} fill="currentColor" style={{ marginLeft: '2px' }} />
                  )}
                </button>

                <div className="station-info">
                  <h4>{station.name}</h4>
                  {station.reciter_name && <p>{station.reciter_name}</p>}
                </div>
              </div>

              {isThisPlaying && !loading && (
                <div className="radio-live-badge">
                  <span className="live-dot"></span>
                  <span>LIVE</span>
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};

export default Radio;
