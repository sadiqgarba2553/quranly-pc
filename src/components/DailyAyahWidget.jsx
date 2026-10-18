import { useState, useEffect } from 'react';
import { Play, Sparkles, RefreshCw, Bookmark, Share2, Volume2, Check } from 'lucide-react';
import { useData, usePlayerActions } from '../context/PlayerContext';
import GlassCard from './GlassCard';
import './DailyAyahWidget.css';

// Featured inspirational Quran verses array for fast fallback and offline availability
const FEATURED_VARS = [
  { surahId: 2, ayahNum: 255, surahName: 'Al-Baqarah', arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ', translation: 'Allah! There is no deity except Him, the Ever-Living, the Sustainer of all existence.' },
  { surahId: 94, ayahNum: 6, surahName: 'Ash-Sharh', arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', translation: 'Indeed, with hardship comes ease.' },
  { surahId: 13, ayahNum: 28, surahName: 'Ar-Ra\'d', arabic: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ', translation: 'Unquestionably, by the remembrance of Allah do hearts find rest.' },
  { surahId: 3, ayahNum: 139, surahName: 'Ali \'Imran', arabic: 'وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنْتُمُ الْأَعْلَوْنَ إِنْ كُنْتُمْ مُؤْمِنِينَ', translation: 'So do not weaken and do not grieve, and you will be superior if you are true believers.' },
  { surahId: 65, ayahNum: 3, surahName: 'At-Talaq', arabic: 'وَمَنْ يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ', translation: 'And whoever relies upon Allah - then He is sufficient for him.' },
  { surahId: 39, ayahNum: 53, surahName: 'Az-Zumar', arabic: 'قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنْفُسِهِمْ لَا تَقْنَطُوا مِنْ رَحْمَةِ اللَّهِ', translation: 'Say: O My servants who have transgressed against themselves, do not despair of the mercy of Allah.' },
];

const DailyAyahWidget = () => {
  const { surahs = [], reciters = [] } = useData();
  const { setTrack, openPlayer } = usePlayerActions();
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // Set random verse on component mount based on day
  useEffect(() => {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    setCurrentAyahIndex(dayOfYear % FEATURED_VARS.length);
  }, []);

  const activeVerse = FEATURED_VARS[currentAyahIndex] || FEATURED_VARS[0];

  const handleNextVerse = () => {
    setCurrentAyahIndex((prev) => (prev + 1) % FEATURED_VARS.length);
    setCopied(false);
    setSaved(false);
  };

  const handlePlayRecitation = () => {
    const targetSurah = (surahs && surahs.length > 0)
      ? surahs.find(s => s.id === activeVerse.surahId) || surahs[0]
      : null;
    const targetReciter = (reciters && reciters.length > 0) ? reciters[0] : null;
    if (targetSurah && targetReciter) {
      setTrack(targetSurah, targetReciter, surahs, targetSurah.id - 1);
      openPlayer();
    }
  };

  const handleCopy = () => {
    const text = `"${activeVerse.arabic}"\n— ${activeVerse.translation} (Surah ${activeVerse.surahName} ${activeVerse.surahId}:${activeVerse.ayahNum})\nvia Quranly App`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <GlassCard className="daily-ayah-card">
      <div className="daily-header">
        <div className="daily-tag">
          <Sparkles size={14} color="var(--text-primary)" />
          <span>Ayah of the Day</span>
        </div>
        <div className="daily-controls">
          <button className="icon-action-btn" onClick={handleNextVerse} title="Refresh Ayah">
            <RefreshCw size={14} />
          </button>
          <button className="icon-action-btn" onClick={handleCopy} title="Copy Verse">
            {copied ? <Check size={14} color="var(--text-primary)" /> : <Share2 size={14} />}
          </button>
        </div>
      </div>

      <div className="daily-content">
        <p className="daily-arabic">{activeVerse.arabic}</p>
        <p className="daily-translation">"{activeVerse.translation}"</p>
      </div>

      <div className="daily-footer">
        <div className="surah-reference">
          <span>Surah {activeVerse.surahName}</span>
          <span className="ayah-pill">Ayah {activeVerse.ayahNum}</span>
        </div>

        <button className="listen-ayah-btn" onClick={handlePlayRecitation}>
          <Volume2 size={15} />
          <span>Listen Recitation</span>
        </button>
      </div>
    </GlassCard>
  );
};

export default DailyAyahWidget;


