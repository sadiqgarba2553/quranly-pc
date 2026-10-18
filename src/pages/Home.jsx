import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, Play, Loader, Crown, Star, Heart,
  BookOpen, User, Mic, Radio, Volume2, Sparkles, BarChart2, Search as SearchIcon, Shield,
  Sun, CloudRain, Compass, Users
} from 'lucide-react';
import { memo } from 'react';
import {
  usePlayback,
  useData,
  useUserData,
  usePlayerActions,
  useCurrentTime,
} from '../context/PlayerContext';
import ReciterAvatar from '../components/ReciterAvatar';
import DailyAyahWidget from '../components/DailyAyahWidget';
import PrayerTimesWidget from '../components/PrayerTimesWidget';
import GroupKhatmModal from '../components/GroupKhatmModal';
import { MOOD_MIXES } from '../data/moodMixes';
import { MOOD_CATEGORIES } from '../services/moodService';
import './Home.css';

// Isolate currentTime to this tiny subcomponent so the entire Home page NEVER re-renders on playback ticks
const ResumeProgressBar = memo(({ duration }) => {
  const currentTime = useCurrentTime();
  if (!duration || duration <= 0) return null;
  return (
    <div className="resume-progress-bar">
      <div
        className="resume-progress-fill"
        style={{ width: `${Math.min((currentTime / duration) * 100, 100)}%` }}
      />
    </div>
  );
});
ResumeProgressBar.displayName = 'ResumeProgressBar';

