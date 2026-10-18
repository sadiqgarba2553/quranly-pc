import React, { useState, useEffect } from 'react';
import {
  X, Activity, PlayCircle, Eye, Clock,
  CheckCircle2, Sparkles, Flame, Award,
  BarChart3, Music2, Smartphone, Database,
  Calendar
} from 'lucide-react';
import { getReciterAnalytics } from '../utils/reciterAnalytics';
import ReciterAvatar from './ReciterAvatar';
import './ReciterAnalyticsModal.css';

const ReciterAnalyticsModal = ({ reciter, surahs = [], isCurrentlyPlaying = false, isOpen, onClose }) => {
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'surahs' | 'environment' | 'you'

  useEffect(() => {
    if (!reciter || !isOpen) return;
    const data = getReciterAnalytics(reciter, surahs, isCurrentlyPlaying);
    setAnalytics(data);
  }, [reciter, surahs, isCurrentlyPlaying, isOpen]);

  if (!isOpen || !reciter || !analytics) return null;

  const maxWeeklyStreams = Math.max(...analytics.weeklyTrend.map(d => d.streams), 1);
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;

  return (
    <div className="analytics-modal-backdrop" onClick={onClose}>
      <div className="analytics-modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Drag Handle */}
        <div className="analytics-sheet-handle" />

        {/* Modal Header */}
        <div className="analytics-header">
          <div className="analytics-title-group">
            <div className="analytics-badge-row">
              <span className={`live-pulse-badge ${isCurrentlyPlaying ? 'active-play' : ''}`}>
                <span className={`live-pulse-dot ${isCurrentlyPlaying ? 'pulse-green' : ''}`} />
                <span>{isCurrentlyPlaying ? 'ACTIVE STREAM' : 'SITE ANALYTICS'}</span>
              </span>
              <span className="rank-percentile-pill">Genuine Site Data</span>
            </div>
            <h2 className="analytics-qari-name">{reciter.name}</h2>
          </div>
          <button className="analytics-close-btn" onClick={onClose} aria-label="Close analytics">
            <X size={18} />
          </button>
        </div>

        {/* Live / Status Hero Card */}
        <div className="analytics-live-banner">
          <div className="live-banner-avatar">
            <ReciterAvatar name={reciter.name} src={reciter.avatar} className="live-reciter-avatar" />
            <span className={`live-indicator-ring ${isCurrentlyPlaying ? 'active' : ''}`} />
          </div>
          <div className="live-banner-content">
            <div className="live-banner-count">
              {isCurrentlyPlaying ? 'Streaming Now' : `${analytics.totalPlays} Total Plays`}
            </div>
            <div className="live-banner-label">
              {analytics.liveStatusText}
            </div>
          </div>
        </div>

        {/* Category Navigation Tabs */}
        <div className="analytics-tabs-scroll">
          <button
            className={`analytics-tab-pill ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Activity size={14} />
            <span>Overview</span>
          </button>
          <button
            className={`analytics-tab-pill ${activeTab === 'surahs' ? 'active' : ''}`}
            onClick={() => setActiveTab('surahs')}
          >
            <PlayCircle size={14} />
            <span>Top Surahs ({analytics.topSurahs.length})</span>
          </button>
          <button
            className={`analytics-tab-pill ${activeTab === 'environment' ? 'active' : ''}`}
            onClick={() => setActiveTab('environment')}
          >
            <Smartphone size={14} />
            <span>Session & Device</span>
          </button>
          <button
            className={`analytics-tab-pill ${activeTab === 'you' ? 'active' : ''}`}
            onClick={() => setActiveTab('you')}
          >
            <Award size={14} />
            <span>Your Stats</span>
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="analytics-tab-content">
            {/* 4 Stat Cards Grid */}
            <div className="analytics-metrics-grid">
              <div className="metric-card">
                <div className="metric-card-top">
                  <span className="metric-label">Total Plays</span>
                  <PlayCircle size={16} className="metric-icon" />
                </div>
                <div className="metric-value">{analytics.totalPlays}</div>
                <div className="metric-subtext">Recorded on this site</div>
              </div>

              <div className="metric-card">
                <div className="metric-card-top">
                  <span className="metric-label">Listening Time</span>
                  <Clock size={16} className="metric-icon" />
                </div>
                <div className="metric-value">{analytics.totalMinutesFormatted}</div>
                <div className="metric-subtext">Total audio streamed</div>
              </div>

              <div className="metric-card">
                <div className="metric-card-top">
                  <span className="metric-label">Profile Views</span>
                  <Eye size={16} className="metric-icon" />
                </div>
                <div className="metric-value">{analytics.profileViews}</div>
                <div className="metric-subtext">Qari profile impressions</div>
              </div>

              <div className="metric-card">
                <div className="metric-card-top">
                  <span className="metric-label">Completion Rate</span>
                  <CheckCircle2 size={16} className="metric-icon" />
                </div>
                <div className="metric-value">{analytics.completionRate}</div>
                <div className="metric-subtext">{analytics.userStats.completedSurahs} completed surahs</div>
              </div>
            </div>

            {/* 7-Day Listening Trend Bar Chart */}
            <div className="analytics-chart-section">
              <div className="chart-section-header">
                <div className="chart-title">
                  <Calendar size={15} />
                  <span>7-Day Listening Activity</span>
                </div>
                <span className="chart-subtitle">Daily Plays on Site</span>
              </div>
              <div className="trend-bar-chart">
                {analytics.weeklyTrend.map((item) => {
                  const hasPlays = item.streams > 0;
                  const heightPercent = hasPlays
                    ? Math.max(16, Math.round((item.streams / maxWeeklyStreams) * 100))
                    : 4;

                  return (
                    <div key={item.dateKey} className="trend-bar-col">
                      <div className="trend-bar-tooltip">
                        {item.streams > 0 ? `${item.streams}p` : '0'}
                      </div>
                      <div className="trend-bar-track">
                        <div
                          className={`trend-bar-fill ${item.isToday ? 'today-bar' : ''} ${hasPlays ? 'has-plays' : ''}`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <span className={`trend-bar-label ${item.isToday ? 'label-highlight' : ''}`}>
                        {item.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Top Surahs Played on Site */}
        {activeTab === 'surahs' && (
          <div className="analytics-tab-content">
            <div className="analytics-section-title">Most Streamed Surahs on Site</div>
            {analytics.topSurahs.length > 0 ? (
              <div className="top-surahs-analytics-list">
                {analytics.topSurahs.map((surah, idx) => (
                  <div key={surah.id} className="top-surah-analytics-item">
                    <div className="top-surah-rank-badge">{idx + 1}</div>
                    <div className="top-surah-analytics-details">
                      <div className="top-surah-title-row">
                        <span className="top-surah-name">{surah.nameEnglish}</span>
                        <span className="top-surah-arabic">{surah.nameArabic}</span>
                      </div>
                      <div className="top-surah-bar-wrap">
                        <div
                          className="top-surah-bar-fill"
                          style={{ width: `${surah.percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="top-surah-count-col">
                      <span className="top-surah-streams">{surah.streamsFormatted}</span>
                      <span className="top-surah-share-tag">{surah.percentage}% share</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="analytics-empty-state">
                <Music2 size={32} color="currentColor" />
                <div className="empty-title">No Surahs Played Yet</div>
                <div className="empty-desc">
                  Start listening to any Surah by {reciter.name} on Quranly to build real recitation analytics!
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Session & Environment */}
        {activeTab === 'environment' && (
          <div className="analytics-tab-content">
            <div className="analytics-section-title">Session &amp; Site Environment</div>
            <div className="environment-info-list">
              <div className="environment-info-card">
                <div className="environment-icon-wrap">
                  <Smartphone size={18} />
                </div>
                <div className="environment-text">
                  <div className="env-label">App Environment</div>
                  <div className="env-val">{isPWA ? 'Installed Standalone App (PWA)' : 'Safari / Web Browser'}</div>
                </div>
              </div>

              <div className="environment-info-card">
                <div className="environment-icon-wrap">
                  <Database size={18} />
                </div>
                <div className="environment-text">
                  <div className="env-label">Storage &amp; Analytics Sync</div>
                  <div className="env-val">Local Persistence (100% Real-time)</div>
                </div>
              </div>

              <div className="environment-info-card">
                <div className="environment-icon-wrap">
                  <Music2 size={18} />
                </div>
                <div className="environment-text">
                  <div className="env-label">Surahs Explored</div>
                  <div className="env-val">{analytics.uniqueSurahsCount} distinct Surahs played</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Your Personal Stats */}
        {activeTab === 'you' && (
          <div className="analytics-tab-content">
            <div className="user-stats-card">
              <div className="user-stats-badge">
                <Sparkles size={16} />
                <span>Your Real Site Engagement</span>
              </div>
              <div className="user-stats-grid">
                <div className="user-stat-block">
                  <div className="user-stat-number">{analytics.userStats.userPlays}</div>
                  <div className="user-stat-desc">Plays on Site</div>
                </div>
                <div className="user-stat-block">
                  <div className="user-stat-number">{analytics.userStats.userMinutes}m</div>
                  <div className="user-stat-desc">Minutes Listened</div>
                </div>
                <div className="user-stat-block">
                  <div className="user-stat-number">{analytics.userStats.profileViews}</div>
                  <div className="user-stat-desc">Profile Views</div>
                </div>
              </div>

              {analytics.userStats.isTopFan ? (
                <div className="top-fan-banner">
                  <Award size={20} color="#fff" />
                  <div>
                    <div className="top-fan-title">Verified Top Listener</div>
                    <div className="top-fan-subtitle">You have listened regularly to {reciter.name} on this site!</div>
                  </div>
                </div>
              ) : (
                <div className="listen-more-banner">
                  <Flame size={18} color="var(--text-secondary)" />
                  <span>
                    Play {Math.max(1, 5 - analytics.userStats.userPlays)} more surahs to unlock the verified Top Fan badge for {reciter.name}!
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReciterAnalyticsModal;
