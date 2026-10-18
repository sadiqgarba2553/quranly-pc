import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, Pause, Download, BookOpen, Mic, Radio,
  ShieldCheck, Smartphone, Globe, ArrowRight, CheckCircle2,
  ChevronDown, ChevronUp, Layers, ExternalLink,
  Volume2, Sparkles, Award
} from 'lucide-react';
import { useData, usePlayerActions } from '../context/PlayerContext';
import './Landing.css';

// Asset path resolver helper
const resolveAsset = (path) => {
  if (!path) return '';
  const clean = path.startsWith('/') ? path.slice(1) : path;
  const isQuranlyPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/quranly');
  return isQuranlyPath ? `/quranly/${clean}` : `/${clean}`;
};

// SVG 8-Point Islamic Star (Rub el Hizb Motif)
const IslamicStarIcon = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="5" y="5" width="14" height="14" rx="1.5" transform="rotate(0 12 12)" />
    <rect x="5" y="5" width="14" height="14" rx="1.5" transform="rotate(45 12 12)" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const SAMPLE_RECITATIONS = [
  {
    id: 1,
    reciterName: 'Mishary Rashid Alafasi',
    surahName: 'Surah Al-Fatiha (The Opening)',
    surahNumber: 1,
    audioUrl: 'https://server8.mp3quran.net/afs/001.mp3',
    photo: 'reciters/Mishary Alafasi.jpg',
    initials: 'MA',
    duration: '0:45',
    region: 'KUWAIT'
  },
  {
    id: 2,
    reciterName: 'Mahmoud Khalil Al-Hussary',
    surahName: 'Surah Al-Ikhlas (Purity)',
    surahNumber: 112,
    audioUrl: 'https://server13.mp3quran.net/hussary/112.mp3',
    photo: 'reciters/Mahmoud Khalil Al-Hussary.jpg',
    initials: 'MH',
    duration: '0:30',
    region: 'EGYPT (MURATTAL)'
  },
  {
    id: 3,
    reciterName: 'Maher Al Meaqli',
    surahName: 'Surah Al-Mulk (Dominion)',
    surahNumber: 67,
    audioUrl: 'https://server12.mp3quran.net/maher/067.mp3',
    photo: 'reciters/Maher Al Meaqli.jpg',
    initials: 'MM',
    duration: '6:30',
    region: 'MAKKAH, SAUDI ARABIA'
  },
  {
    id: 4,
    reciterName: 'Mohammed Siddiq Al-Minshawi',
    surahName: 'Surah Ar-Rahman (The Beneficent)',
    surahNumber: 55,
    audioUrl: 'https://server10.mp3quran.net/minsh/055.mp3',
    photo: 'reciters/Mohammed Siddiq Al-Minshawi.jpg',
    initials: 'SM',
    duration: '11:40',
    region: 'EGYPT'
  }
];

const FEATURED_RECITERS = [
  { name: 'Mishary Alafasi', title: 'World Renowned Qari', photo: 'reciters/Mishary Alafasi.jpg', country: 'Kuwait', initials: 'MA' },
  { name: 'Abdulbasit Abdulsamad', title: 'Master of Tajweed & Maqamat', photo: 'reciters/images.jpg', country: 'Egypt', initials: 'AA' },
  { name: 'Mahmoud Al-Hussary', title: 'Pioneer of Quranic Murattal', photo: 'reciters/Mahmoud Khalil Al-Hussary.jpg', country: 'Egypt', initials: 'MH' },
  { name: 'Maher Al Meaqli', title: 'Imam of Masjid Al-Haram', photo: 'reciters/Maher Al Meaqli.jpg', country: 'Saudi Arabia', initials: 'MM' },
  { name: 'Al-Minshawi', title: 'Heart-Touching Melodic Tone', photo: 'reciters/Mohammed Siddiq Al-Minshawi.jpg', country: 'Egypt', initials: 'MS' },
  { name: 'Noreen M. Siddiq', title: 'Traditional African Maqam', photo: 'reciters/Noreen Mohammad Siddiq.jpg', country: 'Sudan', initials: 'NS' },
  { name: 'Idrees Abkr', title: 'Emotive Tarawih Reciter', photo: 'reciters/Idrees Abkr.jpg', country: 'Yemen / UAE', initials: 'IA' },
  { name: 'Mohammed Ayyub', title: 'Imam of Al-Masjid an-Nabawi', photo: 'reciters/Mohammed Ayyub.jpg', country: 'Madinah', initials: 'MA' },
];

