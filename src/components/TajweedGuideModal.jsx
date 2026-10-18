import React, { useState, useRef } from 'react';
import { X, Volume2, Info, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react';
import './TajweedGuideModal.css';

const TAJWEED_RULES = [
  {
    id: 'ghunnah',
    name: 'Ghunnah (Nasalization)',
    nameArabic: 'غُنَّة',
    color: 'var(--text-primary)',
    bg: 'rgba(6, 182, 212, 0.15)',
    border: 'rgba(6, 182, 212, 0.4)',
    letters: 'نّ ، مّ',
    desc: 'A resonant nasal sound emitted through the nose when pronouncing a doubled Noon (نّ) or Meem (مّ). Held for 2 counts.',
    exampleVerse: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
    exampleHighlight: 'إِنَّ',
    audioUrl: 'https://audio.qurancdn.com/wbw/001_001_001.mp3'
  },
  {
    id: 'qalqalah',
    name: 'Qalqalah (Echo / Bouncing)',
    nameArabic: 'قَلْقَلَة',
    color: 'var(--text-primary)',
    bg: 'rgba(59, 130, 246, 0.15)',
    border: 'rgba(59, 130, 246, 0.4)',
    letters: 'ق ، ط ، ب ، ج ، د (قُطْبُ جَدٍّ)',
    desc: 'An echoing or bouncing sound produced when one of the 5 Qalqalah letters has a Sukūn (ْ) or comes at the end of a verse stop.',
    exampleVerse: 'قُلْ هُوَ اللَّهُ أَحَدٌ ۚ اللَّهُ الصَّمَدُ',
    exampleHighlight: 'أَحَدٌ',
    audioUrl: 'https://audio.qurancdn.com/wbw/112_001_004.mp3'
  },
  {
    id: 'ikhfa',
    name: 'Ikhfa (Concealment / Hiding)',
    nameArabic: 'إِخْفَاء',
    color: 'var(--text-primary)',
    bg: 'rgba(249, 115, 22, 0.15)',
    border: 'rgba(249, 115, 22, 0.4)',
    letters: 'ت، ث، ج، د، ذ، ز، س، ش، ص، ض، ط، ظ، ف، ق، ك',
    desc: 'Hiding the sound of Noon Sakinah or Tanween between Idgham and Izhar when followed by one of the 15 Ikhfa letters with nasalization.',
    exampleVerse: 'مِن قَبْلُ',
    exampleHighlight: 'مِن قَبْلُ',
    audioUrl: 'https://audio.qurancdn.com/wbw/002_004_003.mp3'
  },
  {
    id: 'idgham',
    name: 'Idgham (Merging / Assimilation)',
    nameArabic: 'إِدْغَام',
    color: 'var(--text-primary)',
    bg: 'rgba(168, 85, 247, 0.15)',
    border: 'rgba(168, 85, 247, 0.4)',
    letters: 'ي ، ر ، م ، ل ، و ، ن (يَرْمَلُون)',
    desc: 'Merging a Noon Sakinah or Tanween into the following letter so they become a single doubled letter. With Ghunnah for (ينمو) and without Ghunnah for (ر، ل).',
    exampleVerse: 'مَن يَقُولُ',
    exampleHighlight: 'مَن يَقُولُ',
    audioUrl: 'https://audio.qurancdn.com/wbw/002_008_002.mp3'
  },
  {
    id: 'madd',
    name: 'Madd (Lengthening)',
    nameArabic: 'مَدّ',
    color: 'var(--text-primary)',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.4)',
    letters: 'ا ، و ، ي',
    desc: 'Prolonging the voice with a vowel letter (Alif, Waw, Ya). Can range from 2 counts (Madd Asli) to 4-6 counts (Madd Wajib / Ja’iz / Lazim).',
    exampleVerse: 'جَاءَ نَصْرُ اللَّهِ وَالْفَتْحُ',
    exampleHighlight: 'جَاءَ',
    audioUrl: 'https://audio.qurancdn.com/wbw/110_001_001.mp3'
  },
  {
    id: 'iqlab',
    name: 'Iqlab (Conversion to Meem)',
    nameArabic: 'إِقْلَاب',
    color: 'var(--text-primary)',
    bg: 'rgba(34, 197, 94, 0.15)',
    border: 'rgba(34, 197, 94, 0.4)',
    letters: 'ب',
    desc: 'Converting Noon Sakinah or Tanween into a Meem (م) sound with Ghunnah when followed by the letter Ba (ب). Marked by a small Meem in the Mushaf.',
    exampleVerse: 'مِن بَعْدِ',
    exampleHighlight: 'مِن بَعْدِ',
    audioUrl: 'https://audio.qurancdn.com/wbw/002_027_005.mp3'
  }
];

