import { useState, useEffect, useRef } from 'react';
import { BookOpen, Search, Copy, Check, Sparkles, Loader, Volume2, Square } from 'lucide-react';
import { fetchHadiths, HADITH_BOOKS } from '../services/hadithApi';
import GlassCard from '../components/GlassCard';
import './Hadith.css';

const Hadith = () => {
  const [selectedBook, setSelectedBook] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hadiths, setHadiths] = useState([]);
  const [dailyHadith, setDailyHadith] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [copiedId, setCopiedId] = useState(null);
  const [langMode, setLangMode] = useState('both'); // 'both' | 'english' | 'arabic'
  const [playingAudioId, setPlayingAudioId] = useState(null);

  const audioRef = useRef(null);

  // Stop any active audio when unmounting or changing page
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [selectedBook, page]);

  // Fetch Hadiths on book, page, or search change
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchHadiths({ bookSlug: selectedBook, page, search: searchQuery })
      .then(res => {
        if (!isMounted) return;
        setHadiths(res.hadiths || []);
        setLastPage(res.lastPage || 1);
        if (!dailyHadith && res.hadiths?.length > 0) {
          setDailyHadith(res.hadiths[0]);
        }
        setLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        console.error(err);
        setLoading(false);
      });
    return () => { isMounted = false; };
  }, [selectedBook, page, searchQuery]);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingAudioId(null);
  };

  const handleCopy = (item) => {
    const text = `${item.englishNarrator || ''}\n"${item.hadithEnglish || ''}"\n— ${item.book?.bookName || 'Hadith'} #${item.hadithNumber}`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Play English Audio narration
  const playEnglishAudio = (item) => {

    if (playingAudioId === item.id) {
      stopAudio();
      return;
    }

    stopAudio();
    if (!('speechSynthesis' in window)) return;

    const textToSpeak = item.hadithEnglish || item.englishNarrator;
    if (!textToSpeak) return;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;

    utterance.onend = () => setPlayingAudioId(null);
    utterance.onerror = () => setPlayingAudioId(null);

    setPlayingAudioId(item.id);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="hadith-page">
      {/* Header */}
      <div className="hadith-header">
        <div>
          <h1 className="hadith-title">Hadith Collection</h1>
          <p className="hadith-subtitle">Prophetic traditions &amp; authentic teachings</p>
        </div>
        <div className="lang-toggle-pills">
          <button
            className={`lang-pill ${langMode === 'both' ? 'active' : ''}`}
            onClick={() => setLangMode('both')}
          >
            Both
          </button>
          <button
            className={`lang-pill ${langMode === 'english' ? 'active' : ''}`}
            onClick={() => setLangMode('english')}
          >
            EN
          </button>
          <button
            className={`lang-pill ${langMode === 'arabic' ? 'active' : ''}`}
            onClick={() => setLangMode('arabic')}
          >
            AR
          </button>
        </div>
      </div>

      {/* Featured Hadith of the Day */}
      {dailyHadith && (
        <div className="daily-hadith-card glass-panel">
          <div className="daily-badge">
            <Sparkles size={14} color="currentColor" />
            <span>HADITH OF THE DAY</span>
          </div>

          {dailyHadith.headingEnglish && (
            <h3 className="daily-heading">{dailyHadith.headingEnglish}</h3>
          )}

          {dailyHadith.hadithArabic && (langMode === 'both' || langMode === 'arabic') && (
            <p className="daily-arabic" style={{ fontFamily: 'serif', direction: 'rtl' }}>
              {dailyHadith.hadithArabic}
            </p>
          )}

          {(langMode === 'both' || langMode === 'english') && (
            <>
              {dailyHadith.englishNarrator && (
                <p className="daily-narrator">{dailyHadith.englishNarrator}</p>
              )}
              <p className="daily-text">"{dailyHadith.hadithEnglish}"</p>
            </>
          )}

          <div className="daily-footer">
            <span className="daily-source">
              <BookOpen size={14} color="currentColor" />
              {dailyHadith.book?.bookName || 'Authentic Hadith'} #{dailyHadith.hadithNumber}
            </span>

            <div className="action-btns">
              {dailyHadith.hadithEnglish && (
                <button
                  className={`hadith-audio-btn en-btn ${playingAudioId === dailyHadith.id ? 'playing' : ''}`}
                  onClick={() => playEnglishAudio(dailyHadith)}
                  title="Listen to English narration"
                >
                  {playingAudioId === dailyHadith.id ? (
                    <><Square size={13} fill="currentColor" /> <span>Stop EN</span></>
                  ) : (
                    <><Volume2 size={14} /> <span>English Audio</span></>
                  )}
                </button>
              )}

              <button
                className="copy-btn icon-btn dark"
                onClick={() => handleCopy(dailyHadith)}
                title="Copy Hadith"
              >
                {copiedId === dailyHadith.id ? <Check size={16} color="currentColor" /> : <Copy size={16} color="currentColor" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Book Category Filter Pills */}
      <div className="books-scroll-row">
        {HADITH_BOOKS.map(b => (
          <button
            key={b.slug}
            className={`book-pill ${selectedBook === b.slug ? 'active' : ''}`}
            onClick={() => {
              setSelectedBook(b.slug);
              setPage(1);
            }}
          >
            {b.name}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="hadith-search-bar glass-panel">
        <Search size={16} color="currentColor" />
        <input
          type="text"
          placeholder="Search hadiths by keyword or topic…"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {/* Hadith List */}
      <div className="hadith-list">
        {loading ? (
          <div className="hadith-loading">
            <Loader size={28} className="spin" color="currentColor" />
            <span>Loading authentic Hadiths…</span>
          </div>
        ) : hadiths.length === 0 ? (
          <div className="hadith-empty">
            <p>No hadiths found for this filter or search query.</p>
          </div>
        ) : (
          hadiths.map((item) => {
            const isEnPlaying = playingAudioId === item.id;

            return (
              <GlassCard className="hadith-item-card" key={item.id}>
                <div className="hadith-item-header">
                  <div className="book-tag">
                    <BookOpen size={12} />
                    <span>{item.book?.bookName || 'Hadith'} #{item.hadithNumber}</span>
                    {item.status && <span className={`status-tag ${item.status.toLowerCase()}`}>{item.status}</span>}
                  </div>

                  <div className="action-btns">
                    {item.hadithEnglish && (
                      <button
                        className={`hadith-audio-btn en-btn ${isEnPlaying ? 'playing' : ''}`}
                        onClick={() => playEnglishAudio(item)}
                        title="Listen to English narration"
                      >
                        {isEnPlaying ? (
                          <><Square size={13} fill="currentColor" /> <span>Stop EN</span></>
                        ) : (
                          <><Volume2 size={14} /> <span>English Audio</span></>
                        )}
                      </button>
                    )}

                    <button
                      className="copy-btn icon-btn dark"
                      onClick={() => handleCopy(item)}
                      title="Copy Hadith"
                    >
                      {copiedId === item.id ? <Check size={15} color="currentColor" /> : <Copy size={15} color="currentColor" />}
                    </button>
                  </div>
                </div>

                {item.chapter?.chapterEnglish && (
                  <span className="chapter-tag">Chapter: {item.chapter.chapterEnglish}</span>
                )}

                {item.hadithArabic && (langMode === 'both' || langMode === 'arabic') && (
                  <div className="hadith-arabic-text">
                    {item.hadithArabic}
                  </div>
                )}

                {(langMode === 'both' || langMode === 'english') && (
                  <div className="hadith-english-text">
                    {item.englishNarrator && <p className="narrator">{item.englishNarrator}</p>}
                    <p className="body">{item.hadithEnglish}</p>
                  </div>
                )}
              </GlassCard>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && hadiths.length > 0 && (
        <div className="pagination-row">
          <button
            className="page-btn"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="page-info">Page {page} of {lastPage}</span>
          <button
            className="page-btn"
            disabled={page >= lastPage}
            onClick={() => setPage(p => Math.min(lastPage, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Hadith;


