/**
 * reciterAnalytics.js — 100% Real Site-Only Reciter Analytics
 * All data is strictly derived from actual user interactions on this site/app.
 */

const STORAGE_KEY = 'quranly_site_reciter_analytics_v2';

function getStoredStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredStats(stats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    window.dispatchEvent(new Event('quranly-analytics-changed'));
  } catch (e) {
    console.warn('Failed to save reciter analytics:', e);
  }
}

function getTodayKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Increments profile view count for a reciter on this site
 */
export function recordProfileView(reciterId) {
  if (!reciterId && reciterId !== 0) return;
  const key = String(reciterId);
  const data = getStoredStats();
  if (!data[key]) {
    data[key] = {
      profileViews: 0,
      totalPlays: 0,
      totalSeconds: 0,
      completedSurahs: 0,
      playedSurahs: {},
      dailyPlays: {},
      firstVisitedAt: Date.now(),
      lastVisitedAt: Date.now(),
    };
  }
  data[key].profileViews = (data[key].profileViews || 0) + 1;
  data[key].lastVisitedAt = Date.now();
  saveStoredStats(data);
}

/**
 * Records a real track play for a reciter & surah on this site
 */
export function recordReciterPlay(reciterId, surahId) {
  if (!reciterId && reciterId !== 0) return;
  const key = String(reciterId);
  const data = getStoredStats();
  if (!data[key]) {
    data[key] = {
      profileViews: 0,
      totalPlays: 0,
      totalSeconds: 0,
      completedSurahs: 0,
      playedSurahs: {},
      dailyPlays: {},
      firstVisitedAt: Date.now(),
      lastVisitedAt: Date.now(),
    };
  }

  // Increment total plays
  data[key].totalPlays = (data[key].totalPlays || 0) + 1;
  data[key].lastPlayedAt = Date.now();

  // Increment specific surah count
  if (surahId) {
    if (!data[key].playedSurahs) data[key].playedSurahs = {};
    data[key].playedSurahs[surahId] = (data[key].playedSurahs[surahId] || 0) + 1;
  }

  // Increment daily activity
  const todayKey = getTodayKey();
  if (!data[key].dailyPlays) data[key].dailyPlays = {};
  data[key].dailyPlays[todayKey] = (data[key].dailyPlays[todayKey] || 0) + 1;

  saveStoredStats(data);
}

/**
 * Records listening duration in seconds for a reciter on this site
 */
export function recordListeningDuration(reciterId, durationSeconds = 1) {
  if (!reciterId && reciterId !== 0 || durationSeconds <= 0) return;
  const key = String(reciterId);
  const data = getStoredStats();
  if (!data[key]) {
    data[key] = {
      profileViews: 0,
      totalPlays: 0,
      totalSeconds: 0,
      completedSurahs: 0,
      playedSurahs: {},
      dailyPlays: {},
    };
  }
  data[key].totalSeconds = (data[key].totalSeconds || 0) + durationSeconds;
  saveStoredStats(data);
}

/**
 * Records that a surah finished playing completely on this site
 */
export function recordSurahCompleted(reciterId, surahId) {
  if (!reciterId && reciterId !== 0) return;
  const key = String(reciterId);
  const data = getStoredStats();
  if (!data[key]) return;
  data[key].completedSurahs = (data[key].completedSurahs || 0) + 1;
  saveStoredStats(data);
}

/**
 * Generates 100% genuine site analytics for a given reciter
 * @param {Object} reciter - Reciter object
 * @param {Array} allSurahs - List of all Surahs from context for name lookup
 * @param {Boolean} isCurrentlyPlaying - Whether this reciter is actively playing right now
 */
