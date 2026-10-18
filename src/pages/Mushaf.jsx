import { fetchTextJson } from '../services/textCache';
import { sanitizeHtml } from '../utils/sanitizeHtml';
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  ChevronLeft, ChevronRight, Search, Loader, 
  Palette, Volume2, Bookmark, Check, Copy,
  X, Repeat, FileText, Info, Play, Pause, Image as ImageIcon, Sparkles, Heart
} from 'lucide-react';
import surahs from '../data/surahs';
import { getJuzStartPage } from '../data/juz';
import { usePlayback, useUserData, usePlayerActions } from '../context/PlayerContext';
import { fetchTajweedPage, fetchWordByWordPage, parseTajweedText, fetchTafsir } from '../services/quranApi';
import { fetchAsbabAlNuzul } from '../services/asbabApi';
import VerseCardGenerator from '../components/VerseCardGenerator';
import TajweedGuideModal from '../components/TajweedGuideModal';
import TadabburModal from '../components/TadabburModal';
import './Mushaf.css';
import './MushafDesktop.css';

// Eastern Arabic numerals converter
const toArabicDigits = (num) => {
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (d) => digits[d]);
};

// Clean Surah Name helper
const cleanSurahName = (rawName) => {
  if (!rawName) return '';
  return rawName.replace(/^سُورَةُ?\s*/i, '').replace(/^سورة\s*/i, '').trim();
};

// Custom Authentic Minimalist Ayah End Marker (MEMOIZED for extreme performance)
const AyahEndBadge = React.memo(({ number, onClick, ayah, isSelected, isPlaying }) => {
  return (
    <span 
      className={`mushaf-ayah-end-badge ${isSelected ? 'selected' : ''} ${isPlaying ? 'playing' : ''}`}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick(ayah);
        }
      }}
      title={`Ayah ${number}`}
    >
      <span className="ayah-badge-bracket right">﴿</span>
      <span className="ayah-badge-num">{toArabicDigits(number)}</span>
      <span className="ayah-badge-bracket left">﴾</span>
    </span>
  );
});

// Memoized Ayah Span to prevent hundreds of nodes re-rendering every second during playback
const MemoizedAyah = React.memo(({ ayah, text, isSelected, isPlaying, onAyahClick }) => {
  return (
    <span 
      id={`ayah-${ayah.surah?.number || 1}-${ayah.numberInSurah}`}
      className={`mushaf-ayah-inline ${isSelected ? 'selected-ayah' : ''} ${isPlaying ? 'playing-ayah' : ''}`}
      onClick={() => onAyahClick(ayah)}
      role="button" tabIndex={0} aria-label={`Verse ${ayah.numberInSurah}: open actions`} aria-pressed={isSelected}
      onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onAyahClick(ayah);}}}
    >
      <span className="quran-text">{text}</span>
      <AyahEndBadge 
        number={ayah.numberInSurah} 
        isSelected={isSelected}
        isPlaying={isPlaying}
        onClick={onAyahClick}
        ayah={ayah}
      />
    </span>
  );
});

