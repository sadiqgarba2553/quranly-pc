/**
 * Curated Mood-Based Guidance Engine for Quranly
 * Maps human emotional states to authentic Quranic Ayahs, translations, and audio.
 */

export const MOOD_CATEGORIES = [
  {
    id: 'anxiety',
    name: 'Anxiety & Inner Peace',
    iconName: 'Shield',
    accentColor: '#ffffff',
    bgTint: 'rgba(255, 255, 255, 0.12)',
    description: 'Verses to calm the restless heart and relieve anxiety',
    verses: [
      {
        verseKey: '13:28',
        surahName: "Ar-Ra'd",
        surahNumber: 13,
        verseNumber: 28,
        arabicText: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",
        translation: "Unquestionably, by the remembrance of Allah hearts find rest.",
        audioUrl: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/1735.mp3"
      },
      {
        verseKey: '94:5-6',
        surahName: "Ash-Sharh",
        surahNumber: 94,
        verseNumber: 5,
        arabicText: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا • إِنَّ مَعَ الْعُسْرِ يُسْرًا",
        translation: "For indeed, with hardship [will be] ease. Indeed, with hardship [will be] ease.",
        audioUrl: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/6095.mp3"
      }
    ]
  },
  {
    id: 'gratitude',
    name: 'Gratitude & Joy',
    iconName: 'Sun',
    accentColor: '#ffffff',
    bgTint: 'rgba(255, 255, 255, 0.12)',
    description: 'Verses reflecting divine blessings, joy, and thankfulness',
    verses: [
      {
        verseKey: '14:7',
        surahName: "Ibrahim",
        surahNumber: 14,
        verseNumber: 7,
        arabicText: "لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ",
        translation: "If you are grateful, I will surely increase you in favor.",
        audioUrl: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/1757.mp3"
      },
      {
        verseKey: '55:13',
        surahName: "Ar-Rahman",
        surahNumber: 55,
        verseNumber: 13,
        arabicText: "فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ",
        translation: "So which of the favors of your Lord would you deny?",
        audioUrl: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/4914.mp3"
      }
    ]
  },
  {
    id: 'grief',
    name: 'Grief & Loss',
    iconName: 'CloudRain',
    accentColor: '#ffffff',
    bgTint: 'rgba(255, 255, 255, 0.12)',
    description: 'Comforting verses during times of sorrow, loss, and bereavement',
    verses: [
      {
        verseKey: '2:156',
        surahName: "Al-Baqarah",
        surahNumber: 2,
        verseNumber: 156,
        arabicText: "إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ",
        translation: "Indeed we belong to Allah, and indeed to Him we shall return.",
        audioUrl: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/163.mp3"
      },
      {
        verseKey: '3:139',
        surahName: "Ali 'Imran",
        surahNumber: 3,
        verseNumber: 139,
        arabicText: "وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنتُمُ الْأَعْلَوْنَ إِن كُنتُم مُّؤْمِنِينَ",
        translation: "So do not weaken and do not grieve, and you will be superior if you are [true] believers.",
        audioUrl: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/432.mp3"
      }
    ]
  },
  {
    id: 'patience',
    name: 'Patience & Perseverance',
    iconName: 'Compass',
    accentColor: '#ffffff',
    bgTint: 'rgba(255, 255, 255, 0.12)',
    description: 'Verses inspiring patience, resilience, and steadfastness in trial',
    verses: [
      {
        verseKey: '2:153',
        surahName: "Al-Baqarah",
        surahNumber: 2,
        verseNumber: 153,
        arabicText: "يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ",
        translation: "O you who have believed, seek help through patience and prayer. Indeed, Allah is with the patient.",
        audioUrl: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/160.mp3"
      },
      {
        verseKey: '39:10',
        surahName: "Az-Zumar",
        surahNumber: 39,
        verseNumber: 10,
        arabicText: "إِنَّمَا يُوَفَّى الصَّابِرُونَ أَجْرَهُم بِغَيْرِ حِسَابٍ",
        translation: "Indeed, the patient will be given their reward without account.",
        audioUrl: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/4068.mp3"
      }
    ]
  },
  {
    id: 'hope',
    name: 'Hope & Forgiveness',
    iconName: 'Sparkles',
    accentColor: '#ffffff',
    bgTint: 'rgba(255, 255, 255, 0.12)',
    description: 'Verses on divine mercy, repentance, and renewal of hope',
    verses: [
      {
        verseKey: '39:53',
        surahName: "Az-Zumar",
        surahNumber: 39,
        verseNumber: 53,
        arabicText: "قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ",
        translation: "Say: O My servants who have transgressed against themselves, do not despair of the mercy of Allah. Indeed, Allah forgives all sins.",
        audioUrl: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/4111.mp3"
      }
    ]
  }
];

export const getMoodCategoryById = (id) => {
  return MOOD_CATEGORIES.find(m => m.id === id) || MOOD_CATEGORIES[0];
};