export default function TajweedGuideModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('ghunnah');
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  if (!isOpen) return null;

  const currentRule = TAJWEED_RULES.find(r => r.id === activeTab) || TAJWEED_RULES[0];

  const handlePlayAudio = (rule) => {
    if (playingId === rule.id && audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(rule.audioUrl);
    audioRef.current = audio;
    setPlayingId(rule.id);
    audio.play().catch(e => console.error('Tajweed audio error:', e));
    audio.onended = () => setPlayingId(null);
  };

  return (
    <div className="tajweed-modal-overlay" onClick={onClose}>
      <div className="tajweed-modal-card glass-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="tajweed-modal-header">
          <div className="tajweed-modal-title">
            <div className="tajweed-icon-badge">
              <Sparkles size={20} color="currentColor" />
            </div>
            <div>
              <h3>Interactive Tajweed & Pronunciation Guide</h3>
              <p>Master the rules of Quran recitation with color keys & audio samples</p>
            </div>
          </div>
          <button className="tajweed-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Tajweed Rule Color Pills Navigation */}
        <div className="tajweed-rule-tabs">
          {TAJWEED_RULES.map(rule => {
            const isActive = rule.id === activeTab;
            return (
              <button
                key={rule.id}
                className={`tajweed-tab-pill ${isActive ? 'active' : ''}`}
                style={{
                  '--rule-color': rule.color,
                  '--rule-bg': rule.bg,
                  '--rule-border': rule.border,
                }}
                onClick={() => setActiveTab(rule.id)}
              >
                <span className="tajweed-dot" style={{ backgroundColor: rule.color }} />
                <span className="tajweed-pill-name">{rule.nameArabic}</span>
                <span className="tajweed-pill-english">{rule.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Rule Details Panel */}
        <div
          className="tajweed-detail-panel"
          style={{
            borderColor: currentRule.border,
            background: `linear-gradient(135deg, ${currentRule.bg}, rgba(11, 15, 25, 0.6))`
          }}
        >
          <div className="tajweed-detail-header">
            <div>
              <div className="tajweed-arabic-title" style={{ color: currentRule.color }}>
                {currentRule.nameArabic}
              </div>
              <h4 className="tajweed-rule-heading">{currentRule.name}</h4>
            </div>
            <button
              className={`tajweed-audio-btn ${playingId === currentRule.id ? 'playing' : ''}`}
              style={{ backgroundColor: currentRule.color }}
              onClick={() => handlePlayAudio(currentRule)}
            >
              <Volume2 size={18} />
              <span>{playingId === currentRule.id ? 'Playing...' : 'Hear Audio Sample'}</span>
            </button>
          </div>

          <p className="tajweed-desc-text">{currentRule.desc}</p>

          <div className="tajweed-meta-grid">
            <div className="tajweed-meta-box glass-panel">
              <span className="meta-label">Letters of Rule:</span>
              <span className="meta-value arabic-font" style={{ color: currentRule.color }}>
                {currentRule.letters}
              </span>
            </div>

            <div className="tajweed-meta-box glass-panel">
              <span className="meta-label">Example Verse:</span>
              <span className="meta-value arabic-font highlight-example" style={{ color: currentRule.color }}>
                {currentRule.exampleVerse}
              </span>
            </div>
          </div>

          <div className="tajweed-tip-footer">
            <CheckCircle2 size={16} color={currentRule.color} />
            <span>Look for the <strong style={{ color: currentRule.color }}>{currentRule.nameArabic}</strong> color code when reading in Tajweed mode in the Mushaf.</span>
          </div>
        </div>

        {/* Quick Legend Table Footer */}
        <div className="tajweed-legend-footer">
          <h4>Tajweed Color Quick Reference</h4>
          <div className="tajweed-legend-grid">
            {TAJWEED_RULES.map(rule => (
              <div key={rule.id} className="tajweed-legend-item" onClick={() => setActiveTab(rule.id)}>
                <span className="legend-badge" style={{ backgroundColor: rule.color }} />
                <span className="legend-arabic arabic-font">{rule.nameArabic}</span>
                <span className="legend-name">{rule.name.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
