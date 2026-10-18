const HADITH_API_KEY = import.meta.env.VITE_HADITH_API_KEY || "";
const BASE_URL = "https://hadithapi.com/api";

export const HADITH_BOOKS = [
  { slug: 'all', name: 'All Books', count: '40,000+' },
  { slug: 'sahih-bukhari', name: 'Sahih Bukhari', count: '7,276' },
  { slug: 'sahih-muslim', name: 'Sahih Muslim', count: '7,564' },
  { slug: 'al-tirmidhi', name: "Jami' Al-Tirmidhi", count: '3,956' },
  { slug: 'abu-dawood', name: 'Sunan Abu Dawood', count: '5,274' },
  { slug: 'ibn-e-majah', name: 'Sunan Ibn Majah', count: '4,341' },
  { slug: 'sunan-nasai', name: 'Sunan An-Nasa`i', count: '5,761' },
];

/**
 * Generate native Arabic audio TTS URLs split into natural phrasing chunks.
 */
export const FALLBACK_HADITHS = [
  {
    id: 101,
    hadithNumber: "1",
    book: { bookName: "Sahih Bukhari", bookSlug: "sahih-bukhari" },
    englishNarrator: "Narrated 'Umar bin Al-Khattab:",
    hadithEnglish: "I heard Allah's Messenger (ﷺ) saying, 'The reward of deeds depends upon the intentions and every person will get the reward according to what he has intended.'",
    hadithArabic: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى، فَمَنْ كَانَتْ هِجْرَتُهُ إِلَى دُنْيَا يُصِيبُهَا أَوْ إِلَى امْرَأَةٍ يَنْكِحُهَا فَهِجْرَتُهُ إِلَى مَا هَاجَرَ إِلَيْهِ.",
    headingEnglish: "Action by Intention",
    status: "Sahih"
  },
  {
    id: 102,
    hadithNumber: "2699",
    book: { bookName: "Sahih Muslim", bookSlug: "sahih-muslim" },
    englishNarrator: "Narrated Abu Hurairah:",
    hadithEnglish: "The Messenger of Allah (ﷺ) said: 'Whoever relieves a believer's distress of the distressful aspects of this world, Allah will rescue him from the difficulties of the Day of Resurrection.'",
    hadithArabic: "مَنْ نَفَّسَ عَنْ مُؤْمِنٍ كُرْبَةً مِنْ كُرَبِ الدُّنْيَا نَفَّسَ اللَّهُ عَنْهُ كُرْبَةً مِنْ كُرَبِ يَوْمِ الْقِيَامَةِ، وَمَنْ يَسَّرَ عَلَى مُعْسِرٍ يَسَّرَ اللَّهُ عَلَيْهِ فِي الدُّنْيَا وَالآخِرَةِ.",
    headingEnglish: "Helping Believers and Seeking Knowledge",
    status: "Sahih"
  },
  {
    id: 103,
    hadithNumber: "1954",
    book: { bookName: "Jami' Al-Tirmidhi", bookSlug: "al-tirmidhi" },
    englishNarrator: "Narrated Abu Hurairah:",
    hadithEnglish: "The Messenger of Allah (ﷺ) said: 'The most complete of the believers in faith is the one with the best character among them, and the best of you are those who are best to their wives.'",
    hadithArabic: "أَكْمَلُ الْمُؤْمِنِينَ إِيمَانًا أَحْسَنُهُمْ خُلُقًا وَخِيَارُكُمْ خِيَارُكُمْ لِنِسَائِهِمْ.",
    headingEnglish: "Excellence of Good Character",
    status: "Sahih"
  },
  {
    id: 104,
    hadithNumber: "5125",
    book: { bookName: "Sunan Abu Dawood", bookSlug: "abu-dawood" },
    englishNarrator: "Narrated Abu Darda:",
    hadithEnglish: "The Prophet (ﷺ) said: 'Nothing is placed on the Scale that is heavier than good character. Indeed the person of good character will reach the status of the one who fasts and prays.'",
    hadithArabic: "مَا مِنْ شَيْءٍ أَثْقَلُ فِي الْمِيزَانِ مِنْ حُسْنِ الْخُلُقِ وَإِنَّ صَاحِبَ حُسْنِ الْخُلُقِ لَيَبْلُغُ بِهِ دَرَجَةَ صَاحِبِ الصَّوْمِ وَالصَّلاَةِ.",
    headingEnglish: "Weight of Good Character",
    status: "Sahih"
  },
  {
    id: 105,
    hadithNumber: "4251",
    book: { bookName: "Sunan Ibn Majah", bookSlug: "ibn-e-majah" },
    englishNarrator: "Narrated Anas bin Malik:",
    hadithEnglish: "The Messenger of Allah (ﷺ) said: 'Seeking knowledge is an obligation upon every Muslim.'",
    hadithArabic: "طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ.",
    headingEnglish: "Obligation of Seeking Knowledge",
    status: "Sahih"
  },
  {
    id: 106,
    hadithNumber: "5038",
    book: { bookName: "Sunan An-Nasa`i", bookSlug: "sunan-nasai" },
    englishNarrator: "Narrated Aishah:",
    hadithEnglish: "The Messenger of Allah (ﷺ) said: 'The most beloved of deeds to Allah are those that are most consistent, even if they are small.'",
    hadithArabic: "إِنَّ أَحَبَّ الأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ.",
    headingEnglish: "Consistency in Good Deeds",
    status: "Sahih"
  }
];

