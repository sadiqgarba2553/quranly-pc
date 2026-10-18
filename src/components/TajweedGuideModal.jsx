import React, { useState, useRef, useEffect } from 'react';
import { X, Volume2, Info, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react';
import './TajweedGuideModal.css';
import { usePlayerActions } from '../context/PlayerContext';

const TAJWEED_RULES = [
  {
    id: 'ghunnah',
    name: 'Ghunnah (Nasalization)',
    nameArabic: 'غُنَّة',
    color: 'var(--tajweed-ghunnah)',
    bg: 'rgba(6, 182, 212, 0.15)',
    border: 'rgba(6, 182, 212, 0.4)',
    letters: 'نّ ، مّ',
    desc: 'A resonant nasal sound emitted through the nose when pronouncing a doubled Noon (نّ) or Meem (مّ). Held for 2 counts.',
    exampleVerse: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
    exampleHighlight: 'إِنَّ',
    reference: '94:6',
    audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/6096.mp3'
  },
  {
    id: 'qalqalah',
    name: 'Qalqalah (Echo / Bouncing)',
    nameArabic: 'قَلْقَلَة',
    color: 'var(--tajweed-qalqalah)',
    bg: 'rgba(59, 130, 246, 0.15)',
    border: 'rgba(59, 130, 246, 0.4)',
    letters: 'ق ، ط ، ب ، ج ، د (قُطْبُ جَدٍّ)',
    desc: 'An echoing or bouncing sound produced when one of the 5 Qalqalah letters has a Sukūn (ْ) or comes at the end of a verse stop.',
    exampleVerse: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
    exampleHighlight: 'أَحَدٌ',
    reference: '112:1',
    audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/6222.mp3'
  },
  {
    id: 'ikhfa',
    name: 'Ikhfa (Concealment / Hiding)',
    nameArabic: 'إِخْفَاء',
    color: 'var(--tajweed-ikhfa)',
    bg: 'rgba(249, 115, 22, 0.15)',
    border: 'rgba(249, 115, 22, 0.4)',
    letters: 'ت، ث، ج، د، ذ، ز، س، ش، ص، ض، ط، ظ، ف، ق، ك',
    desc: 'Hiding the sound of Noon Sakinah or Tanween between Idgham and Izhar when followed by one of the 15 Ikhfa letters with nasalization.',
    exampleVerse: 'مِن قَبْلِكَ',
    exampleHighlight: 'مِن قَبْلُ',
    reference: '2:4',
    audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/11.mp3'
  },
  {
    id: 'idgham',
    name: 'Idgham (Merging / Assimilation)',
    nameArabic: 'إِدْغَام',
    color: 'var(--tajweed-idgham)',
    bg: 'rgba(168, 85, 247, 0.15)',
    border: 'rgba(168, 85, 247, 0.4)',
    letters: 'ي ، ر ، م ، ل ، و ، ن (يَرْمَلُون)',
    desc: 'Merging a Noon Sakinah or Tanween into the following letter so they become a single doubled letter. With Ghunnah for (ينمو) and without Ghunnah for (ر، ل).',
    exampleVerse: 'مَن يَقُولُ',
    exampleHighlight: 'مَن يَقُولُ',
    reference: '2:8',
    audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/15.mp3'
  },
  {
    id: 'madd',
    name: 'Madd (Lengthening)',
    nameArabic: 'مَدّ',
    color: 'var(--tajweed-madd)',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.4)',
    letters: 'ا ، و ، ي',
    desc: 'Prolonging the voice with a vowel letter (Alif, Waw, Ya). Can range from 2 counts (Madd Asli) to 4-6 counts (Madd Wajib / Ja’iz / Lazim).',
    exampleVerse: 'جَاءَ نَصْرُ اللَّهِ وَالْفَتْحُ',
    exampleHighlight: 'جَاءَ',
    reference: '110:1',
    audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/6214.mp3'
  },
  {
    id: 'iqlab',
    name: 'Iqlab (Conversion to Meem)',
    nameArabic: 'إِقْلَاب',
    color: 'var(--tajweed-iqlab)',
    bg: 'rgba(34, 197, 94, 0.15)',
    border: 'rgba(34, 197, 94, 0.4)',
    letters: 'ب',
    desc: 'Converting Noon Sakinah or Tanween into a Meem (م) sound with Ghunnah when followed by the letter Ba (ب). Marked by a small Meem in the Mushaf.',
    exampleVerse: 'مِن بَعْدِ',
    exampleHighlight: 'مِن بَعْدِ',
    reference: '2:27',
    audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/34.mp3'
  }
];

