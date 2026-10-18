import React, { useState, useMemo, useEffect } from 'react';
import { localDateKey } from '../utils/dates';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, Heart, Volume2, CheckCircle2, RotateCw, Sparkles, BookOpen,
  Sun, Moon, Landmark, Bed, Shield, Target, Trophy, Zap
} from 'lucide-react';
import { AZKAR_CATEGORIES, AZKAR_LIST } from '../data/azkarData';
import { useUserData, usePlayerActions } from '../context/PlayerContext';
import GlassCard from '../components/GlassCard';
import './Azkar.css';

const ICON_MAP = {
  Sparkles: <Sparkles size={16} />,
  Sun: <Sun size={16} />,
  Moon: <Moon size={16} />,
  Landmark: <Landmark size={16} />,
  Bed: <Bed size={16} />,
  Shield: <Shield size={16} />,
};

const Azkar = () => {
  const navigate = useNavigate();
  const { completedAzkarCount = 0, dailyAzkarGoal = 5, currentUser } = useUserData();
  const owner = currentUser?.uid || 'guest';
  const countKey = `quranly_azkar_repetitions_${owner}_${localDateKey()}`;
  const favKey = `quranly_fav_azkar_${owner}`;
  const { setDailyAzkarGoal, incrementAzkarCount } = usePlayerActions();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [counts, setCounts] = useState(() => {try {return JSON.parse(localStorage.getItem(countKey)) || {};} catch {return {};}});
  useEffect(() => {try {setCounts(JSON.parse(localStorage.getItem(countKey)) || {});setFavs(JSON.parse(localStorage.getItem(favKey)) || []);} catch {setCounts({});setFavs([]);}},[countKey,favKey]);
  useEffect(() => {return () => window.speechSynthesis?.cancel();},[]);
  const [favs, setFavs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(favKey)) || [];
    } catch (_) {
      return [];
    }
  });

  const toggleFav = (id) => {
    setFavs(prev => {
      const next = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
      try { localStorage.setItem(favKey, JSON.stringify(next)); } catch (_) {}
      return next;
    });
  };

  const handleIncrement = (id, target) => {
    const current = counts[id] || 0;
    if (current >= target) return;
    const next = {...counts,[id]:current+1};
    setCounts(next);
    try {localStorage.setItem(countKey,JSON.stringify(next));} catch {}
    if(current+1 === target) incrementAzkarCount(1);
  };

  const handleReset = (id) => {
    const next = {...counts,[id]:0};
    setCounts(next);
    try {localStorage.setItem(countKey,JSON.stringify(next));} catch {}
  };

  const handleSpeak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const filteredAzkar = useMemo(() => {
    return AZKAR_LIST.filter(item => {
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        item.title.toLowerCase().includes(q) ||
        item.translation.toLowerCase().includes(q) ||
        item.transliteration.toLowerCase().includes(q) ||
        item.arabic.includes(q);
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const goalProgressPct = Math.min(100, Math.round((completedAzkarCount / (dailyAzkarGoal || 1)) * 100));

  return (
    <div className="azkar-page">
      {/* Top Header */}
      <div className="azkar-header">
        <button className="back-btn glass-panel" onClick={() => navigate('/')}>
          <ArrowLeft size={18} color="#fff" />
        </button>
        <div className="azkar-title-wrap">
          <h1>Hisn al-Muslim (Azkar &amp; Duas)</h1>
          <p>Authentic Daily Supplications &amp; Protection</p>
        </div>
      </div>

      {/* Daily Goal & Leaderboard Sync Tracker Card */}
      <GlassCard className="azkar-goal-card">
        <div className="goal-header-row">
          <div className="goal-title-group">
            <Target size={20} className="goal-icon" />
            <div>
              <h3>Daily Azkar Goal</h3>
              <p>Supabase Synced • Earn Leaderboard XP</p>
            </div>
          </div>
        </div>

        <div className="goal-chips-container">
          <span className="goal-label">Daily Target:</span>
          <div className="goal-selector-chips">
            {[5, 10, 20, 50].map(val => (
              <button
                key={val}
                className={`goal-chip ${dailyAzkarGoal === val ? 'active' : ''}`}
                onClick={() => setDailyAzkarGoal && setDailyAzkarGoal(val)}
              >
                {val}/day
              </button>
            ))}
          </div>
        </div>

        <div className="goal-progress-box">
          <div className="goal-progress-bar-wrap">
            <div className="goal-progress-bar-fill" style={{ width: `${goalProgressPct}%` }}></div>
          </div>

          <div className="goal-card-footer">
            <span>{completedAzkarCount} / {dailyAzkarGoal} Completed</span>
            <div className="xp-earn-tag">
              <Zap size={14} />
              <span>+{completedAzkarCount * 10} XP</span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Search Input */}
      <div className="azkar-search-wrapper glass-panel">
        <Search size={18} color="var(--text-secondary)" />
        <input
          type="text"
          placeholder="Search Duas by keyword or meaning..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="clear-search" onClick={() => setSearchQuery('')}>✕</button>
        )}
      </div>

      {/* Category Filter Pills (No Emojis, Clean Lucide Icons) */}
      <div className="azkar-cat-scroll">
        {AZKAR_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`azkar-cat-pill ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {ICON_MAP[cat.icon]}
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Azkar List Container */}
      <div className="azkar-list-container">
        {filteredAzkar.length === 0 ? (
          <div className="no-azkar-state glass-panel">
            <BookOpen size={36} color="var(--text-secondary)" />
            <p>No supplications found for "{searchQuery}".</p>
          </div>
        ) : (
          filteredAzkar.map(item => {
            const currentCount = counts[item.id] || 0;
            const isCompleted = currentCount >= item.repeatCount;
            const isFavorite = favs.includes(item.id);

            return (
              <GlassCard key={item.id} className={`azkar-card ${isCompleted ? 'completed-card' : ''}`}>
                <div className="azkar-card-top">
                  <div className="azkar-card-meta">
                    <span className="azkar-source-badge">{item.source}</span>
                  </div>
                  <button
                    className={`fav-btn ${isFavorite ? 'active' : ''}`}
                    onClick={() => toggleFav(item.id)}
                    title={isFavorite ? "Remove from Favorites" : "Save to Favorites"}
                  >
                    <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
                  </button>
                </div>

                <h3 className="azkar-item-title">{item.title}</h3>

                {/* Arabic Text */}
                <div className="azkar-arabic-box" dir="rtl">
                  {item.arabic}
                </div>

                {/* Transliteration & Translation */}
                <p className="azkar-transliteration"><em>{item.transliteration}</em></p>
                <p className="azkar-translation">{item.translation}</p>

                {/* Counter & Action Controls */}
                <div className="azkar-card-footer">
                  <button
                    className="speak-btn glass-panel"
                    onClick={() => handleSpeak(item.arabic)}
                    title="Recite Audio"
                  >
                    <Volume2 size={16} /> Recite
                  </button>

                  <div className="counter-controls">
                    {currentCount > 0 && (
                      <button
                        className="reset-counter-btn"
                        onClick={() => handleReset(item.id)}
                        title="Reset Counter"
                      >
                        <RotateCw size={14} />
                      </button>
                    )}

                    <button
                      className={`count-tap-btn ${isCompleted ? 'completed' : ''}`}
                      onClick={() => handleIncrement(item.id, item.repeatCount)}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 size={18} />
                          <span>Completed ({item.repeatCount}/{item.repeatCount})</span>
                        </>
                      ) : (
                        <>
                          <span>Tap to Count</span>
                          <span className="count-num-chip">{currentCount} / {item.repeatCount}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Azkar;
