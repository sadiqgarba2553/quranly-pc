import { fetchTextJson } from '../services/textCache';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Brain, Sparkles, CheckCircle2, AlertCircle, RefreshCw,
  Eye, EyeOff, Volume2, HelpCircle, ArrowLeft, Trophy, Zap, Loader
} from 'lucide-react';
import { useData, useUserData, usePlayerActions } from '../context/PlayerContext';
import GlassCard from '../components/GlassCard';
import staticSurahs from '../data/surahs';
import './Memorize.css';

/**
 * Enhanced Arabic text normalizer.
 * Strips diacritics, Quranic symbols, Tatweel, prefixes for speech matching.
 */
function normalizeArabic(text) {
  if (!text) return '';
  return String(text)
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '') // Tashkeel & symbols
    .replace(/ـ/g, '') // Tatweel
    .replace(/[۞۩۝﴿﴾!؟.,:-]/g, '')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ؤئ]/g, 'ء')
    .replace(/\s+/g, ' ')
    .trim();
}

// Check if two Arabic words match (with fuzzy prefix tolerance)
function wordsMatch(spoken, target) {
  const s = normalizeArabic(spoken);
  const t = normalizeArabic(target);
  if (!s || !t) return false;
  if (s === t) return true;
  if (s.length >= 3 && t.length >= 3) {
    if (s.includes(t) || t.includes(s)) return true;
    // Strip common prefixes 'و', 'ف', 'ال' for matching
    const sBare = s.replace(/^(ال|و|ف|ب|ك|ل)/, '');
    const tBare = t.replace(/^(ال|و|ف|ب|ك|ل)/, '');
    if (sBare.length >= 2 && sBare === tBare) return true;
  }
  return false;
}

