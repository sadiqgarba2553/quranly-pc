import { useState, useMemo, useCallback, memo } from 'react';
import { Search, ChevronRight, Loader, WifiOff } from 'lucide-react';
import { useData, useUIState, usePlayerActions } from '../context/PlayerContext';
import GlassCard from '../components/GlassCard';
import ReciterAvatar from '../components/ReciterAvatar';
import ReciterProfile from '../components/ReciterProfile';
import ErrorBoundary from '../components/ErrorBoundary';
import './Reciters.css';

const ReciterCircle = memo(({ reciter, onClick }) => (
  <div
    className="reciter-circle"
    onClick={() => onClick(reciter)}
    role="button" tabIndex={0} aria-label={`View ${reciter.name} profile`}
    onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onClick(reciter);}}}
    style={{ cursor: 'pointer' }}
  >
    <div className="circle-img-wrap">
      <ReciterAvatar name={reciter.name} src={reciter.avatar} alt={reciter.name} width={56} height={56} />
      {reciter.moshaf?.length > 1 && (
        <span className="moshaf-badge">{reciter.moshaf.length}</span>
      )}
    </div>
    <p className="reciter-name">{reciter.name}</p>
  </div>
));
ReciterCircle.displayName = 'ReciterCircle';

const Reciters = () => {
  const { reciters, apiLoading, apiError } = useData();
  const { activeProfileReciter } = useUIState();
  const { openReciterProfile } = usePlayerActions();
  const [searchQuery, setSearchQuery] = useState('');
  const [localProfileReciter, setLocalProfileReciter] = useState(null);

  const displayReciter = activeProfileReciter || localProfileReciter;
  const safeReciters = useMemo(() => Array.isArray(reciters) ? reciters : [], [reciters]);

  // Filter by search
  const allFiltered = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return safeReciters.filter(r =>
      r?.name?.toLowerCase().includes(q) ||
      (r?.country && r.country.toLowerCase().includes(q))
    );
  }, [searchQuery, safeReciters]);

  // Open Spotify-style Reciter Profile
  const handleReciterClick = useCallback((reciter) => {
    if (reciter) openReciterProfile(reciter);
  }, [openReciterProfile]);

  // Group by letter
  const topReciters = useMemo(() => safeReciters.slice(0, 5), [safeReciters]);
  const { byLetter, sortedLetters } = useMemo(() => {
    const grouped = safeReciters.reduce((acc, r) => {
      if (!r) return acc;
      const key = (r.letter || r.name?.[0] || '#').toUpperCase();
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    }, {});
    return { byLetter: grouped, sortedLetters: Object.keys(grouped).sort() };
  }, [safeReciters]);

  // If a reciter profile is open, show Spotify-style ReciterProfile
  if (displayReciter) {
    return (
      <ErrorBoundary>
        <ReciterProfile
          reciter={displayReciter}
          onBack={() => {
            openReciterProfile(null);
            setLocalProfileReciter(null);
          }}
        />
      </ErrorBoundary>
    );
  }

  return (
    <div className="reciters-page">
      <div className="search-bar glass-panel">
        <Search size={20} color="currentColor" />
        <input
          type="text"
          placeholder="Search reciters..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <h1>Reciters</h1>

      {apiLoading && (
        <div className="api-loading-center">
          <Loader size={32} className="spin" />
          <p>Loading reciters from MP3Quran…</p>
        </div>
      )}

      {apiError && !apiLoading && (
        <GlassCard className="api-error-card">
          <WifiOff size={24} color="currentColor" />
          <div>
            <p className="api-error-title">Could not load live data</p>
            <p className="api-error-sub">Showing offline reciters.</p>
          </div>
        </GlassCard>
      )}

      {!apiLoading && allFiltered ? (
        <div className="search-results">
          {allFiltered.length === 0 && (
            <p className="no-results">No reciters found for "{searchQuery}"</p>
          )}
          <div className="horizontal-scroll" style={{ flexWrap: 'wrap', gap: '16px' }}>
            {allFiltered.map(r => (
              <ReciterCircle key={r.id} reciter={r} onClick={handleReciterClick} />
            ))}
          </div>
        </div>
      ) : !apiLoading ? (
        <>
          <GlassCard className="top-reciters-card">
            <div className="overlapping-avatars">
              {topReciters.slice(0, 3).map((r, i) => (
                <div key={r.id || i} className={`top-avatar-wrap av${i + 1}`}>
                  <ReciterAvatar name={r.name} src={r.avatar} alt={r.name} width={48} height={48} />
                </div>
              ))}
            </div>
            <div className="top-reciters-info">
              <div>
                <h3>Top Reciters</h3>
                <p>{safeReciters.length} available</p>
              </div>
              <ChevronRight size={22} color="var(--text-primary)" />
            </div>
          </GlassCard>

          {sortedLetters.map((letter) => (
            <div key={letter}>
              <div className="section-header">
                <h2 className="section-title">{letter}</h2>
              </div>
              <div className="horizontal-scroll">
                {byLetter[letter].map(r => (
                  <ReciterCircle key={r.id} reciter={r} onClick={handleReciterClick} />
                ))}
              </div>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
};

export default Reciters;