const FAQS = [
  {
    q: 'Is Quranly completely free to use without advertisements?',
    a: 'Yes, 100%. Quranly is built by BlueCloud Technologies as a dedicated spiritual service with zero intrusive ads, zero interruptions, and no paywalls for core audio streaming, Mushaf reading, and AI Tafsir features.'
  },
  {
    q: 'How does the Gemini AI Tafsir feature work?',
    a: 'Quranly integrates Google Gemini AI grounded in verified classical Islamic scholarship (Tafsir Ibn Kathir, Tafsir al-Jalalayn, and Tafsir al-Saadi) to provide structured reflections, linguistic context, and thematic summaries for any verse.'
  },
  {
    q: 'Can I listen to recitations and read offline?',
    a: 'Yes. Quranly features local storage caching via IndexedDB. You can save individual Surahs or entire reciter sets to listen and read without an active internet connection.'
  },
  {
    q: 'How can I install Quranly on my Android or iPhone?',
    a: 'For Android, you can download the standalone APK directly from this page or install it as a Progressive Web App (PWA). On iPhone/iPad, open the app in Safari, tap the Share icon, and select "Add to Home Screen".'
  },
  {
    q: 'How many reciters and Surahs are included?',
    a: 'Quranly provides all 114 Surahs across 100+ global reciters with crystal-clear high-fidelity audio streams served through low-latency Content Delivery Networks.'
  }
];