// Static fallback for offline/instant load
const STATIC_FALLBACK_VERSES = {
  1: [
    { verse: 1, text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" },
    { verse: 2, text: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ" },
    { verse: 3, text: "الرَّحْمَٰنِ الرَّحِيمِ" },
    { verse: 4, text: "مَالِكِ يَوْمِ الدِّينِ" },
    { verse: 5, text: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ" },
    { verse: 6, text: "اهْدِنا الصِّرَاطَ الْمُسْتَقِيمَ" },
    { verse: 7, text: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ" },
  ],
  112: [
    { verse: 1, text: "قُلْ هُوَ اللَّهُ أَحَدٌ" },
    { verse: 2, text: "اللَّهُ الصَّمَدُ" },
    { verse: 3, text: "لَمْ يَلِدْ وَلَمْ يُولَدْ" },
    { verse: 4, text: "وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ" },
  ],
  113: [
    { verse: 1, text: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ" },
    { verse: 2, text: "مِن شَرِّ مَا خَلَقَ" },
    { verse: 3, text: "وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ" },
    { verse: 4, text: "وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ" },
    { verse: 5, text: "وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ" },
  ],
  114: [
    { verse: 1, text: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ" },
    { verse: 2, text: "مَلِكِ النَّاسِ" },
    { verse: 3, text: "إِلَٰهِ النَّاسِ" },
    { verse: 4, text: "مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ" },
    { verse: 5, text: "الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ" },
    { verse: 6, text: "مِنَ الْجِنَّةِ وَالنَّاسِ" },
  ],
};

const Memorize = () => {
  const navigate = useNavigate();
  const { reciters } = useData();
  const { memorizationProgress = {} } = useUserData();
  const { saveStudyProgress } = usePlayerActions();
  const speechSupported = !window.quranlyDesktop && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const { openPlayer, play, setTrack } = usePlayerActions();

  // State
  const [selectedSurahId, setSelectedSurahId] = useState(1);
  const [mode, setMode] = useState('practice'); // 'practice' | 'blur' | 'hidden'
  const [versesData, setVersesData] = useState(STATIC_FALLBACK_VERSES[1]);
  const [loadingVerses, setLoadingVerses] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');

  // Active Ayah progression state
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [wordStatuses, setWordStatuses] = useState({}); // { "vIdx-wIdx": "correct" | "error" }
  const [revealedVerses, setRevealedVerses] = useState(new Set([0])); // First verse revealed initially
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [speechError, setSpeechError] = useState(null);

  const recognitionRef = useRef(null);
  const verseRefs = useRef([]);
  const isListeningRef = useRef(false);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const currentSurah = staticSurahs.find(s => s.id === Number(selectedSurahId)) || staticSurahs[0];

  useEffect(() => {
    const controller = new AbortController();
    setLoadingVerses(true);setSpeechError(null);setVersesData(STATIC_FALLBACK_VERSES[selectedSurahId] || []);
    handleResetTest();
    const load=async()=>{
      try {const data=await fetchTextJson(`https://api.alquran.cloud/v1/surah/${selectedSurahId}`,{signal:controller.signal});
        if(controller.signal.aborted) return;
        if(!data.data?.ayahs) throw Error('No verses returned.');
        setVersesData(data.data.ayahs.map(a=>({verse:a.numberInSurah,text:a.text})));
      } catch(error) {if(!controller.signal.aborted && !STATIC_FALLBACK_VERSES[selectedSurahId]) setSpeechError('This surah is not saved yet. Connect to the internet to load its verses.');}
      finally {if(!controller.signal.aborted) {setLoadingVerses(false);setCurrentVerseIndex(Math.min(memorizationProgress[selectedSurahId]?.verseIndex || 0,currentSurah.verseCount-1));}}
    };
    load();return()=>controller.abort();
  },[selectedSurahId]);

  // Scroll active verse into view when currentVerseIndex changes
  useEffect(() => {
    if (verseRefs.current[currentVerseIndex]) {
      verseRefs.current[currentVerseIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentVerseIndex]);

  // Tokenize verses into words structure
  const tokenizedVerses = useMemo(() => {
    return versesData.map((vObj, vIdx) => {
      let text = vObj.text;
      if (selectedSurahId !== 1 && vIdx === 0 && text.startsWith("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ")) {
        text = text.replace("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", "").trim();
      }
      const rawWords = text.split(/\s+/).filter(Boolean);
      const words = rawWords.map((w, wIdx) => ({
        original: w,
        clean: normalizeArabic(w),
        id: `${vIdx}-${wIdx}`,
      }));
      return { verse: vObj.verse, words };
    });
  }, [versesData, selectedSurahId]);

  // Total words & stats
  const totalWords = useMemo(() => {
    return tokenizedVerses.reduce((acc, v) => acc + v.words.length, 0);
  }, [tokenizedVerses]);

  const correctCount = useMemo(() => {
    return Object.values(wordStatuses).filter(s => s === 'correct').length;
  }, [wordStatuses]);

  const accuracyPct = Math.round((correctCount / Math.max(1, totalWords)) * 100);

  // Initialize Speech Recognition Engine (Only once on mount)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!speechSupported || !SpeechRecognition) {
      setSpeechError(null);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'ar-SA';

    rec.onresult = (event) => {
      let currentInterim = '';
      let newFinals = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptChunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newFinals += transcriptChunk + ' ';
        } else {
          currentInterim += transcriptChunk + ' ';
        }
      }

      setInterimText(currentInterim);
      if (newFinals) {
        setFinalTranscript(prev => (prev + ' ' + newFinals).trim());
      }
    };

    rec.onerror = (err) => {
      console.warn('Speech engine warning:', err.error);
      if (['not-allowed','service-not-allowed','network','audio-capture'].includes(err.error)) {
        isListeningRef.current = false;
        setSpeechError('Microphone permission denied. Please allow microphone access in your browser settings.');
        setIsListening(false);
      }
    };

    rec.onend = () => {
      if (isListeningRef.current) {
        setTimeout(() => {
          if (isListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (err) {
              console.warn('Recognition restart caught:', err);
            }
          }
        }, 250);
      }
    };

    recognitionRef.current = rec;

    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
    };
  }, []); // Run only once

  // Trigger evaluation when transcript changes
  useEffect(() => {
    evaluateActiveVerseSpeech((finalTranscript + ' ' + interimText).trim());
  }, [finalTranscript, interimText]); // eslint-disable-line react-hooks/exhaustive-deps

  // Evaluate speech focusing on the current active Ayah & advancing to next Ayah
  const evaluateActiveVerseSpeech = (fullSpokenText) => {
    if (!fullSpokenText || tokenizedVerses.length === 0) return;

    const spokenWords = normalizeArabic(fullSpokenText).split(/\s+/).filter(Boolean);
    if (spokenWords.length === 0) return;

    const newStatuses = { ...wordStatuses };
    const newRevealed = new Set(revealedVerses);

    // Match words in order, consuming each spoken token only once.
    const targetVerse=tokenizedVerses[currentVerseIndex];
    let cursor=0;
    targetVerse?.words.forEach(word=>{
      const found=spokenWords.findIndex((spoken,index)=>index>=cursor && wordsMatch(spoken,word.clean));
      if(found>=0) {newStatuses[word.id]='correct';cursor=found+1;}
    });
    const activeVerse = tokenizedVerses[currentVerseIndex];
    if (activeVerse) {
      newRevealed.add(currentVerseIndex);

      let matchedInActiveVerse = 0;
      activeVerse.words.forEach((wObj) => {
        if (newStatuses[wObj.id] === 'correct') {
          matchedInActiveVerse++;
        }
      });

      // Mark remaining unmatched words in active verse as 'error' if spoken enough text
      if (spokenWords.length >= activeVerse.words.length * 0.4) {
        activeVerse.words.forEach((wObj) => {
          if (!newStatuses[wObj.id]) {
            newStatuses[wObj.id] = 'error';
          }
        });
      }

      // Auto advance to next verse if >= 50% of words in active verse are matched
      const isVerseCompleted = activeVerse.words.length > 0 && (matchedInActiveVerse / activeVerse.words.length) >= 0.9;

      if (isVerseCompleted && currentVerseIndex < tokenizedVerses.length - 1) {
        const nextIdx = currentVerseIndex + 1;
        newRevealed.add(nextIdx);
        setFinalTranscript('');setInterimText('');
        setCurrentVerseIndex(nextIdx);
      }
    }

    setWordStatuses(newStatuses);
    setRevealedVerses(newRevealed);
  };

  // Manual Next / Prev Ayah Navigation
  const handleNextAyah = () => {
    if (currentVerseIndex < tokenizedVerses.length - 1) {
      const nextIdx = currentVerseIndex + 1;
      setCurrentVerseIndex(nextIdx);
      setRevealedVerses(prev => new Set([...prev, nextIdx]));
    }
  };

  const handlePrevAyah = () => {
    if (currentVerseIndex > 0) {
      setCurrentVerseIndex(currentVerseIndex - 1);
    }
  };

  // Toggle Microphone
  const toggleListening = () => {
    if (!recognitionRef.current) {
      setSpeechError('Voice recognition is unavailable here. Use the review controls to practice verse by verse.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      isListeningRef.current = false;
      try { recognitionRef.current.stop(); } catch (_) {}
    } else {
      setSpeechError(null);
      setIsListening(true);
      isListeningRef.current = true;
      try { recognitionRef.current.start(); } catch (e) { console.error(e); }
    }
  };

  // Hint / Reveal Current Ayah
  const handleUseHint = () => {
    setHintsUsed(prev => prev + 1);
    const targetVerse = tokenizedVerses[currentVerseIndex];
    if (targetVerse) {
      const newStatuses = { ...wordStatuses };
      targetVerse.words.forEach(wObj => {
        newStatuses[wObj.id] = 'hint';
      });
      setWordStatuses(newStatuses);
      setRevealedVerses(prev => new Set([...prev, currentVerseIndex]));
    }
    // Revealing a hint does not count as correct recitation.
  };

  // Audio Sample Player
  const handleListenSample = () => {
    if (reciters && reciters.length > 0) {
      setTrack(currentSurah, reciters[0], staticSurahs, currentSurah.id - 1);
      openPlayer();
      play();
    }
  };

  // Reset Test
  const handleResetTest = () => {
    setIsListening(false);
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    setInterimText('');
    setFinalTranscript('');
    setWordStatuses({});
    setRevealedVerses(new Set([0]));
    setCurrentVerseIndex(0);
    setHintsUsed(0);
    setShowResultsModal(false);
  };

  // Finish Test
  const handleFinishTest = () => {
    setIsListening(false);
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    setShowResultsModal(true);
  };

  const savedPractice = memorizationProgress[selectedSurahId] || {};
  const reviewed = savedPractice.reviewedVerses || [];
  const markReviewed = () => {
    const next=[...new Set([...reviewed,currentVerseIndex])];
    const nextIndex=Math.min(currentVerseIndex+1,tokenizedVerses.length-1);
    saveStudyProgress({memorizationProgress:{...memorizationProgress,[selectedSurahId]:{reviewedVerses:next,verseIndex:nextIndex,lastPracticedAt:Date.now()}}});
    setCurrentVerseIndex(Math.max(0,nextIndex));setFinalTranscript('');setInterimText('');
  };
  return (
    <div className="memorize-page">
      {/* Top Header */}
      <div className="memorize-header">
        <button className="back-btn glass-panel" onClick={() => navigate('/')}>
          <ArrowLeft size={18} />
        </button>
        <div className="header-title">
          <h1>Memorization practice</h1>
          <p>Read, hide, listen and review verse by verse.</p>
        </div>
        <div className="xp-badge-chip">
          <Zap size={14} color="var(--text-primary)" />
          <span>{reviewed.length} verses reviewed</span>
        </div>
      </div>

      {/* Surah & Mode Controls Bar */}
      <GlassCard className="memorize-controls-card">
        <div className="control-group">
          <label>Select Surah:</label>
          <select
            className="surah-select"
            value={selectedSurahId}
            onChange={(e) => setSelectedSurahId(Number(e.target.value))}
          >
            {staticSurahs.map(s => (
              <option key={s.id} value={s.id}>
                {s.id}. Surah {s.nameEnglish} ({s.nameArabic})
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Mode:</label>
          <div className="mode-toggle-pills">
            <button
              className={`mode-pill ${mode === 'practice' ? 'active' : ''}`}
              onClick={() => setMode('practice')}
            >
              <Eye size={14} /> Practice
            </button>
            <button
              className={`mode-pill ${mode === 'blur' ? 'active' : ''}`}
              onClick={() => setMode('blur')}
            >
              <EyeOff size={14} /> Blur
            </button>
            <button
              className={`mode-pill ${mode === 'hidden' ? 'active' : ''}`}
              onClick={() => setMode('hidden')}
            >
              <Brain size={14} /> Hidden
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Speech Error Banner */}
      {speechError && (
        <div className="speech-error-banner">
          <AlertCircle size={18} color="var(--text-primary)" />
          <span>{speechError}</span>
        </div>
      )}

      {/* Accuracy Counter & Mic Action Bar */}
      <div className="memorize-action-bar">
        <div className="accuracy-counter">
          <div className="acc-label">{speechSupported ? 'Words matched' : 'Verses reviewed'}</div>
          <div className="acc-val">{speechSupported ? `${accuracyPct}%` : `${reviewed.length} / ${tokenizedVerses.length}`}</div>
        </div>

        {speechSupported && <button
          className={`mic-trigger-btn ${isListening ? 'listening' : ''}`}
          onClick={toggleListening}
          disabled={!speechSupported || loadingVerses}
          aria-label="Start or stop voice practice"
        >
          <div className="mic-pulse-ring"></div>
          {isListening ? <MicOff size={28} color="#fff" /> : <Mic size={28} color="#fff" />}
          <span>{isListening ? 'Stop Reciting' : 'Start Reciting'}</span>
        </button>}

        <div className="action-side-btns">
          <button className="side-action-btn glass-panel" onClick={handleUseHint} title="Peek / Hint">
            <HelpCircle size={18} color="var(--text-primary)" />
            <span>Hint</span>
          </button>
          <button className="side-action-btn glass-panel" onClick={handleListenSample} title="Listen Audio">
            <Volume2 size={18} color="var(--text-primary)" />
            <span>Audio</span>
          </button>
        </div>
      </div>

      {/* Scope Transparency Info Pill */}
      <div className="tajweed-scope-info-pill">
        <Sparkles size={14} color="currentColor" />
        <span>{speechSupported ? 'Voice matching is approximate and does not assess Tajweed. Review with a teacher.' : 'Windows practice uses manual review. Hide the text, recite, reveal it, then mark the verse reviewed.'}</span>
      </div>

      <div className="manual-review-bar"><span>Verse {currentVerseIndex+1} of {tokenizedVerses.length || currentSurah.verseCount} · {reviewed.length} reviewed</span><button disabled={loadingVerses || !tokenizedVerses.length} onClick={markReviewed}><CheckCircle2 size={17}/>Mark verse reviewed</button></div>
      {/* Interactive Quran Verses Board */}
      <GlassCard className="verses-board">
        {loadingVerses ? (
          <div className="loading-verses-state">
            <Loader size={24} className="spinning" color="var(--text-primary)" />
            <span>Loading Surah text...</span>
          </div>
        ) : (
          <>
            {selectedSurahId !== 9 && selectedSurahId !== 1 && (
              <div className="bismillah-header">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </div>
            )}

            <div className="verses-list">
              {tokenizedVerses.map((vObj, vIdx) => {
                const isActive = vIdx === currentVerseIndex;
                const isVerseRevealed = mode === 'practice' || revealedVerses.has(vIdx);

                return (
                  <div
                    key={vIdx}
                    ref={el => verseRefs.current[vIdx] = el}
                    className={`verse-row ${isActive ? 'active-verse-row' : ''}`}
                    onClick={() => setCurrentVerseIndex(vIdx)}
                  >
                    <span className="verse-num-badge">{vObj.verse}</span>

                    <div className="arabic-words-wrap">
                      {vObj.words.map((wObj) => {
                        const status = wordStatuses[wObj.id];
                        const isWordRevealed = isVerseRevealed || status === 'correct';
                        const isWordBlurred = mode === 'blur' && !isWordRevealed;
                        const isWordHidden = mode === 'hidden' && !isWordRevealed;

                        return (
                          <span
                            key={wObj.id}
                            className={`arabic-word ${status ? status : ''} ${isWordBlurred ? 'blur-text' : ''} ${isWordHidden ? 'hidden-word-slot' : 'revealed-word'}`}
                          >
                            {isWordHidden ? '••••' : wObj.original}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="board-footer">
              <button className="reset-btn" onClick={handleResetTest}>
                <RefreshCw size={14} /> Reset
              </button>
              <button className="finish-btn" onClick={handleFinishTest}>
                <CheckCircle2 size={16} /> Submit &amp; Results
              </button>
            </div>
          </>
        )}
      </GlassCard>

      {/* Live Spoken Transcript Feed */}
      {(finalTranscript || interimText) && (
        <GlassCard className="live-transcript-card">
          <div className="transcript-label">
            <Sparkles size={14} color="var(--text-primary)" /> Spoken Voice Transcript:
          </div>
          <div className="transcript-text" dir="rtl">
            {finalTranscript} <span className="interim-text">{interimText}</span>
          </div>
        </GlassCard>
      )}

      {/* Results Modal */}
      {showResultsModal && (
        <div className="results-overlay">
          <GlassCard className="results-modal" role="dialog" aria-label="Practice summary">
            <div className="results-trophy">
              <Trophy size={48} color="var(--text-primary)" />
            </div>
            <h2>Practice summary</h2>
            <p className="results-sub">Surah {currentSurah.nameEnglish} ({currentSurah.nameArabic})</p>

            <div className="score-ring">
              <div className="score-big">{speechSupported ? `${accuracyPct}%` : `${reviewed.length} / ${tokenizedVerses.length}`}</div>
              <span>{speechSupported ? 'Words matched' : 'Verses reviewed'}</span>
            </div>

            <div className="results-grid">
              <div className="res-box">
                <span className="res-val primary-stat-text">{correctCount}</span>
                <span className="res-lbl">Matched words</span>
              </div>
              <div className="res-box">
                <span className="res-val">{hintsUsed}</span>
                <span className="res-lbl">Hints Used</span>
              </div>
              <div className="res-box">
                <span className="res-val">{reviewed.length}</span>
                <span className="res-lbl">Verses reviewed</span>
              </div>
            </div>

            <div className="results-actions">
              <button className="retry-btn glass-panel" onClick={handleResetTest}>
                <RefreshCw size={16} /> Re-test Surah
              </button>
              <button className="done-btn" onClick={() => navigate('/insights')}>
                View progress
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default Memorize;


