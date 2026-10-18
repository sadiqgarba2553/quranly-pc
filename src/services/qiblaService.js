/**
 * Qibla Compass Great-Circle Bearing Math & Adhan Audio Services
 */

const KAABA_LAT = 21.422487;
const KAABA_LNG = 39.826206;

/**
 * Calculate Great-Circle bearing angle (0° - 360°) to Kaaba in Makkah from user (lat, lng)
 */
export const calculateQiblaBearing = (userLat, userLng) => {
  const phi1 = (userLat * Math.PI) / 180;
  const phi2 = (KAABA_LAT * Math.PI) / 180;
  const deltaLambda = ((KAABA_LNG - userLng) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
};

/**
 * Licensed Permissible Adhan Audio Stream URLs (High Availability CDN Endpoints)
 */
export const ADHAN_AUDIO_CHOICES = [
  { 
    id: 'makkah', 
    name: 'Makkah Al-Mukarramah Adhan', 
    audioUrl: 'https://raw.githubusercontent.com/mohsalvi/adhan-audio/main/general/makkah-haram-01.mp3' 
  },
  { 
    id: 'madinah', 
    name: 'Madinah Al-Munawwarah Adhan', 
    audioUrl: 'https://raw.githubusercontent.com/mohsalvi/adhan-audio/main/general/madinah-01.mp3' 
  },
  { 
    id: 'alafasy', 
    name: 'Sheikh Mishary Alafasy Adhan', 
    audioUrl: 'https://raw.githubusercontent.com/mohsalvi/adhan-audio/main/general/mishary-alafasy-01.mp3' 
  },
  { 
    id: 'alaqsa', 
    name: 'Al-Aqsa Mosque Jerusalem Adhan', 
    audioUrl: 'https://raw.githubusercontent.com/mohsalvi/adhan-audio/main/general/al-aqsa-jerusalem-01.mp3' 
  },
  { 
    id: 'cairo', 
    name: 'Cairo, Egypt Traditional Adhan', 
    audioUrl: 'https://raw.githubusercontent.com/mohsalvi/adhan-audio/main/general/egypt-traditional-01.mp3' 
  },
];

/**
 * Check if today is a recommended voluntary fasting day (Mondays, Thursdays, or White Days 13-15 Hijri)
 */
export const checkFastingStatus = (hijriDay) => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 1 = Monday, 4 = Thursday
  const isMonday = dayOfWeek === 1;
  const isThursday = dayOfWeek === 4;
  const isWhiteDay = [13, 14, 15].includes(Number(hijriDay));

  let reason = null;
  if (isMonday) reason = "Sunnah Fasting Day (Monday)";
  else if (isThursday) reason = "Sunnah Fasting Day (Thursday)";
  else if (isWhiteDay) reason = "White Day Fast (Ayyam al-Beed)";

  return {
    isRecommendedFast: isMonday || isThursday || isWhiteDay,
    reason
  };
};
