import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, HashRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { PlayerProvider, useUIState, useUserData, usePlayback, usePlayerActions } from './context/PlayerContext';
import BottomNav from './components/BottomNav';
import DesktopSidebar from './components/DesktopSidebar';
import MiniPlayer from './components/MiniPlayer';
import Onboarding from './components/Onboarding';
import FullScreenPlayer from './components/FullScreenPlayer';
import BadgePopup from './components/BadgePopup';
import { evaluateUserAchievements } from './utils/achievements';

const ROUTE_SEO = {
  '/': {
    title: 'Quranly — Holy Quran Audio Streaming, AI Tafsir, 100+ Reciters & Tajweed App',
    desc: 'Stream high-fidelity Quran recitations by 100+ world-renowned reciters, explore AI Tafsir insights, interactive Mushaf, and daily Hadith & Azkar.'
  },
  '/reciters': {
    title: '100+ Global Quran Reciters & Qaris — Quranly Audio Streaming',
    desc: 'Browse and stream crystal-clear audio from top Quran reciters including Mishary Rashid Alafasi, Abdulbasit, Al-Minshawi, and Al-Sudais.'
  },
  '/mushaf': {
    title: 'Interactive Digital Quran & Mushaf Reader — Quranly',
    desc: 'Read the Holy Quran with crystal-clear Arabic typography, verse translations, tajweed guides, and synchronized audio recitations.'
  },
  '/hadith': {
    title: 'Daily Hadith Collection & Prophetic Guidance — Quranly',
    desc: 'Explore authentic daily Hadith collections from Sahih al-Bukhari, Sahih Muslim, and other authentic Islamic sources.'
  },
  '/azkar': {
    title: 'Daily Azkar, Morning & Evening Supplications — Quranly',
    desc: 'Read and listen to authentic daily Islamic supplications and morning/evening adhkar from Hisn al-Muslim.'
  },
  '/radio': {
    title: 'Live Global Islamic Quran Radio Stations — Quranly',
    desc: 'Tune in to 24/7 continuous live Quran radio streaming stations from around the world on Quranly.'
  },
  '/memorize': {
    title: 'Quran Memorization & Hifz Companion — Quranly',
    desc: 'Memorize the Holy Quran with smart repetition tools, ayah looping, and interactive memorization progress tracking.'
  },
  '/ask-ai': {
    title: 'Ask AI Islamic & Quranic Assistant — Quranly',
    desc: 'Ask questions and receive instant, AI-guided answers rooted in verified Quran and Sunnah context.'
  },
  '/playlists': {
    title: 'Curated Quran Playlists & Mood Mixes — Quranly',
    desc: 'Discover uplifting, calming, and spiritually resonant Quran playlists tailored for your mood and spiritual peace.'
  },
  '/insights': {
    title: 'Quran Listening Insights & Activity Stats — Quranly',
    desc: 'Track your daily listening milestones, recitation streaks, and spiritual growth on Quranly.'
  },
  '/search': {
    title: 'Search Quran Surahs, Ayahs & Reciters — Quranly',
    desc: 'Instantly search across 114 Surahs, 6,236 Ayahs, and hundreds of world-class reciters.'
  },
  '/downloads': {
    title: 'Offline Quran Downloads & Cached Audio — Quranly',
    desc: 'Manage downloaded Quran surahs and offline recitations for playback anytime without an internet connection.'
  },
  '/settings': {
    title: 'Quranly Settings & Preferences',
    desc: 'Customize your audio playback, reciter preferences, font styles, and app theme on Quranly.'
  }
};

// Eagerly import Landing (entry page)
import Landing from './pages/Landing';

// Lazy load non-landing route pages for optimal bundle splitting
const Home = lazy(() => import('./pages/Home'));
const Reciters = lazy(() => import('./pages/Reciters'));
const Hadith = lazy(() => import('./pages/Hadith'));
const Playlists = lazy(() => import('./pages/Playlists'));
const Insights = lazy(() => import('./pages/Insights'));
const Search = lazy(() => import('./pages/Search'));
const Mushaf = lazy(() => import('./pages/Mushaf'));
const Settings = lazy(() => import('./pages/Settings'));
const Radio = lazy(() => import('./pages/Radio'));
const Memorize = lazy(() => import('./pages/Memorize'));
const AskAI = lazy(() => import('./pages/AskAI'));
const Downloads = lazy(() => import('./pages/Downloads'));
const Azkar = lazy(() => import('./pages/Azkar'));

// Prefetch map for route-level chunk preloading on hover
const ROUTE_IMPORTS = {
  '/app': () => import('./pages/Home'),
  '/reciters': () => import('./pages/Reciters'),
  '/mushaf': () => import('./pages/Mushaf'),
  '/playlists': () => import('./pages/Playlists'),
  '/settings': () => import('./pages/Settings'),
};
export const prefetchRoute = (path) => { ROUTE_IMPORTS[path]?.(); };

// Skeleton fallback — avoids content flash during lazy route loads
const PageSkeleton = () => (
  <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="skeleton-glass" style={{
        height: i === 1 ? '48px' : i === 2 ? '140px' : '80px',
        width: i === 1 ? '60%' : '100%',
      }} />
    ))}
    <style>{`
      @keyframes skeletonPulse {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 0.8; }
      }
    `}</style>
  </div>
);