export function getReciterAnalytics(reciter, allSurahs = [], isCurrentlyPlaying = false) {
  if (!reciter) return null;
  const key = String(reciter.id);
  const stored = getStoredStats()[key] || {
    profileViews: 0,
    totalPlays: 0,
    totalSeconds: 0,
    completedSurahs: 0,
    playedSurahs: {},
    dailyPlays: {},
    lastPlayedAt: null,
    lastVisitedAt: null,
  };

  const totalPlays = stored.totalPlays || 0;
  const totalSeconds = stored.totalSeconds || 0;
  const totalMinutes = Math.round(totalSeconds / 60);
  const profileViews = stored.profileViews || 0;
  const completedSurahs = stored.completedSurahs || 0;

  // Completion rate based on real site completions vs total plays
  const completionRate = totalPlays > 0
    ? Math.min(100, Math.round((completedSurahs / totalPlays) * 100))
    : 0;

  // Average session length on this site
  const avgSessionMinutes = totalPlays > 0
    ? Math.max(1, Math.round((totalMinutes / totalPlays)))
    : 0;

  // Generate real 7-day activity array (last 7 days from today)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyTrend = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const yKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayLabel = dayNames[d.getDay()];
    const playsOnDate = stored.dailyPlays?.[yKey] || 0;
    const isToday = i === 0;

    weeklyTrend.push({
      dateKey: yKey,
      day: dayLabel,
      isToday,
      streams: playsOnDate,
      formatted: `${playsOnDate} plays`
    });
  }

  // Real Top Surahs played on this site
  const playedSurahEntries = Object.entries(stored.playedSurahs || {});
  const surahsMap = new Map((allSurahs || []).map(s => [Number(s.id), s]));

  let topSurahs = [];
  if (playedSurahEntries.length > 0) {
    topSurahs = playedSurahEntries
      .map(([surahIdStr, count]) => {
        const sId = Number(surahIdStr);
        const meta = surahsMap.get(sId) || { nameEnglish: `Surah #${sId}`, nameArabic: '' };
        const share = totalPlays > 0 ? Math.round((count / totalPlays) * 100) : 0;
        return {
          id: sId,
          nameEnglish: meta.nameEnglish || `Surah #${sId}`,
          nameArabic: meta.nameArabic || '',
          streams: count,
          percentage: share,
          streamsFormatted: `${count} ${count === 1 ? 'play' : 'plays'}`
        };
      })
      .sort((a, b) => b.streams - a.streams)
      .slice(0, 5);
  }

  // Format relative last active text
  let lastActiveText = 'No recorded plays yet';
  if (isCurrentlyPlaying) {
    lastActiveText = 'Listening now';
  } else if (stored.lastPlayedAt) {
    const diffMs = Date.now() - stored.lastPlayedAt;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) lastActiveText = 'Just now';
    else if (diffMins < 60) lastActiveText = `${diffMins}m ago`;
    else {
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) lastActiveText = `${diffHours}h ago`;
      else lastActiveText = `${Math.floor(diffHours / 24)}d ago`;
    }
  }

  return {
    isCurrentlyPlaying,
    liveStatusText: isCurrentlyPlaying ? 'Active Session (Playing Now)' : (totalPlays > 0 ? `Last active ${lastActiveText}` : 'Ready to stream'),
    totalPlays,
    totalPlaysFormatted: totalPlays.toLocaleString(),
    totalMinutes,
    totalMinutesFormatted: `${totalMinutes}m`,
    profileViews,
    profileViewsFormatted: profileViews.toLocaleString(),
    completionRate: `${completionRate}%`,
    avgDailySession: totalPlays > 0 ? `${avgSessionMinutes} mins` : '0 mins',
    weeklyTrend,
    topSurahs,
    uniqueSurahsCount: playedSurahEntries.length,
    lastPlayedAt: stored.lastPlayedAt,
    userStats: {
      userPlays: totalPlays,
      userMinutes: totalMinutes,
      profileViews: profileViews,
      completedSurahs: completedSurahs,
      isTopFan: totalPlays >= 5 || totalMinutes >= 20,
    }
  };
}