const Mushaf = () => {
  // Saved reading state
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = localStorage.getItem('quranly_mushaf_page');
    return Math.max(1,Math.min(604,Number(saved) || 1));
  });

  const [pageArabicData, setPageArabicData] = useState(null);
  const [pageEnglishData, setPageEnglishData] = useState(null);
  const [pageTajweedData, setPageTajweedData] = useState(null);
  const [pageWbwData, setPageWbwData] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI modes: 'mushaf' | 'tajweed' | 'wordByWord' | 'verse'
  const [viewMode, setViewMode] = useState('mushaf');

  // Interactive state
  const [showSurahSelector, setShowSurahSelector] = useState(false);
  const [showJumpModal, setShowJumpModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [jumpPageInput, setJumpPageInput] = useState('');
  const [selectedAyah, setSelectedAyah] = useState(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Customization preferences
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('quranly_mushaf_fontsize');
    return Math.max(22,Math.min(42,Number(saved)||30));
  });

  // Hifz & Ayah Audio Playback state
  const [playingAyah, setPlayingAyah] = useState(null); // { number, surahNumber, numberInSurah, audioUrl }
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [repeatLimit, setRepeatLimit] = useState(1); // 1, 3, 5, 10, 999 (loop)
  const [currentRepeatCount, setCurrentRepeatCount] = useState(1);
  const audioRef = useRef(null);

  // Word Hotspot Popover State
  const [activeWordPopover, setActiveWordPopover] = useState(null); // { word, ayah, surah }
  const [activeWordKey, setActiveWordKey] = useState(null); // format: `${surahNum}:${ayahNum}:${wordPos}`

  // Verse Card Generator State
  const [cardGeneratorVerse, setCardGeneratorVerse] = useState(null);

  // Word Audio state
  const [playingWordId, setPlayingWordId] = useState(null);
  const wordAudioRef = useRef(null);

  // Live Tafsir & Asbab al-Nuzul Modal state
  const [showTafsirModal, setShowTafsirModal] = useState(false);
  const [tafsirData, setTafsirData] = useState(null);
  const [asbabData, setAsbabData] = useState(null);
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const [tafsirAyahInfo, setTafsirAyahInfo] = useState(null);

  const [showTajweedModal, setShowTajweedModal] = useState(false);
  const [tadabburVerse, setTadabburVerse] = useState(null);
  const [fetchRetryKey, setFetchRetryKey] = useState(0);

  const scrollRef = useRef(null);

  // Context for bookmarks
  const { readingPage, bookmarkedVerses = [] } = useUserData();
  const { saveStudyProgress, toggleBookmark, pause } = usePlayerActions();
  const { isPlaying: mainIsPlaying } = usePlayback();
  useEffect(()=>{if(mainIsPlaying){audioRef.current?.pause();wordAudioRef.current?.pause();setIsPlayingAudio(false);setPlayingWordId(null);}},[mainIsPlaying]);
  useEffect(()=>{if(readingPage) setCurrentPage(readingPage);},[readingPage]);
  const [searchParams, setSearchParams] = useSearchParams();

  // Stable callback for ayah clicks to maintain memoization
  const handleAyahClick = React.useCallback((ayah) => {
    setSelectedAyah(ayah);
  }, []);

  const toggleBookmarkVerse = (verse) => {
    if (!toggleBookmark || !verse?.surahNumber || !verse?.verseNumber) return;
    toggleBookmark(verse.surahNumber, verse.verseNumber, verse.text || '');
  };

  // Deep-link: /mushaf?juz=N (Group Khatm "Read Juz")
  useEffect(() => {
    const juzParam = searchParams.get('juz');
    if (!juzParam) return;
    const page = getJuzStartPage(juzParam);
    if (page) {
      setCurrentPage(page);
      const next = new URLSearchParams(searchParams);
      next.delete('juz');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Save state
  useEffect(() => { saveStudyProgress({readingPage:currentPage}); }, [currentPage,saveStudyProgress]);
  useEffect(() => { localStorage.setItem('quranly_mushaf_fontsize', fontSize); }, [fontSize]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (wordAudioRef.current) {
        wordAudioRef.current.pause();
        wordAudioRef.current = null;
      }
    };
  }, []);

  // Cancel stale page loads; only render text belonging to the current page.
  useEffect(() => {
    const controller = new AbortController();
    const options = {signal:controller.signal};
    setLoading(true);setError(null);setSelectedAyah(null);
    if(audioRef.current) audioRef.current.pause();
    setIsPlayingAudio(false);setPlayingAyah(null);setActiveWordKey(null);
    const load = async () => {
      try {
        const results=await Promise.allSettled([
          fetchTextJson(`https://api.alquran.cloud/v1/page/${currentPage}/quran-uthmani`,options),
          fetchTextJson(`https://api.alquran.cloud/v1/page/${currentPage}/en.sahih`,options),
          fetchWordByWordPage(currentPage,7,options),
          viewMode==='tajweed' ? fetchTajweedPage(currentPage,options) : Promise.resolve(null),
        ]);
        if(controller.signal.aborted) return;
        const arabic=results[0].status==='fulfilled' && results[0].value.data;
        if(!arabic?.ayahs) throw Error('Could not load this page. Connect to the internet once to save it for offline reading.');
        setPageArabicData(arabic);
        setPageEnglishData(results[1].status==='fulfilled' ? results[1].value.data : null);
        setPageWbwData(results[2].status==='fulfilled' ? results[2].value : []);
        setPageTajweedData(results[3].status==='fulfilled' ? results[3].value : null);
      } catch(error) {if(!controller.signal.aborted) {setPageArabicData(null);setPageEnglishData(null);setPageTajweedData(null);setPageWbwData([]);setError(error.message);}}
      finally {if(!controller.signal.aborted) setLoading(false);}
    };
    load();scrollRef.current?.scrollTo({top:0});
    return ()=>controller.abort();
  },[currentPage,viewMode,fetchRetryKey]);

  // Handle Ayah Audio Play & Hifz Repeat Loop with Real-Time Word Segment Timestamps Sync
  const playAyahAudio = (ayah) => {
    pause();
    wordAudioRef.current?.pause();
    setPlayingWordId(null);
    const audioUrl = ayah.audio?.url 
      ? (ayah.audio.url.startsWith('http') ? ayah.audio.url : `https://audio.qurancdn.com/${ayah.audio.url}`)
      : `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${ayah.number}.mp3`;
    
    if (playingAyah?.number === ayah.number && isPlayingAudio) {
      // Pause
      if (audioRef.current) audioRef.current.pause();
      setIsPlayingAudio(false);
      setActiveWordKey(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const newAudio = new Audio(audioUrl);
    audioRef.current = newAudio;
    setPlayingAyah(ayah);
    setIsPlayingAudio(true);
    setCurrentRepeatCount(1);

    // Audio timestamp synchronization for karaoke-style word highlighting & auto-scroll
    newAudio.ontimeupdate = () => {
      if (ayah.audio?.segments && ayah.words) {
        const currentMs = newAudio.currentTime * 1000;
        const activeSeg = ayah.audio.segments.find(seg => currentMs >= seg[2] && currentMs <= seg[3]);
        if (activeSeg) {
          const wordPos = activeSeg[1] !== undefined ? activeSeg[1] : (activeSeg[0] + 1);
          const key = `${ayah.surah?.number || 1}:${ayah.numberInSurah}:${wordPos}`;
          setActiveWordKey(key);
          
          // Auto-scroll active word/verse into center of screen
          const el = document.getElementById(`word-${key}`) || document.getElementById(`ayah-${ayah.surah?.number || 1}-${ayah.numberInSurah}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    };

    newAudio.play().catch(() => setIsPlayingAudio(false));
    newAudio.onerror = () => {setIsPlayingAudio(false);setPlayingAyah(null);setActiveWordKey(null);};
    let completedRepeats = 1;

    newAudio.onended = () => {
      // Check repeat loop
      if (repeatLimit > 1 && completedRepeats < repeatLimit) {
        completedRepeats += 1;
        setCurrentRepeatCount(completedRepeats);
        newAudio.currentTime = 0;
        newAudio.play().catch(e => console.error(e));
      } else {
        setIsPlayingAudio(false);
        setPlayingAyah(null);
        setActiveWordKey(null);
      }
    };
  };

  // Play Word Audio Pronunciation
  const playWordAudio = (word) => {
    if (!word?.audio_url) return;
    pause();
    audioRef.current?.pause();
    setIsPlayingAudio(false);
    const fullAudioUrl = word.audio_url.startsWith('http') 
      ? word.audio_url 
      : `https://audio.qurancdn.com/${word.audio_url}`;
    
    if (wordAudioRef.current) {
      wordAudioRef.current.pause();
    }

    const audio = new Audio(fullAudioUrl);
    wordAudioRef.current = audio;
    setPlayingWordId(word.id);
    audio.play().catch(() => setPlayingWordId(null));
    audio.onerror = () => setPlayingWordId(null);
    
    audio.onended = () => {
      setPlayingWordId(null);
    };
  };

  // Open Tafsir & Asbab al-Nuzul Modal
  const handleOpenTafsir = async (ayah) => {
    setTafsirAyahInfo(ayah);
    setShowTafsirModal(true);
    setTafsirLoading(true);
    setTafsirData(null);
    setAsbabData(null);

    try {
      const [tafsir, asbab] = await Promise.all([
        fetchTafsir(169, ayah.surah?.number || 1, ayah.numberInSurah),
        fetchAsbabAlNuzul(ayah.surah?.number || 1, ayah.numberInSurah)
      ]);
      setTafsirData(tafsir);
      setAsbabData(asbab);
    } catch (err) {
      console.error("Error fetching Tafsir/Asbab:", err);
    } finally {
      setTafsirLoading(false);
    }
  };

  const goToNextPage = () => { 
    if (currentPage < 604) {
      setCurrentPage(p => p + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    } 
  };
  const goToPrevPage = () => { 
    if (currentPage > 1) {
      setCurrentPage(p => p - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    } 
  };

  const jumpToSurah = async (surahId) => {
    setShowSurahSelector(false);
    setLoading(true);
    try {
      const data = await fetchTextJson(`https://api.alquran.cloud/v1/surah/${surahId}`);
      const firstAyahPage = data.data.ayahs[0].page;
      setCurrentPage(firstAyahPage);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleJumpSubmit = (e) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= 604) {
      setCurrentPage(pageNum);
      setShowJumpModal(false);
      setJumpPageInput('');
    }
  };

  // Group Ayahs by Surah
  const getAyahsBySurah = () => {
    if (!pageArabicData || !pageArabicData.ayahs) return [];
    
    const map = new Map();
    pageArabicData.ayahs.forEach((ayah, index) => {
      const surahNum = ayah.surah.number;
      const englishAyah = pageEnglishData?.ayahs[index];
      const tajweedAyah = pageTajweedData?.ayahs?.find(t => t.number === ayah.number);
      const wbwVerse = pageWbwData.find(w => w.verse_key === `${surahNum}:${ayah.numberInSurah}`);
      
      if (!map.has(surahNum)) {
        map.set(surahNum, {
          surah: ayah.surah,
          ayahs: []
        });
      }
      map.get(surahNum).ayahs.push({
        ...ayah,
        translation: englishAyah?.text || '',
        tajweedText: tajweedAyah ? parseTajweedText(tajweedAyah.text) : '',
        words: wbwVerse?.words || [],
        audio: wbwVerse?.audio || null
      });
    });

    return Array.from(map.values());
  };

  const currentSurahObj = pageArabicData?.ayahs[0]?.surah;
  const currentJuz = pageArabicData?.ayahs[0]?.juz;

  const filteredSurahs = surahs.filter(s => 
    s.nameEnglish.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.nameArabic.includes(searchQuery) ||
    s.id.toString() === searchQuery.trim()
  );

  const handleCopyAyah = (ayah) => {
    const textToCopy = `${ayah.text} (${ayah.surah.englishName} ${ayah.surah.number}:${ayah.numberInSurah})`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  const isAyahBookmarked = (surahNum, ayahNum) => {
    if (!bookmarkedVerses) return false;
    const key = `${surahNum}:${ayahNum}`;
    return bookmarkedVerses.some(b => (b.id || b.key) === key || b === key);
  };

  return (
    <div className="mushaf-page route-page">
      {/* Ultra-Sleek Single-Line Navigation Header */}
      <div className="mushaf-header glass-panel">
        {/* Left: View Mode Select Dropdown (NO EMOJIS) */}
        <div className="mushaf-header-left">
          <select 
            value={viewMode} 
            onChange={(e) => setViewMode(e.target.value)} 
            className="mushaf-mode-select"
            title="Switch View Mode"
            aria-label="Reading view"
          >
            <option value="mushaf">Mushaf View</option>
            <option value="tajweed">Tajweed Rules</option>
            <option value="wordByWord">Word-by-Word</option>
            <option value="verse">Verse List</option>
          </select>
        </div>

        {/* Center: Sleek Page & Surah Quick Jump Bar */}
        <div className="mushaf-header-center">
          <button 
            className="nav-arrow-btn" 
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            title="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>

          <button type="button"
            className="header-jump-pill" 
            onClick={() => setShowJumpModal(true)} 
            title="Click to Jump Page or Juz"
          >
            <span className="jump-title-text">
              {currentSurahObj ? `${currentSurahObj.number}. ${currentSurahObj.englishName}` : 'Mushaf'}
            </span>
            <span className="jump-page-badge">Page {currentPage} of 604</span>
          </button>

          <button 
            className="nav-arrow-btn" 
            onClick={goToNextPage}
            disabled={currentPage >= 604}
            title="Next Page"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Right: Quick Search, Tajweed Guide & Font Size */}
        <div className="mushaf-header-right">
          <button 
            className="header-icon-btn" 
            onClick={() => setShowTajweedModal(true)}
            title="Interactive Tajweed & Pronunciation Guide"
            style={{ color: 'var(--text-primary)', borderColor: 'var(--glass-border)', background: 'var(--card-bg)' }}
          >
            <Sparkles size={15} />
          </button>
          <button 
            className="header-icon-btn" 
            onClick={() => setShowSurahSelector(true)}
            title="Select Surah"
          >
            <Search size={15} />
          </button>
          <div className="font-controls">
            <button className="font-btn" aria-label="Decrease Arabic text size" disabled={fontSize<=22} onClick={() => setFontSize(s => Math.max(22, s - 2))}>A−</button>
            <button className="font-size-value" aria-label="Reset Arabic text size" title="Reset text size" onClick={()=>setFontSize(30)}>{fontSize}</button>
            <button className="font-btn" aria-label="Increase Arabic text size" disabled={fontSize>=42} onClick={() => setFontSize(s => Math.min(42, s + 2))}>A+</button>
          </div>
        </div>
      </div>

      {/* Main Reading Area */}
      <div className="mushaf-container" ref={scrollRef}>
        {loading ? (
          <div className="mushaf-loading">
            <Loader size={36} className="spin accent-icon" />
            <p>Loading Page {currentPage} ({viewMode.toUpperCase()} mode)...</p>
          </div>
        ) : error ? (
          <div className="mushaf-error glass-panel">
            <p>{error}</p>
            <button className="primary-btn" onClick={() => { setError(null); setFetchRetryKey(k => k + 1); }}>Retry</button>
          </div>
        ) : (
          <div className="mushaf-page-wrapper">
            
            {/* Interactive Tajweed Legend Key (Shown in Tajweed Mode) */}
            {viewMode === 'tajweed' && (
              <div className="tajweed-legend-bar glass-panel">
                <div className="legend-title">
                  <Palette size={14} />
                  <span>Tajweed Key:</span>
                </div>
                <div className="legend-pills">
                  <span className="legend-pill key-ghunnah">Ghunnah</span>
                  <span className="legend-pill key-qalqalah">Qalqalah</span>
                  <span className="legend-pill key-ikhfa">Ikhfa</span>
                  <span className="legend-pill key-idgham">Idgham</span>
                  <span className="legend-pill key-iqlab">Iqlab</span>
                  <span className="legend-pill key-madd">Madd</span>
                </div>
              </div>
            )}

            {/* Mushaf Paper Frame */}
            <div className="mushaf-paper-card glass-panel" aria-label={`Quran page ${currentPage}`}>
              {getAyahsBySurah().map(({ surah, ayahs }) => {
                const surahMeta = surahs.find(s => s.id === surah.number);
                
                return (
                  <div key={surah.number} className="surah-section">
                    {/* Ornate Surah Header Banner */}
                    <div className="surah-header-frame">
                      <div className="frame-corner corner-tl"></div>
                      <div className="frame-corner corner-tr"></div>
                      <div className="frame-corner corner-bl"></div>
                      <div className="frame-corner corner-br"></div>

                      <div className="surah-frame-content">
                        <div className="surah-meta-pills">
                          <span className="meta-pill surah-num">Surah {surah.number}</span>
                          <span className="meta-pill surah-type">
                            {surah.revelationType === 'Meccan' ? 'Meccan' : 'Medinan'}
                          </span>
                          <span className="meta-pill surah-ayahs">
                            {surah.numberOfAyahs || surahMeta?.verseCount || ayahs.length} Verses
                          </span>
                        </div>

                        <div className="surah-arabic-title">
                          سُورَةُ {cleanSurahName(surah.name)}
                        </div>

                        <div className="surah-english-subtitle">
                          {surahMeta?.nameEnglish || surah.englishName}
                          {surahMeta?.meaning && <span className="surah-meaning"> — "{surahMeta.meaning}"</span>}
                        </div>
                      </div>
                    </div>

                    {/* Bismillah Banner */}
                    {surah.number !== 1 && surah.number !== 9 && ayahs[0]?.numberInSurah === 1 && (
                      <div className="mushaf-bismillah-banner">
                        <div className="bismillah-line"></div>
                        <div className="bismillah-text">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
                        <div className="bismillah-line"></div>
                      </div>
                    )}

                    {/* View Mode 1: Standard Mushaf Paragraph View */}
                    {viewMode === 'mushaf' && (
                      <div 
                        className="mushaf-paragraph" 
                        style={{ fontSize: `${fontSize}px` }}
                      >
                        {ayahs.map((ayah) => {
                          const isBismillah = ayah.text.includes("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ");
                          let text = ayah.text;
                          if (ayah.numberInSurah === 1 && surah.number !== 1 && isBismillah) {
                            text = text.replace("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", "").trim();
                          }

                          const isSelected = selectedAyah?.number === ayah.number;
                          const isPlaying = playingAyah?.number === ayah.number;

                          return (
                            <MemoizedAyah 
                              key={ayah.number}
                              ayah={ayah}
                              text={text}
                              isSelected={isSelected}
                              isPlaying={isPlaying}
                              onAyahClick={handleAyahClick}
                            />
                          );
                        })}
                      </div>
                    )}

                    {/* View Mode 2: Color-Coded Tajweed View */}
                    {viewMode === 'tajweed' && (
                      <div 
                        className="mushaf-paragraph tajweed-paragraph" 
                        style={{ fontSize: `${fontSize}px` }}
                      >
                        {ayahs.map((ayah) => {
                          const isBismillah = ayah.text.includes("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ");
                          let text = ayah.tajweedText || ayah.text;
                          if (ayah.numberInSurah === 1 && surah.number !== 1 && isBismillah) {
                            text = text.replace("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", "").trim();
                          }

                          const isSelected = selectedAyah?.number === ayah.number;
                          const isPlaying = playingAyah?.number === ayah.number;

                          return (
                            <span 
                              key={ayah.number} 
                              className={`mushaf-ayah-inline ${isSelected ? 'selected-ayah' : ''} ${isPlaying ? 'playing-ayah' : ''}`}
                              onClick={() => setSelectedAyah(ayah)}
                            >
                              <span 
                                className="quran-text tajweed-rendered"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }}
                              />
                              <AyahEndBadge 
                                number={ayah.numberInSurah} 
                                isSelected={isSelected}
                                isPlaying={isPlaying}
                                onClick={() => setSelectedAyah(ayah)}
                              />
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* View Mode 3: Interactive Word-by-Word Mode */}
                    {viewMode === 'wordByWord' && (
                      <div className="wbw-verses-container">
                        {ayahs.map((ayah) => (
                          <div key={ayah.number} id={`ayah-${ayah.numberInSurah}`} className="wbw-verse-row">
                            <div className="wbw-verse-header">
                              <span className="verse-key-badge">{surah.number}:{ayah.numberInSurah}</span>
                              <button 
                                className="icon-sub-btn play-ayah-btn"
                                onClick={() => playAyahAudio(ayah)}
                                title="Play Ayah Audio with Synchronized Word Highlighting"
                              >
                                {playingAyah?.number === ayah.number && isPlayingAudio ? (
                                  <Pause size={16} className="pulse" />
                                ) : (
                                  <Volume2 size={16} />
                                )}
                              </button>
                            </div>

                            <div className="wbw-words-flex">
                              {ayah.words && ayah.words.map((word) => {
                                const isWordPlaying = playingWordId === word.id;
                                if (word.char_type_name === 'end') return null;

                                const wordKey = `${surah.number}:${ayah.numberInSurah}:${word.position}`;
                                const isSyncActive = activeWordKey === wordKey;

                                return (
                                  <div 
                                    key={word.id}
                                    id={`word-${wordKey}`} 
                                    className={`wbw-word-pill ${isWordPlaying ? 'playing' : ''} ${isSyncActive ? 'sync-active-highlight' : ''}`}
                                    onClick={() => setActiveWordPopover({ word, ayah, surah })}
                                    title="Click to inspect word details & audio"
                                  >
                                    <span className="wbw-arabic" style={{ fontSize: `${fontSize - 2}px` }}>
                                      {word.text_uthmani || word.text}
                                    </span>
                                    {word.transliteration?.text && (
                                      <span className="wbw-translit">{word.transliteration.text}</span>
                                    )}
                                    {word.translation?.text && (
                                      <span className="wbw-trans">{word.translation.text}</span>
                                    )}
                                  </div>
                                );
                              })}
                              <AyahEndBadge number={ayah.numberInSurah} onClick={() => setSelectedAyah(ayah)} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* View Mode 4: Verse-by-Verse Card View */}
                    {viewMode === 'verse' && (
                      <div className="mushaf-verse-list">
                        {ayahs.map((ayah) => {
                          const isBismillah = ayah.text.includes("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ");
                          let text = ayah.text;
                          if (ayah.numberInSurah === 1 && surah.number !== 1 && isBismillah) {
                            text = text.replace("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", "").trim();
                          }

                          const isSelected = selectedAyah?.number === ayah.number;
                          const isPlaying = playingAyah?.number === ayah.number;
                          const bookmarked = isAyahBookmarked(surah.number, ayah.numberInSurah);

                          return (
                            <div 
                              key={ayah.number} 
                              className={`mushaf-verse-card ${isSelected ? 'selected' : ''} ${isPlaying ? 'playing' : ''}`}
                              onClick={() => setSelectedAyah(ayah)}
                            >
                              <div className="verse-card-header">
                                <span className="verse-key-badge">{surah.number}:{ayah.numberInSurah}</span>

                                <div className="verse-card-actions">
                                  {/* Play Ayah Audio Button */}
                                  <button 
                                    className={`icon-sub-btn ${isPlaying ? 'active-playing' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      playAyahAudio(ayah);
                                    }}
                                    title="Play Ayah Audio"
                                  >
                                    {isPlaying && isPlayingAudio ? <Pause size={16} /> : <Volume2 size={16} />}
                                  </button>

                                  {/* Read Tafsir Button */}
                                  <button 
                                    className="icon-sub-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenTafsir(ayah);
                                    }}
                                    title="Read Tafsir Exegesis"
                                  >
                                    <FileText size={16} />
                                  </button>

                                  {toggleBookmarkVerse && (
                                    <button 
                                      className={`icon-sub-btn ${bookmarked ? 'bookmarked' : ''}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleBookmarkVerse({
                                          id: `${surah.number}:${ayah.numberInSurah}`,
                                          surahName: surah.englishName,
                                          surahNumber: surah.number,
                                          verseNumber: ayah.numberInSurah,
                                          text: ayah.text
                                        });
                                      }}
                                      title={bookmarked ? "Remove Bookmark" : "Bookmark Verse"}
                                    >
                                      <Bookmark size={16} fill={bookmarked ? "currentColor" : "none"} />
                                    </button>
                                  )}
                                  
                                  <button 
                                    className="icon-sub-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyAyah(ayah);
                                    }}
                                    title="Copy Ayah"
                                  >
                                    <Copy size={16} />
                                  </button>
                                </div>
                              </div>

                              <div 
                                className="verse-arabic-text" 
                                style={{ fontSize: `${fontSize}px` }}
                              >
                                {text}
                                <AyahEndBadge number={ayah.numberInSurah} />
                              </div>

                              {ayah.translation && (
                                <div className="verse-translation-text">
                                  {ayah.translation}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>



      {/* Ayah Action Drawer / Modal */}
      {selectedAyah && (
        <div className="ayah-modal-overlay" onClick={() => setSelectedAyah(null)}>
          <div className="ayah-modal-card glass-panel" onClick={e => e.stopPropagation()}>
            <div className="ayah-modal-header">
              <div className="modal-title-wrap">
                <h4>
                  {selectedAyah.surah?.englishName || 'Surah'} — Verse {selectedAyah.numberInSurah}
                </h4>
                <p>Page {selectedAyah.page} • Juz {selectedAyah.juz}</p>
              </div>
              <button className="icon-btn close-btn" onClick={() => setSelectedAyah(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="ayah-modal-body">
              <div className="modal-arabic-text" style={{ fontSize: `${fontSize + 2}px` }}>
                {selectedAyah.text}
              </div>

              {selectedAyah.translation && (
                <div className="modal-translation-text">
                  "{selectedAyah.translation}"
                </div>
              )}

              {/* Hifz Repeat Controls */}
              <div className="hifz-repeat-controls">
                <div className="repeat-label">
                  <Repeat size={15} />
                  <span>Hifz Repeat Count:</span>
                </div>
                <div className="repeat-pills">
                  {[1, 3, 5, 10].map(cnt => (
                    <button 
                      key={cnt} 
                      className={`repeat-pill ${repeatLimit === cnt ? 'active' : ''}`}
                      onClick={() => setRepeatLimit(cnt)}
                    >
                      {cnt}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="ayah-modal-actions">
              <button 
                className="modal-action-btn primary"
                onClick={() => playAyahAudio(selectedAyah)}
              >
                {playingAyah?.number === selectedAyah.number && isPlayingAudio ? (
                  <Pause size={18} />
                ) : (
                  <Volume2 size={18} />
                )}
                <span>
                  {playingAyah?.number === selectedAyah.number && isPlayingAudio 
                    ? `Pause (${currentRepeatCount}/${repeatLimit})` 
                    : `Play Verse (${repeatLimit}x)`
                  }
                </span>
              </button>

              <button 
                className="modal-action-btn secondary"
                onClick={() => {
                  setTadabburVerse({
                    surahId: selectedAyah.surah?.number || 1,
                    surahName: selectedAyah.surah?.englishName,
                    verseNumber: selectedAyah.numberInSurah,
                    verseText: selectedAyah.text,
                    translationText: selectedAyah.translation,
                  });
                  setSelectedAyah(null);
                }}
                style={{ borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
              >
                <Heart size={18} />
                <span>Reflect & Note</span>
              </button>

              <button 
                className="modal-action-btn secondary"
                onClick={() => handleOpenTafsir(selectedAyah)}
              >
                <FileText size={18} />
                <span>Read Tafsir</span>
              </button>

              <button 
                className="modal-action-btn secondary"
                onClick={() => {
                  setCardGeneratorVerse({
                    arabicText: selectedAyah.text,
                    translation: selectedAyah.translation,
                    surahName: selectedAyah.surah?.englishName,
                    verseKey: `${selectedAyah.surah?.number}:${selectedAyah.numberInSurah}`
                  });
                  setSelectedAyah(null);
                }}
              >
                <ImageIcon size={18} />
                <span>Verse Card</span>
              </button>

              <button 
                className="modal-action-btn secondary"
                onClick={() => handleCopyAyah(selectedAyah)}
              >
                {copiedSuccess ? <Check size={18} /> : <Copy size={18} />}
                <span>{copiedSuccess ? 'Copied!' : 'Copy Verse'}</span>
              </button>

              {toggleBookmarkVerse && (
                <button 
                  className={`modal-action-btn secondary ${isAyahBookmarked(selectedAyah.surah?.number, selectedAyah.numberInSurah) ? 'bookmarked' : ''}`}
                  onClick={() => {
                    toggleBookmarkVerse({
                      id: `${selectedAyah.surah?.number}:${selectedAyah.numberInSurah}`,
                      surahName: selectedAyah.surah?.englishName,
                      surahNumber: selectedAyah.surah?.number,
                      verseNumber: selectedAyah.numberInSurah,
                      text: selectedAyah.text
                    });
                  }}
                >
                  <Bookmark size={18} fill={isAyahBookmarked(selectedAyah.surah?.number, selectedAyah.numberInSurah) ? "currentColor" : "none"} />
                  <span>
                    {isAyahBookmarked(selectedAyah.surah?.number, selectedAyah.numberInSurah) ? 'Bookmarked' : 'Bookmark'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Tafsir Drawer Modal */}
      {showTafsirModal && (
        <div className="surah-selector-overlay" onClick={() => setShowTafsirModal(false)}>
          <div className="surah-selector-modal glass-panel tafsir-modal" onClick={e => e.stopPropagation()}>
            <div className="selector-header">
              <div className="tafsir-header-title">
                <h2>Tafsir Exegesis</h2>
                <p>{tafsirAyahInfo?.surah?.englishName} • Verse {tafsirAyahInfo?.numberInSurah}</p>
              </div>
              <button className="icon-btn" onClick={() => setShowTafsirModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="tafsir-modal-body">
              {tafsirLoading ? (
                <div className="mushaf-loading">
                  <Loader size={32} className="spin accent-icon" />
                  <p>Loading Tafsir &amp; Asbab al-Nuzul commentary...</p>
                </div>
              ) : (
                <>
                  {/* Asbab al-Nuzul Historical Context Box */}
                  {asbabData && (
                    <div className="asbab-nuzul-card">
                      <div className="asbab-header-pill">
                        <Info size={14} />
                        <span>Asbab al-Nuzul (Occasion of Revelation) — {asbabData.scholar}</span>
                      </div>
                      <h4 className="asbab-title">{asbabData.title}</h4>
                      <p className="asbab-context-text">{asbabData.context}</p>
                    </div>
                  )}

                  {tafsirData?.text ? (
                    <div 
                      className="tafsir-rendered-text"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(tafsirData.text) }}
                    />
                  ) : (
                    <p className="no-tafsir-msg">No Tafsir commentary available for this verse.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Page Jump Modal */}
      {showJumpModal && (
        <div className="surah-selector-overlay" onClick={() => setShowJumpModal(false)}>
          <div className="surah-selector-modal glass-panel jump-modal" onClick={e => e.stopPropagation()}>
            <div className="selector-header">
              <h2>Jump to Page</h2>
              <button className="icon-btn" onClick={() => setShowJumpModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleJumpSubmit} className="jump-form">
              <label>Enter Page Number (1 - 604):</label>
              <div className="jump-input-group">
                <input 
                  type="number"
                  min="1"
                  max="604"
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  placeholder={`Current: Page ${currentPage}`}
                  autoFocus
                />
                <button type="submit" className="primary-btn">Go</button>
              </div>
            </form>

            <div className="juz-quick-grid">
              <p className="juz-grid-title">Quick Jump to Juz (Para)</p>
              <div className="juz-grid">
                {Array.from({ length: 30 }, (_, i) => i + 1).map((juzNum) => (
                  <button 
                    key={juzNum} 
                    className="juz-pill"
                    onClick={async () => {
                      setShowJumpModal(false);
                      const offlinePage = getJuzStartPage(juzNum);
                      if (offlinePage) setCurrentPage(offlinePage);
                      setLoading(true);
                      try {
                        const res = await fetch(`https://api.alquran.cloud/v1/juz/${juzNum}/quran-uthmani`);
                        const data = await res.json();
                        const firstPage = data.data?.ayahs?.[0]?.page;
                        if (firstPage) setCurrentPage(firstPage);
                        else if (!offlinePage) setLoading(false);
                      } catch (e) {
                        console.error(e);
                        if (!offlinePage) setLoading(false);
                      }
                    }}
                  >
                    Juz {juzNum}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Surah Selector Modal */}
      {showSurahSelector && (
        <div className="surah-selector-overlay" onClick={() => setShowSurahSelector(false)}>
          <div className="surah-selector-modal glass-panel" onClick={e => e.stopPropagation()}>
            <div className="selector-header">
              <h2>Select Surah</h2>
              <button className="icon-btn" onClick={() => setShowSurahSelector(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="selector-search-box">
              <Search size={18} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search Surah by name or number..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button className="clear-search" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>

            <div className="selector-list">
              {filteredSurahs.map(s => (
                <button 
                  key={s.id} 
                  className={`selector-item ${currentSurahObj?.number === s.id ? 'active' : ''}`} 
                  onClick={() => jumpToSurah(s.id)}
                >
                  <span className="selector-id">{s.id}</span>
                  <div className="selector-info">
                    <span className="selector-name">{s.nameEnglish}</span>
                    <span className="selector-meaning">{s.meaning} • {s.verseCount} Verses</span>
                  </div>
                  <span className="selector-arabic">{s.nameArabic}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Word Hotspot Popover Modal */}
      {activeWordPopover && (
        <div className="surah-selector-overlay" onClick={() => setActiveWordPopover(null)}>
          <div className="word-popover-modal glass-panel" onClick={e => e.stopPropagation()}>
            <div className="word-popover-header">
              <div className="word-location-badge">
                <span>Surah {activeWordPopover.surah?.number}:{activeWordPopover.ayah?.numberInSurah}</span>
                <span className="dot">•</span>
                <span>Word {activeWordPopover.word?.position}</span>
              </div>
              <button className="icon-btn close-btn" onClick={() => setActiveWordPopover(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="word-popover-body">
              <div className="word-arabic-large">
                {activeWordPopover.word?.text_uthmani || activeWordPopover.word?.text}
              </div>

              {activeWordPopover.word?.transliteration?.text && (
                <div className="word-translit-large">
                  {activeWordPopover.word.transliteration.text}
                </div>
              )}

              {activeWordPopover.word?.translation?.text && (
                <div className="word-translation-large">
                  "{activeWordPopover.word.translation.text}"
                </div>
              )}
            </div>

            <div className="word-popover-actions">
              {activeWordPopover.word?.audio_url ? (
                <button 
                  className="modal-action-btn primary word-audio-play-btn"
                  onClick={() => playWordAudio(activeWordPopover.word)}
                >
                  {playingWordId === activeWordPopover.word.id ? (
                    <Pause size={18} className="pulse" />
                  ) : (
                    <Volume2 size={18} />
                  )}
                  <span>{playingWordId === activeWordPopover.word.id ? 'Playing Word Audio...' : 'Play Pronunciation'}</span>
                </button>
              ) : (
                <div className="no-word-audio-lbl">No word audio clip available</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Verse Card Generator Modal */}
      {cardGeneratorVerse && (
        <VerseCardGenerator 
          verse={cardGeneratorVerse} 
          onClose={() => setCardGeneratorVerse(null)} 
        />
      )}

      {/* Tajweed Guide & Pronunciation Modal */}
      <TajweedGuideModal
        isOpen={showTajweedModal}
        onClose={() => setShowTajweedModal(false)}
      />

      {/* Verse Reflection & Tadabbur Modal */}
      <TadabburModal
        isOpen={!!tadabburVerse}
        verseInfo={tadabburVerse}
        onClose={() => setTadabburVerse(null)}
      />
    </div>
  );
};

export default Mushaf;