function AppContent() {
  const location = useLocation();
  const isLandingPage = 
    location.pathname === '/' || 
    location.pathname === '' || 
    location.pathname === '/index.html';
  
  // Pages where MiniPlayer should be hidden to prevent UI obstruction
  const hideMiniPlayerRoutes = ['/ask-ai', '/memorize', '/mushaf'];
  const shouldShowMiniPlayer = Boolean(window.quranlyDesktop) || !hideMiniPlayerRoutes.includes(location.pathname);

  const { isPlayerOpen, isAuthModalOpen, isSoundModalOpen, isSleepTimerOpen, isQuranTextOpen, isPlaylistDrawerOpen, isVolumeOpen } = useUIState();
  const { closePlayer, closeModals, closeAuthModal } = usePlayerActions();
  useEffect(() => {
    const escape = event => {
      if (event.key !== 'Escape') return;
      if (isAuthModalOpen) closeAuthModal();
      else if (isSoundModalOpen || isSleepTimerOpen || isQuranTextOpen || isPlaylistDrawerOpen || isVolumeOpen) closeModals();
      else closePlayer();
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [closePlayer, closeModals, closeAuthModal, isAuthModalOpen, isSoundModalOpen, isSleepTimerOpen, isQuranTextOpen, isPlaylistDrawerOpen, isVolumeOpen]);
  const { listeningHistory, dailyGoalMinutes, favouriteReciterIds, bookmarkedVerses } = useUserData();
  const { currentTrack } = usePlayback();
  const [onboarded, setOnboarded] = useState(
    () => localStorage.getItem('quranly_onboarded') === 'true'
  );

  // Dynamic Route SEO Management
  useEffect(() => {
    const seo = ROUTE_SEO[location.pathname] || ROUTE_SEO['/'];
    if (seo) {
      document.title = window.quranlyDesktop ? 'Quranly' : seo.title;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', seo.desc);
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', seo.title);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', seo.desc);
      const twTitle = document.querySelector('meta[name="twitter:title"]');
      if (twTitle) twTitle.setAttribute('content', seo.title);
      const twDesc = document.querySelector('meta[name="twitter:description"]');
      if (twDesc) twDesc.setAttribute('content', seo.desc);
    }
  }, [location.pathname]);
  
  // Gamification tracking
  const [previousUnlockedIds, setPreviousUnlockedIds] = useState(null);
  const [newBadge, setNewBadge] = useState(null);

  useEffect(() => {
    // Real-time achievement evaluation
    const stats = evaluateUserAchievements({
      listeningHistory,
      dailyGoalMinutes,
      favouriteReciterIds,
      bookmarkedVerses,
    });
    
    const unlockedIds = stats.badges.filter(b => b.unlocked).map(b => b.id);
    
    // Only compare if we have a previous state to compare against
    if (previousUnlockedIds !== null) {
      const newlyUnlocked = unlockedIds.filter(id => !previousUnlockedIds.includes(id));
      if (newlyUnlocked.length > 0) {
        // Find the full badge object for the first newly unlocked badge to show in the popup
        const newlyUnlockedBadge = stats.badges.find(b => b.id === newlyUnlocked[0]);
        setNewBadge(newlyUnlockedBadge);
      }
    }
    
    setPreviousUnlockedIds(unlockedIds);
  }, [listeningHistory, dailyGoalMinutes, favouriteReciterIds, bookmarkedVerses]);

  useEffect(() => {
    const initStatusBar = async () => {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch (e) {
        // Ignored on web
      }
    };
    initStatusBar();
  }, []);

  if (!onboarded && !isLandingPage) {
    return <Onboarding onComplete={() => setOnboarded(true)} />;
  }

  return (
    <div className={`app-container ${isLandingPage ? 'landing-mode' : 'player-mode'}`}>
      {!isLandingPage && <DesktopSidebar />}
      <main key={location.pathname} id="main-content" className={isLandingPage ? 'landing-page-content' : 'page-content'}>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/" element={window.quranlyDesktop ? <Navigate to="/app" replace /> : <Landing />} />
            <Route path="/index.html" element={<Landing />} />
            <Route path="/app" element={<Home />} />
            <Route path="/player" element={<Home />} />
            <Route path="/reciters" element={<Reciters />} />
            <Route path="/hadith" element={<Hadith />} />
            <Route path="/playlists" element={<Playlists />} />
            <Route path="/radio" element={<Radio />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/search" element={<Search />} />
            <Route path="/mushaf" element={<Mushaf />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/memorize" element={<Memorize />} />
            <Route path="/ask-ai" element={<AskAI />} />
            <Route path="/downloads" element={<Downloads />} />
            <Route path="/azkar" element={<Azkar />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </Suspense>
      </main>

      {/* Global persistent components — only rendered in player mode */}
      {!isLandingPage && (
        <>
          {shouldShowMiniPlayer && <MiniPlayer />}
          <BottomNav />
        </>
      )}

      {/* MiniPlayer on landing page if active track is playing in background */}
      {isLandingPage && currentTrack && shouldShowMiniPlayer && <MiniPlayer />}

      <BadgePopup badge={newBadge} onClose={() => setNewBadge(null)} />

      {/* Overlay Full Screen Player */}
      {isPlayerOpen && <FullScreenPlayer />}
    </div>
  );
}

const getBasename = () => {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/quranly')) {
    return '/quranly';
  }
  return '';
};

function App() {
  const Router = window.quranlyDesktop ? HashRouter : BrowserRouter;
  return (
    <Router basename={getBasename()}>
      <PlayerProvider>
        <AppContent />
      </PlayerProvider>
    </Router>
  );
}

export default App;