export default function TajweedGuideModal({ isOpen, onClose }) {
  const {pause}=usePlayerActions();
  const [activeTab, setActiveTab] = useState('ghunnah');
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);
  const dialogRef=useRef(null);
  const closeRef=useRef(onClose);closeRef.current=onClose;
  const [audioError,setAudioError]=useState('');
  useEffect(()=>{
    if(!isOpen)return;
    const previous=document.activeElement;dialogRef.current?.focus();
    const keydown=event=>{
      if(event.key==='Escape'){event.preventDefault();closeRef.current();}
      if(event.key==='Tab'){
        const items=[...dialogRef.current.querySelectorAll('button:not(:disabled),a[href]')];
        const first=items[0],last=items.at(-1);
        if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialogRef.current)){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }
    };
    window.addEventListener('keydown',keydown);
    return ()=>{window.removeEventListener('keydown',keydown);audioRef.current?.pause();audioRef.current=null;setPlayingId(null);previous?.focus();};
  },[isOpen]);

  if (!isOpen) return null;

  const currentRule = TAJWEED_RULES.find(r => r.id === activeTab) || TAJWEED_RULES[0];
  const selectRule=id=>{audioRef.current?.pause();audioRef.current=null;setPlayingId(null);setAudioError('');setActiveTab(id);};

  const handlePlayAudio = (rule) => {
    setAudioError('');
    if (playingId === rule.id && audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(rule.audioUrl);
    pause();
    audioRef.current = audio;
    setPlayingId(rule.id);
    const failed=()=>{if(audioRef.current===audio){setPlayingId(null);setAudioError('Could not play this sample. Check your connection and try again.');}};
    audio.onerror=failed;
    audio.play().catch(failed);
    audio.onended = () => setPlayingId(null);
  };

  return (
    <div className="tajweed-modal-overlay" onClick={onClose}>
      <div className="tajweed-modal-card glass-panel" role="dialog" aria-modal="true" aria-labelledby="tajweed-guide-title" tabIndex={-1} ref={dialogRef} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="tajweed-modal-header">
          <div className="tajweed-modal-title">
            <div className="tajweed-icon-badge">
              <Sparkles size={20} color="currentColor" />
            </div>
            <div>
              <h3 id="tajweed-guide-title">Tajweed & pronunciation</h3>
              <p>Explore six recitation rules with examples and verse audio.</p>
            </div>
          </div>
          <button className="tajweed-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Tajweed Rule Color Pills Navigation */}
        <div className="tajweed-rule-tabs" role="tablist" aria-label="Tajweed rules">
          {TAJWEED_RULES.map(rule => {
            const isActive = rule.id === activeTab;
            return (
              <button
                key={rule.id}
                className={`tajweed-tab-pill ${isActive ? 'active' : ''}`}
                role="tab" id={`tajweed-tab-${rule.id}`} aria-selected={isActive} aria-controls="tajweed-rule-panel" tabIndex={isActive?0:-1}
                style={{
                  '--rule-color': rule.color,
                  '--rule-bg': rule.bg,
                  '--rule-border': rule.border,
                }}
                onClick={() => selectRule(rule.id)}
                onKeyDown={event=>{let index=TAJWEED_RULES.indexOf(rule);if(event.key==='ArrowRight')index=(index+1)%TAJWEED_RULES.length;else if(event.key==='ArrowLeft')index=(index+TAJWEED_RULES.length-1)%TAJWEED_RULES.length;else if(event.key==='Home')index=0;else if(event.key==='End')index=TAJWEED_RULES.length-1;else return;event.preventDefault();selectRule(TAJWEED_RULES[index].id);document.getElementById(`tajweed-tab-${TAJWEED_RULES[index].id}`)?.focus();}}
              >
                <span className="tajweed-dot" style={{ backgroundColor: rule.color }} />
                <span className="tajweed-pill-name" lang="ar" dir="rtl">{rule.nameArabic}</span>
                <span className="tajweed-pill-english">{rule.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Rule Details Panel */}
        <div
          className="tajweed-detail-panel"
          role="tabpanel" id="tajweed-rule-panel" aria-labelledby={`tajweed-tab-${currentRule.id}`}
          style={{'--rule-color':currentRule.color}}
        >
          <div className="tajweed-detail-header">
            <div>
              <div className="tajweed-arabic-title" lang="ar" dir="rtl">
                {currentRule.nameArabic}
              </div>
              <h4 className="tajweed-rule-heading">{currentRule.name}</h4>
            </div>
            <button
              className={`tajweed-audio-btn ${playingId === currentRule.id ? 'playing' : ''}`}
              onClick={() => handlePlayAudio(currentRule)}
              aria-pressed={playingId===currentRule.id}
            >
              <Volume2 size={18} />
              <span>{playingId === currentRule.id ? 'Stop sample' : 'Play verse sample'}</span>
            </button>
          </div>

          <p className="tajweed-desc-text">{currentRule.desc}</p>
          {audioError&&<p className="tajweed-audio-error" role="alert">{audioError}</p>}

          <div className="tajweed-meta-grid">
            <div className="tajweed-meta-box">
              <span className="meta-label">Letters of Rule:</span>
              <span className="meta-value arabic-font" lang="ar" dir="rtl">
                {currentRule.letters}
              </span>
            </div>

            <div className="tajweed-meta-box">
              <span className="meta-label">Example · Quran {currentRule.reference}</span>
              <span className="meta-value arabic-font highlight-example" lang="ar" dir="rtl">
                {currentRule.exampleVerse}
              </span>
            </div>
          </div>

          <div className="tajweed-tip-footer">
            <CheckCircle2 size={16} color={currentRule.color} />
            <span>Listen to the full verse for context. Use the matching colour key in Tajweed reading mode.</span>
          </div>
        </div>

        {/* Quick Legend Table Footer */}
        <div className="tajweed-legend-footer">
          <h4>Tajweed Color Quick Reference</h4>
          <div className="tajweed-legend-grid">
            {TAJWEED_RULES.map(rule => (
              <button key={rule.id} className="tajweed-legend-item" aria-pressed={activeTab===rule.id} onClick={() => selectRule(rule.id)}>
                <span className="legend-badge" style={{ backgroundColor: rule.color }} />
                <span className="legend-arabic arabic-font" lang="ar" dir="rtl">{rule.nameArabic}</span>
                <span className="legend-name">{rule.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