function filterFallbackHadiths(bookSlug, search) {
  let list = [...FALLBACK_HADITHS];
  if (bookSlug && bookSlug !== 'all') {
    list = list.filter(h => h.book.bookSlug === bookSlug);
  }
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(h =>
      (h.hadithEnglish && h.hadithEnglish.toLowerCase().includes(q)) ||
      (h.englishNarrator && h.englishNarrator.toLowerCase().includes(q)) ||
      (h.hadithArabic && h.hadithArabic.includes(q))
    );
  }
  return {
    hadiths: list,
    currentPage: 1,
    lastPage: 1,
    total: list.length,
  };
}

/**
 * Generate native Arabic speech synthesis or web audio URLs
 */
export function getArabicAudioUrls(text) {
  if (!text) return [];
  const cleaned = text.replace(/[‏#\u200B-\u200D\uFEFF]/g, '').trim();
  const chunks = [];
  let remaining = cleaned;

  while (remaining.length > 0) {
    if (remaining.length <= 180) {
      chunks.push(remaining);
      break;
    }
    let splitIdx = remaining.lastIndexOf('،', 180);
    if (splitIdx < 50) splitIdx = remaining.lastIndexOf(' ', 180);
    if (splitIdx <= 0) splitIdx = 180;

    chunks.push(remaining.slice(0, splitIdx).trim());
    remaining = remaining.slice(splitIdx).trim();
  }

  return chunks;
}

/**
 * Fetch Hadiths from HadithAPI with book, page, and search parameters.
 */
export async function fetchHadiths({ bookSlug = 'all', page = 1, search = '' } = {}) {
  if (!HADITH_API_KEY) {
    return filterFallbackHadiths(bookSlug, search);
  }
  try {
    let url = `${BASE_URL}/hadiths?apiKey=${HADITH_API_KEY}&page=${page}`;
    if (bookSlug && bookSlug !== 'all') {
      url += `&book=${bookSlug}`;
    }
    if (search) {
      url += `&hadithEnglish=${encodeURIComponent(search)}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 200 && data.hadiths?.data && data.hadiths.data.length > 0) {
      return {
        hadiths: data.hadiths.data,
        currentPage: data.hadiths.current_page,
        lastPage: data.hadiths.last_page,
        total: data.hadiths.total,
      };
    }
    return filterFallbackHadiths(bookSlug, search);
  } catch (err) {
    console.error("Error fetching hadiths, using fallback dataset:", err);
    return filterFallbackHadiths(bookSlug, search);
  }
}