const Home = () => {
  const navigate = useNavigate();
  const [activeMoodModal, setActiveMoodModal] = useState(null); // category object
  const [showKhatmModal, setShowKhatmModal] = useState(false);

  const { currentTrack, isPlaying, duration } = usePlayback();
  const { reciters = [], surahs = [], apiLoading } = useData();
  const { favouriteReciterIds, currentUser } = useUserData();
  const { setTrack, openPlayer, togglePlay, openAuthModal } = usePlayerActions();

  // Memoize favourite reciters — prevents re-filtering on every audio time update
  const favouriteReciters = useMemo(() => {
    if (!reciters || !favouriteReciterIds?.has) return [];
    return reciters.filter(r =>
      favouriteReciterIds.has(r.id) ||
      favouriteReciterIds.has(String(r.id)) ||
      (!isNaN(Number(r.id)) && favouriteReciterIds.has(Number(r.id)))
    );
  }, [reciters, favouriteReciterIds]);

  const handleReciterClick = (reciter) => {
    if (surahs?.[0] && reciter) {
      setTrack(surahs[0], reciter, surahs, 0);
      openPlayer();
    }
  };

  const handleContinueListening = () => {
    if (!isPlaying) togglePlay();
    openPlayer();
  };

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
    <div className="home-page">
      {/* Sleek Top Brand Header */}
      <div className="top-header">
        <div className="app-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }} title="Back to Landing Page">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Quranly Logo" className="brand-logo" width={28} height={28} decoding="async" />
          <span className="brand-title">Quranly</span>
        </div>

        <div className="top-actions">
          <button
            className="user-account-btn glass-panel"
            onClick={openAuthModal}
            title={currentUser ? currentUser.displayName || currentUser.email : "Sign In / Account"}
          >
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="User Profile" className="user-avatar-tiny" width={24} height={24} loading="lazy" decoding="async" />
            ) : (
              <User size={15} color="var(--text-primary)" />
            )}
          </button>


          <button
            className="stats-btn glass-panel"
            onClick={() => navigate('/insights')}
            title="Insights & Badges"
          >
            <BarChart2 size={16} color="var(--text-primary)" />
          </button>
        </div>
      </div>

      {/* Hero Feature 1: Ayah of the Day */}
      <DailyAyahWidget />

      {/* Global Search Bar (moved from nav to home screen) */}
      <div 
        className="home-global-search glass-panel" 
        onClick={() => navigate('/search')}
      >
        <SearchIcon size={18} className="search-icon" color="var(--text-secondary)" />
        <span className="search-placeholder">Search reciters, surahs, or verses...</span>
      </div>

      {/* Feature 2: Compact Prayer Times & Qibla Widget */}
      <PrayerTimesWidget />

      {/* Feature 3: Ask the Quran AI Hero Card */}
      <div
        className="ask-ai-home-card glass-panel"
        onClick={() => navigate('/ask-ai')}
      >
        <div className="ask-ai-card-content">
          <div className="ask-ai-badge-row">
            <span className="ask-ai-chip"><Sparkles size={13} color="var(--text-primary)" /> Ask the Quran AI</span>
          </div>
          <h3>Explore Wisdom with AI</h3>
          <p>Semantic search across 6,236 verses, instant explanations &amp; Islamic Q&amp;A</p>
        </div>
        <div className="ask-ai-card-action">
          <button className="ask-ai-go-btn">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Feature 4: Clean Scrollable Feature Quick Grid */}
      <div className="features-2x2-grid">
        <div className="feature-grid-card" onClick={() => navigate('/ask-ai')}>
          <div className="feature-card-icon blue-icon-bg">
            <Sparkles size={20} color="var(--text-primary)" />
          </div>
          <div className="feature-card-info">
            <h4>Ask AI</h4>
            <p>Semantic Search</p>
          </div>
        </div>

        <div className="feature-grid-card" onClick={() => navigate('/memorize')}>
          <div className="feature-card-icon blue-icon-bg">
            <Mic size={20} color="var(--text-primary)" />
          </div>
          <div className="feature-card-info">
            <h4>AI Memorize</h4>
            <p>Voice Recitation Test</p>
          </div>
        </div>

        <div className="feature-grid-card" onClick={() => navigate('/hadith')}>
          <div className="feature-card-icon blue-icon-bg">
            <BookOpen size={20} color="var(--text-primary)" />
          </div>
          <div className="feature-card-info">
            <h4>Hadith Library</h4>
            <p>40,000+ Prophetic Sunnah</p>
          </div>
        </div>

        <div className="feature-grid-card" onClick={() => navigate('/reciters')}>
          <div className="feature-card-icon blue-icon-bg">
            <Volume2 size={20} color="var(--text-primary)" />
          </div>
          <div className="feature-card-info">
            <h4>Qari Reciters</h4>
            <p>{reciters?.length || 100}+ World Qaris</p>
          </div>
        </div>

        <div className="feature-grid-card" onClick={() => navigate('/radio')}>
          <div className="feature-card-icon blue-icon-bg">
            <Radio size={20} color="var(--text-primary)" />
          </div>
          <div className="feature-card-info">
            <h4>Live Radio</h4>
            <p>24/7 Quran Broadcasts</p>
          </div>
        </div>

        <div className="feature-grid-card" onClick={() => navigate('/azkar')}>
          <div className="feature-card-icon blue-icon-bg">
            <Shield size={20} color="var(--text-primary)" />
          </div>
          <div className="feature-card-info">
            <h4>Daily Azkar</h4>
            <p>Hisn al-Muslim &amp; Duas</p>
          </div>
        </div>

        <div className="feature-grid-card" onClick={() => setShowKhatmModal(true)}>
          <div className="feature-card-icon blue-icon-bg" style={{ background: 'var(--card-bg)' }}>
            <Users size={20} color="currentColor" />
          </div>
          <div className="feature-card-info">
            <h4>Group Khatm</h4>
            <p>Shared 30 Juz Goals</p>
          </div>
        </div>
      </div>

      {/* Continue Listening Bar */}
      {currentTrack?.reciter && (
        <div className="recently-played" onClick={handleContinueListening}>
          <div className="recent-avatar">
            <ReciterAvatar name={currentTrack.reciter.name} src={currentTrack.reciter.avatar} alt={currentTrack.reciter.name} />
          </div>
          <div className="recent-info">
            <p className="subtitle">Continue listening</p>
            <h2>{currentTrack.reciter.name}</h2>
            {currentTrack?.surah && (
              <p className="recent-surah-name">{currentTrack.surah.nameEnglish}</p>
            )}
            <ResumeProgressBar duration={duration} />
          </div>
          <button className="continue-btn">
            <Play size={15} fill="currentColor" />
          </button>
        </div>
      )}

      {/* Favourites Section */}
      <div className="section-header">
        <h2 className="section-title">
          <Star size={16} fill="var(--text-primary)" color="var(--text-primary)" style={{ marginRight: 6 }} /> Your favourites
        </h2>
        <button className="see-all" onClick={() => navigate('/reciters')}>See all</button>
      </div>

      <div className="horizontal-scroll">
        {apiLoading ? (
          <div className="api-loading-row">
            <Loader size={20} className="spin" color="var(--text-primary)" />
            <span>Loading reciters…</span>
          </div>
        ) : favouriteReciters.length > 0 ? (
          favouriteReciters.map((reciter) => (
            <div
              className="reciter-circle"
              key={reciter.id}
              onClick={() => handleReciterClick(reciter)}
            >
              <div className="circle-img-wrap">
                <ReciterAvatar name={reciter.name} src={reciter.avatar} alt={reciter.name} />
              </div>
              <p className="reciter-name">{reciter.name}</p>
            </div>
          ))
        ) : (
          <p className="no-favs-msg" style={{ fontSize: '13px', color: 'var(--text-primary)', padding: '10px 0' }}>
            No favourite reciters yet. Tap <Heart size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> on reciters to add them!
          </p>
        )}
      </div>

      {/* Made For You Smart Mood Mixes Section */}
      <div className="section-header">
        <h2 className="section-title">
          <Sparkles size={16} color="var(--text-primary)" style={{ marginRight: 6 }} /> Made For You
        </h2>
        <button className="see-all" onClick={() => navigate('/playlists')}>See all</button>
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
            onClick={() => handlePlayMoodMix(mix)}
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
                  handlePlayMoodMix(mix);
                }}
                title="Play Mix"
              >
                <Play size={12} fill="currentColor" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Curated Mood-Based Guidance Section */}
      <div className="section-header">
        <h2 className="section-title">
          <Heart size={16} color="var(--accent-color)" fill="var(--accent-color)" style={{ marginRight: 6 }} /> How are you feeling today?
        </h2>
      </div>

      <div className="mood-categories-scroll">
        {MOOD_CATEGORIES.map((cat) => {
          const IconComp = cat.iconName === 'Sun' ? Sun :
                           cat.iconName === 'CloudRain' ? CloudRain :
                           cat.iconName === 'Compass' ? Compass :
                           cat.iconName === 'Sparkles' ? Sparkles : Shield;
          return (
            <div 
              key={cat.id} 
              className="mood-pill-chip glass-panel"
              onClick={() => setActiveMoodModal(cat)}
            >
              <div className="mood-icon-badge" style={{ background: cat.bgTint, color: cat.accentColor }}>
                <IconComp size={16} />
              </div>
              <div className="mood-pill-info">
                <span className="mood-pill-title">{cat.name}</span>
                <span className="mood-pill-desc">{cat.description}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Playlists Section */}
      <div className="section-header">
        <h2 className="section-title">Playlists</h2>
        <button className="see-all" onClick={() => navigate('/playlists')}>See all</button>
      </div>

      <div className="playlists-grid">
        <div className="playlist-card glass-panel fav-card" onClick={() => navigate('/playlists')}>
          <div className="large-star"><Star size={24} fill="var(--text-primary)" color="var(--text-primary)" /></div>
          <h3>Favourites</h3>
        </div>
        <div className="playlist-card glass-panel focus-card" onClick={() => navigate('/playlists')}>
          <div className="large-star"><Sparkles size={24} color="var(--text-primary)" /></div>
          <h3>Focus &amp; Work</h3>
        </div>
      </div>

      {/* Mood Guidance Verses Modal */}
      {activeMoodModal && (
        <div className="surah-selector-overlay" onClick={() => setActiveMoodModal(null)}>
          <div className="word-popover-modal glass-panel mood-guidance-modal" onClick={e => e.stopPropagation()}>
            <div className="word-popover-header">
              <div className="word-location-badge" style={{ color: activeMoodModal.color }}>
                <span>{activeMoodModal.emoji} {activeMoodModal.name}</span>
              </div>
              <button className="icon-btn close-btn" onClick={() => setActiveMoodModal(null)}>
                ✕
              </button>
            </div>

            <div className="mood-modal-verses-list">
              {activeMoodModal.verses.map((v, idx) => (
                <div key={idx} className="mood-verse-card">
                  <div className="mood-verse-header">
                    <span className="verse-key-badge">{v.surahName} {v.verseKey}</span>
                    <button 
                      className="icon-sub-btn play-ayah-btn"
                      onClick={() => {
                        const audio = new Audio(v.audioUrl);
                        audio.play().catch(e => console.error(e));
                      }}
                      title="Play Ayah Audio"
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>

                  <div className="mood-arabic-text">{v.arabicText}</div>
                  <div className="mood-translation-text">"{v.translation}"</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Group Khatm & Shared Reading Challenges Modal */}
      <GroupKhatmModal
        isOpen={showKhatmModal}
        onClose={() => setShowKhatmModal(false)}
      />
    </div>
  );
};

export default Home;