const Landing = () => {
  const navigate = useNavigate();
  const { surahs, reciters } = useData();
  const { setTrack, openPlayer } = usePlayerActions();

  const [playingSampleId, setPlayingSampleId] = useState(null);
  const [isSamplePlaying, setIsSamplePlaying] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [imageErrorMap, setImageErrorMap] = useState({});
  const audioRef = useRef(null);

  const handleImageError = (id) => {
    setImageErrorMap(prev => ({ ...prev, [id]: true }));
  };

  const handleToggleSample = (sample) => {
    if (playingSampleId === sample.id && isSamplePlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsSamplePlaying(false);
      }
    } else {
      if (audioRef.current) {
        audioRef.current.src = sample.audioUrl;
        audioRef.current.play().then(() => {
          setPlayingSampleId(sample.id);
          setIsSamplePlaying(true);
        }).catch(err => {
          console.error("Audio playback error:", err);
        });
      }
    }
  };

  useEffect(() => {
    const currentAudio = audioRef.current;
    return () => {
      if (currentAudio) {
        currentAudio.pause();
      }
    };
  }, []);

  const handleLaunchPlayer = (reciterName = null) => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsSamplePlaying(false);
    }
    if (reciterName && reciters?.length && surahs?.length) {
      const foundReciter = reciters.find(r => r.name.toLowerCase().includes(reciterName.toLowerCase())) || reciters[0];
      setTrack(surahs[0], foundReciter, surahs, 0);
      openPlayer();
    }
    navigate('/app');
  };

  return (
    <div className="quranly-landing">
      {/* Hidden audio element for instant landing preview */}
      <audio
        ref={audioRef}
        onEnded={() => setIsSamplePlaying(false)}
        onPause={() => setIsSamplePlaying(false)}
        onPlay={() => setIsSamplePlaying(true)}
      />

      {/* Top Navigation Bar */}
      <nav className="ql-navbar">
        <div className="ql-nav-container">
          <div className="ql-brand-group">
            <img
              src={resolveAsset('logo.png')}
              alt="Quranly Logo"
              className="ql-nav-logo"
              width={28}
              height={28}
              decoding="async"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="ql-brand-text">
              <div className="ql-brand-name-row">
                <span className="ql-brand-name">Quranly</span>
                <IslamicStarIcon size={12} className="ql-brand-star" />
              </div>
              <span className="ql-brand-badge">By BlueCloud Technologies</span>
            </div>
          </div>

          <div className="ql-nav-links">
            <a href="#sampler">Audio Preview</a>
            <a href="#features">Features</a>
            <a href="#reciters">100+ Reciters</a>
            <a href="#ai-tafsir">AI Tafsir</a>
            <a href="#download">Download APK</a>
            <a href="#faq">FAQ</a>
          </div>

          <div className="ql-nav-actions">
            <a
              href="https://bluecloud.com.ng"
              className="ql-nav-bluecloud-link"
              title="Return to BlueCloud Technologies"
            >
              BlueCloud Site
            </a>
            <button
              className="ql-btn-gold ql-nav-launch-btn"
              onClick={() => handleLaunchPlayer()}
            >
              <Play size={13} fill="currentColor" />
              <span>Launch Player</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="ql-hero">
        <div className="ql-container">
          <div className="ql-hero-grid">
            <div className="ql-hero-content">
              <div className="ql-eyebrow-tag">
                <IslamicStarIcon size={13} className="ql-eyebrow-star" />
                <span>HOLY QURAN AUDIO STREAMING & AI STUDY</span>
              </div>

              <h1 className="ql-hero-title">
                Stream the Holy Quran with Clarity, Depth & Reverence
              </h1>

              <p className="ql-hero-subtitle">
                High-fidelity audio recitations from 100+ global Qaris, instant Gemini-powered Tafsir insights,
                interactive Tajweed Mushaf, and offline caching — designed for pure spiritual focus.
              </p>

              {/* Action Buttons */}
              <div className="ql-hero-cta-group">
                <button
                  className="ql-btn-gold ql-btn-lg"
                  onClick={() => handleLaunchPlayer()}
                >
                  <Play size={16} fill="currentColor" />
                  <span>Launch Web Player</span>
                  <ArrowRight size={16} />
                </button>

                <a
                  href={resolveAsset('Quranly.apk')}
                  download="Quranly.apk"
                  className="ql-btn-surface ql-btn-lg"
                >
                  <Download size={16} />
                  <span>Download APK (v1.0)</span>
                </a>
              </div>

              {/* Stats Bar */}
              <div className="ql-stats-bar">
                <div className="ql-stat-item">
                  <span className="ql-stat-num">100+</span>
                  <span className="ql-stat-label">Global Reciters</span>
                </div>
                <div className="ql-stat-divider" />
                <div className="ql-stat-item">
                  <span className="ql-stat-num">114</span>
                  <span className="ql-stat-label">Surahs in HD</span>
                </div>
                <div className="ql-stat-divider" />
                <div className="ql-stat-item">
                  <span className="ql-stat-num">Gemini AI</span>
                  <span className="ql-stat-label">Tafsir & Answers</span>
                </div>
                <div className="ql-stat-divider" />
                <div className="ql-stat-item">
                  <span className="ql-stat-num">100%</span>
                  <span className="ql-stat-label">Free & Ad-Free</span>
                </div>
              </div>
            </div>

            {/* Hero Graphic Frame */}
            <div className="ql-hero-visual-wrap">
              <div className="ql-hero-image-box">
                <img
                  src={resolveAsset('quranly_hero_banner.jpg')}
                  alt="Quranly Audio Player Showcase"
                  className="ql-hero-banner-img"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Decorative Minimal Motif Divider */}
      <div className="ql-divider-motif">
        <span className="ql-motif-line" />
        <IslamicStarIcon size={14} className="ql-motif-star" />
        <span className="ql-motif-line" />
      </div>

      {/* Instant Audio Sampler Preview */}
      <section id="sampler" className="ql-section ql-sampler-section">
        <div className="ql-container">
          <div className="ql-section-header text-center">
            <div className="ql-eyebrow-label">INSTANT AUDIO EXPERIENCE</div>
            <h2 className="ql-section-title">Listen to Sample Recitations</h2>
            <p className="ql-section-desc">
              Experience the acoustic fidelity and clear vocal articulation before opening the full player.
            </p>
          </div>

          <div className="ql-samples-grid">
            {SAMPLE_RECITATIONS.map((sample) => {
              const isCurrent = playingSampleId === sample.id && isSamplePlaying;
              const isImgBroken = imageErrorMap[`sample-${sample.id}`];

              return (
                <div
                  key={sample.id}
                  className={`ql-sample-card ${isCurrent ? 'ql-sample-active' : ''}`}
                >
                  <div className="ql-sample-avatar-box">
                    {!isImgBroken ? (
                      <img
                        src={resolveAsset(sample.photo)}
                        alt=""
                        className="ql-sample-avatar-img"
                        width={48}
                        height={48}
                        loading="lazy"
                        decoding="async"
                        onError={() => handleImageError(`sample-${sample.id}`)}
                      />
                    ) : (
                      <div className="ql-sample-avatar-fallback">
                        {sample.initials}
                      </div>
                    )}
                    <button
                      className={`ql-sample-play-trigger ${isCurrent ? 'playing' : ''}`}
                      onClick={() => handleToggleSample(sample)}
                      aria-label={isCurrent ? 'Pause recitation' : 'Play recitation'}
                    >
                      {isCurrent ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                    </button>
                  </div>

                  <div className="ql-sample-body">
                    <div className="ql-sample-location">{sample.region}</div>
                    <h3 className="ql-sample-name">{sample.reciterName}</h3>
                    <div className="ql-sample-surah-meta">{sample.surahName}</div>
                    <div className="ql-sample-footer">
                      <span className="ql-sample-time">{sample.duration}</span>
                      {isCurrent && (
                        <div className="ql-wave-bars">
                          <span /><span /><span /><span />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="ql-sampler-action-row text-center">
            <button
              className="ql-btn-gold ql-btn-md"
              onClick={() => handleLaunchPlayer()}
            >
              <span>Explore All 100+ Reciters in Full Player</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* Core Features Pillars */}
      <section id="features" className="ql-section ql-features-section">
        <div className="ql-container">
          <div className="ql-section-header text-center">
            <div className="ql-eyebrow-label">CORE CAPABILITIES</div>
            <h2 className="ql-section-title">A Thoughtfully Engineered Companion</h2>
            <p className="ql-section-desc">
              Harmonizing sacred classical recitation with responsive web performance and contextual AI research.
            </p>
          </div>

          <div className="ql-features-grid">
            <div className="ql-feature-card">
              <div className="ql-feature-icon-box">
                <Mic size={22} />
              </div>
              <h3 className="ql-feature-card-title">100+ Master Reciters</h3>
              <p className="ql-feature-card-desc">
                Stream from revered Qaris like Mishary Alafasi, Abdulbasit, Al-Hussary, Al-Sudais, and Al-Minshawi with high-speed CDN delivery.
              </p>
              <div className="ql-feature-tag">114 Surahs High-Fidelity</div>
            </div>

            <div className="ql-feature-card">
              <div className="ql-feature-icon-box">
                <Sparkles size={22} />
              </div>
              <h3 className="ql-feature-card-title">Gemini AI Tafsir Engine</h3>
              <p className="ql-feature-card-desc">
                Receive instant contextual verse summaries, classical scholarly reflections, and root linguistic clarity in seconds.
              </p>
              <div className="ql-feature-tag ql-tag-gold">Classical Scholarly Sources</div>
            </div>

            <div className="ql-feature-card">
              <div className="ql-feature-icon-box">
                <BookOpen size={22} />
              </div>
              <h3 className="ql-feature-card-title">Interactive Digital Mushaf</h3>
              <p className="ql-feature-card-desc">
                Crisp Uthmani Arabic typography, verse-by-verse translation, color-coded Tajweed guidance, and real-time audio sync.
              </p>
              <div className="ql-feature-tag">Reading & Study</div>
            </div>

            <div className="ql-feature-card">
              <div className="ql-feature-icon-box">
                <Award size={22} />
              </div>
              <h3 className="ql-feature-card-title">Hifz & Memorization Companion</h3>
              <p className="ql-feature-card-desc">
                Ayah repeat loops, custom interval pacing, daily listening goals, and spiritual streak tracking.
              </p>
              <div className="ql-feature-tag">Memorization Tools</div>
            </div>

            <div className="ql-feature-card">
              <div className="ql-feature-icon-box">
                <Radio size={22} />
              </div>
              <h3 className="ql-feature-card-title">24/7 Global Quran Radio</h3>
              <p className="ql-feature-card-desc">
                Continuous live broadcasts from Makkah, Cairo, Riyadh, and international Islamic audio stations.
              </p>
              <div className="ql-feature-tag">Live 24/7 Streams</div>
            </div>

            <div className="ql-feature-card">
              <div className="ql-feature-icon-box">
                <ShieldCheck size={22} />
              </div>
              <h3 className="ql-feature-card-title">Offline Caching & Downloads</h3>
              <p className="ql-feature-card-desc">
                Save audio surahs to your browser storage with IndexedDB for zero-data listening while traveling.
              </p>
              <div className="ql-feature-tag">Offline Capable</div>
            </div>
          </div>
        </div>
      </section>

      {/* Reciter Showcase Grid */}
      <section id="reciters" className="ql-section ql-reciters-section">
        <div className="ql-container">
          <div className="ql-section-header text-center">
            <div className="ql-eyebrow-label">REVERED VOICES</div>
            <h2 className="ql-section-title">World-Renowned Qaris</h2>
            <p className="ql-section-desc">
              Explore timeless Murattal, Mujawwad, and diverse regional recitation styles.
            </p>
          </div>

          <div className="ql-reciters-grid">
            {FEATURED_RECITERS.map((reciter, idx) => {
              const isImgBroken = imageErrorMap[`reciter-${idx}`];
              return (
                <div
                  key={idx}
                  className="ql-reciter-card"
                  onClick={() => handleLaunchPlayer(reciter.name)}
                >
                  <div className="ql-reciter-avatar-wrap">
                    {!isImgBroken ? (
                      <img
                        src={resolveAsset(reciter.photo)}
                        alt=""
                        className="ql-reciter-avatar-img"
                        width={60}
                        height={60}
                        loading="lazy"
                        decoding="async"
                        onError={() => handleImageError(`reciter-${idx}`)}
                      />
                    ) : (
                      <div className="ql-reciter-avatar-fallback">
                        {reciter.initials}
                      </div>
                    )}
                    <div className="ql-reciter-hover-overlay">
                      <Play size={18} fill="#141414" color="#141414" />
                    </div>
                  </div>
                  <h4 className="ql-reciter-name">{reciter.name}</h4>
                  <p className="ql-reciter-role">{reciter.title}</p>
                  <span className="ql-reciter-tag">{reciter.country}</span>
                </div>
              );
            })}
          </div>

          <div className="ql-reciters-action-row text-center">
            <button
              className="ql-btn-surface ql-btn-md"
              onClick={() => handleLaunchPlayer()}
            >
              <span>View All 100+ Reciters in Player</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* AI Tafsir & Study Feature */}
      <section id="ai-tafsir" className="ql-section ql-showcase-section">
        <div className="ql-container">
          <div className="ql-showcase-grid">
            <div className="ql-showcase-visual">
              <img
                src={resolveAsset('quranly_features_preview.jpg')}
                alt="Quranly AI Tafsir Interface"
                className="ql-showcase-img"
                loading="lazy"
                decoding="async"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>

            <div className="ql-showcase-content">
              <div className="ql-eyebrow-label">INTELLIGENT COMPANION</div>
              <h2 className="ql-showcase-title">
                Explore Tafsir Context, Linguistic Roots & Classical Wisdom
              </h2>
              <p className="ql-showcase-desc">
                Ask specific questions about revelation background, grammatical roots, ethical rulings, or historical contexts for any verse in the Holy Quran.
              </p>

              <div className="ql-showcase-points">
                <div className="ql-point-item">
                  <CheckCircle2 size={17} className="ql-point-icon" />
                  <div>
                    <strong className="ql-point-heading">Contextual Verse Summaries:</strong> Direct scholarly reflections connected to the currently reciting Surah.
                  </div>
                </div>
                <div className="ql-point-item">
                  <CheckCircle2 size={17} className="ql-point-icon" />
                  <div>
                    <strong className="ql-point-heading">Root Grammar & Lexicon:</strong> Classical Arabic word origins and comparative translations.
                  </div>
                </div>
                <div className="ql-point-item">
                  <CheckCircle2 size={17} className="ql-point-icon" />
                  <div>
                    <strong className="ql-point-heading">Authentic Hadith & Azkar:</strong> Daily morning and evening supplications from Hisn al-Muslim and Sahih collections.
                  </div>
                </div>
              </div>

              <div className="ql-showcase-cta">
                <button
                  className="ql-btn-gold ql-btn-md"
                  onClick={() => handleLaunchPlayer()}
                >
                  <Play size={14} fill="currentColor" />
                  <span>Launch Player to Try AI</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Download Section */}
      <section id="download" className="ql-section ql-download-section">
        <div className="ql-container">
          <div className="ql-download-panel">
            <div className="ql-download-info">
              <div className="ql-eyebrow-label">CROSS-PLATFORM</div>
              <h2 className="ql-download-heading">Take Quranly Everywhere</h2>
              <p className="ql-download-sub">
                Available as a native Android APK and high-speed Progressive Web App (PWA) compatible with iPhone, iPad, macOS, Windows, and Linux.
              </p>

              <div className="ql-download-btn-group">
                <a
                  href={resolveAsset('Quranly.apk')}
                  download="Quranly.apk"
                  className="ql-btn-gold ql-btn-lg"
                >
                  <Download size={18} />
                  <div>
                    <span className="ql-btn-sub">Direct Download</span>
                    <span className="ql-btn-title">Android APK (v1.0)</span>
                  </div>
                </a>

                <button
                  className="ql-btn-surface ql-btn-lg"
                  onClick={() => handleLaunchPlayer()}
                >
                  <Globe size={18} />
                  <div>
                    <span className="ql-btn-sub">Browser Access</span>
                    <span className="ql-btn-title">Open Web Player</span>
                  </div>
                </button>
              </div>

              <div className="ql-download-meta-specs">
                <span>Size: ~5.9 MB</span>
                <span>Android 8.0+</span>
                <span>Ad-Free</span>
                <span>Offline Capable</span>
              </div>
            </div>

            <div className="ql-pwa-instruction-card">
              <h3 className="ql-pwa-heading">Quick Install on iPhone / iPad</h3>
              <ol className="ql-pwa-ordered-list">
                <li>Open <strong>Quranly</strong> in Safari on iOS</li>
                <li>Tap the <strong>Share</strong> icon (square with upward arrow)</li>
                <li>Select <strong>Add to Home Screen</strong></li>
                <li>Launch Quranly directly as a standalone fullscreen app</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section id="faq" className="ql-section ql-faq-section">
        <div className="ql-container">
          <div className="ql-section-header text-center">
            <div className="ql-eyebrow-label">SUPPORT & CLARIFICATIONS</div>
            <h2 className="ql-section-title">Frequently Asked Questions</h2>
          </div>

          <div className="ql-faq-stack">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className={`ql-faq-row ${isOpen ? 'open' : ''}`}
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                >
                  <div className="ql-faq-header">
                    <span className="ql-faq-q-text">{faq.q}</span>
                    {isOpen ? <ChevronUp size={16} className="ql-faq-arrow" /> : <ChevronDown size={16} className="ql-faq-arrow" />}
                  </div>
                  {isOpen && (
                    <div className="ql-faq-body">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="ql-section ql-final-cta-section">
        <div className="ql-container">
          <div className="ql-final-cta-panel text-center">
            <IslamicStarIcon size={24} className="ql-final-star" />
            <h2 className="ql-final-cta-heading">Begin Your Quran Journey Today</h2>
            <p className="ql-final-cta-text">
              Listen to 100+ reciters, explore AI Tafsir, and memorize with Tajweed in a clean, reverent interface.
            </p>
            <div className="ql-final-cta-actions">
              <button
                className="ql-btn-gold ql-btn-lg"
                onClick={() => handleLaunchPlayer()}
              >
                <Play size={16} fill="currentColor" />
                <span>Launch Web Player Now</span>
              </button>
              <a
                href={resolveAsset('Quranly.apk')}
                download="Quranly.apk"
                className="ql-btn-surface ql-btn-lg"
              >
                <Download size={16} />
                <span>Download Free APK</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="ql-footer">
        <div className="ql-container">
          <div className="ql-footer-grid">
            <div className="ql-footer-brand-col">
              <div className="ql-brand-group">
                <img
                  src={resolveAsset('logo.png')}
                  alt="Quranly"
                  className="ql-nav-logo"
                  width={28}
                  height={28}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="ql-brand-text">
                  <div className="ql-brand-name-row">
                    <span className="ql-brand-name">Quranly</span>
                    <IslamicStarIcon size={11} className="ql-brand-star" />
                  </div>
                  <span className="ql-brand-badge">By BlueCloud</span>
                </div>
              </div>
              <p className="ql-footer-bio">
                Modern Islamic Quran audio streaming and AI study platform. Engineered with precision by BlueCloud Technologies.
              </p>
            </div>

            <div className="ql-footer-columns">
              <div className="ql-footer-link-group">
                <h4>Navigation</h4>
                <a href="#sampler">Audio Preview</a>
                <a href="#features">Features</a>
                <a href="#reciters">100+ Reciters</a>
                <a href="#download">Download APK</a>
              </div>

              <div className="ql-footer-link-group">
                <h4>Web Player</h4>
                <button onClick={() => handleLaunchPlayer()} className="ql-footer-btn-link">Open Player</button>
                <button onClick={() => { navigate('/reciters'); }} className="ql-footer-btn-link">Reciters List</button>
                <button onClick={() => { navigate('/mushaf'); }} className="ql-footer-btn-link">Digital Mushaf</button>
                <button onClick={() => { navigate('/hadith'); }} className="ql-footer-btn-link">Daily Hadith</button>
              </div>

              <div className="ql-footer-link-group">
                <h4>BlueCloud</h4>
                <a href="https://bluecloud.com.ng" target="_blank" rel="noopener noreferrer">
                  BlueCloud Main <ExternalLink size={11} />
                </a>
                <a href="/projects">Case Studies</a>
                <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Privacy</a>
              </div>
            </div>
          </div>

          <div className="ql-footer-bottom-row">
            <p>© {new Date().getFullYear()} Quranly · Built by <a href="https://bluecloud.com.ng" target="_blank" rel="noopener noreferrer">BlueCloud Technologies</a>.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
