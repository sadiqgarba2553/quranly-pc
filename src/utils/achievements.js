import { localDateKey } from './dates.js';
// ─── Quranly Real Achievements & Badges Calculator ─────────────────

export const BADGES_DEFINITION = [
  {
    id: 'first_recitation',
    title: 'First Step',
    description: 'Listened to your first Quran recitation',
    icon: 'Sparkles',
    category: 'Listening',
    color: '#6366f1',
    xp: 100,
  },
  {
    id: 'streak_3',
    title: '3-Day Streak',
    description: 'Listen to Quran 3 days in a row',
    icon: 'Flame',
    category: 'Streak',
    color: '#f97316',
    xp: 150,
  },
  {
    id: 'streak_7',
    title: '7-Day Scholar',
    description: 'Maintain a 7-day recitation streak',
    icon: 'Zap',
    category: 'Streak',
    color: '#eab308',
    xp: 300,
  },
  {
    id: 'streak_30',
    title: 'Khatam Hero',
    description: 'Maintain a 30-day streak of daily recitation',
    icon: 'Crown',
    category: 'Streak',
    color: '#ec4899',
    xp: 1000,
  },
  {
    id: 'hour_master',
    title: '1 Hour Dedicated',
    description: 'Accumulate over 60 minutes of total listening',
    icon: 'Clock',
    category: 'Listening',
    color: '#10b981',
    xp: 200,
  },
  {
    id: 'five_hours',
    title: 'Deep Reflection',
    description: 'Accumulate 5 hours of total listening time',
    icon: 'Headphones',
    category: 'Listening',
    color: '#8b5cf6',
    xp: 500,
  },
  {
    id: 'qari_collector',
    title: 'Qari Explorer',
    description: 'Follow 3 or more reciters in your library',
    icon: 'Users',
    category: 'Collection',
    color: '#06b6d4',
    xp: 150,
  },
  {
    id: 'bookmark_scholar',
    title: 'Verse Scholar',
    description: 'Bookmark 5 or more Ayahs for reflection',
    icon: 'Bookmark',
    category: 'Collection',
    color: '#3b82f6',
    xp: 150,
  },
  {
    id: 'goal_crusher',
    title: 'Goal Crusher',
    description: 'Reach 100% of your daily listening goal today',
    icon: 'Target',
    category: 'Goal',
    color: '#84cc16',
    xp: 200,
  },
];

/**
 * Calculates current streak in days from listeningHistory
 */
export function calculateStreak(listeningHistory, dailyGoalMinutes = 10, now = new Date()) {
  const goalSeconds = dailyGoalMinutes * 60;
  let streak = 0;
  const checkDate = new Date(now);

  while (true) {
    const dateStr = localDateKey(checkDate);
    const sec = listeningHistory[dateStr] || 0;
    if (sec >= goalSeconds) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // If checking today and goal isn't met yet, check yesterday before breaking
      if (dateStr === localDateKey(now) && streak === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
        const ySec = listeningHistory[localDateKey(checkDate)] || 0;
        if (ySec >= goalSeconds) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
      }
      break;
    }
  }
  return streak;
}

/**
 * Calculates user's total lifetime seconds listened
 */
export function calculateTotalSeconds(listeningHistory) {
  return Object.values(listeningHistory || {}).reduce((acc, val) => acc + (val || 0), 0);
}

/**
 * Live evaluator for all user achievements
 */
export function evaluateUserAchievements({
  listeningHistory = {},
  dailyGoalMinutes = 10,
  favouriteReciterIds = new Set(),
  bookmarkedVerses = [],
}) {
  const totalSeconds = calculateTotalSeconds(listeningHistory);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const streak = calculateStreak(listeningHistory, dailyGoalMinutes);
  const todayStr = localDateKey();
  const todaySeconds = listeningHistory[todayStr] || 0;

  let totalXP = 0;
  const evaluatedBadges = BADGES_DEFINITION.map((badge) => {
    let unlocked = false;
    let progress = 0;

    switch (badge.id) {
      case 'first_recitation':
        unlocked = totalSeconds > 0;
        progress = unlocked ? 100 : 0;
        break;

      case 'streak_3':
        unlocked = streak >= 3;
        progress = Math.min(100, Math.round((streak / 3) * 100));
        break;

      case 'streak_7':
        unlocked = streak >= 7;
        progress = Math.min(100, Math.round((streak / 7) * 100));
        break;

      case 'streak_30':
        unlocked = streak >= 30;
        progress = Math.min(100, Math.round((streak / 30) * 100));
        break;

      case 'hour_master':
        unlocked = totalMinutes >= 60;
        progress = Math.min(100, Math.round((totalMinutes / 60) * 100));
        break;

      case 'five_hours':
        unlocked = totalMinutes >= 300;
        progress = Math.min(100, Math.round((totalMinutes / 300) * 100));
        break;

      case 'qari_collector': {
        const count = favouriteReciterIds?.size ?? 0;
        unlocked = count >= 3;
        progress = Math.min(100, Math.round((count / 3) * 100));
        break;
      }

      case 'bookmark_scholar': {
        const count = bookmarkedVerses?.length ?? 0;
        unlocked = count >= 5;
        progress = Math.min(100, Math.round((count / 5) * 100));
        break;
      }

      case 'goal_crusher':
        unlocked = todaySeconds >= dailyGoalMinutes * 60;
        progress = Math.min(100, Math.round((todaySeconds / (dailyGoalMinutes * 60)) * 100));
        break;

      default:
        break;
    }

    if (unlocked) {
      totalXP += badge.xp;
    }

    return {
      ...badge,
      unlocked,
      progress,
    };
  });

  // Calculate Level based on XP
  let levelTitle = 'Novice Listener';
  let levelNumber = 1;
  let nextLevelXP = 300;

  if (totalXP >= 1500) {
    levelTitle = 'Khatam Master';
    levelNumber = 4;
    nextLevelXP = 3000;
  } else if (totalXP >= 600) {
    levelTitle = 'Quran Companion';
    levelNumber = 3;
    nextLevelXP = 1500;
  } else if (totalXP >= 300) {
    levelTitle = 'Devoted Reciter';
    levelNumber = 2;
    nextLevelXP = 600;
  }

  const unlockedCount = evaluatedBadges.filter(b => b.unlocked).length;

  return {
    badges: evaluatedBadges,
    totalXP,
    unlockedCount,
    totalBadgesCount: BADGES_DEFINITION.length,
    streak,
    totalMinutes,
    levelTitle,
    levelNumber,
    nextLevelXP,
  };
}
