import { fetchTextJson } from './textCache';
// Quran APIs Service Layer for Quranly

export const fetchTafsir = async (tafsirId = 169, surahNumber, verseNumber, options = {}) => {
  try {
    const ayahKey = `${surahNumber}:${verseNumber}`;
    const data = await fetchTextJson(`https://api.quran.com/api/v4/tafsirs/${tafsirId}/by_ayah/${ayahKey}`,options);
    return data.tafsir;
  } catch (error) {
    console.error('Error fetching Tafsir:', error);
    return null;
  }
};

export const fetchTranslation = async (translationId = 131, surahNumber) => {
  try {
    const response = await fetch(`https://api.quran.com/api/v4/quran/translations/${translationId}?chapter_number=${surahNumber}`);
    if (!response.ok) throw new Error('Failed to fetch translation');
    const data = await response.json();
    return data.translations;
  } catch (error) {
    console.error('Error fetching translation:', error);
    return [];
  }
};

// Fetch Tajweed Uthmani Text for a Page
export const fetchTajweedPage = async (pageNumber, options = {}) => {
  try {
    const data = await fetchTextJson(`https://api.alquran.cloud/v1/page/${pageNumber}/quran-tajweed`, options);
    return data.data;
  } catch (error) {
    console.error('Error fetching Tajweed page:', error);
    return null;
  }
};

// Fetch Word-by-Word Translation, Word Audio & Reciter Segment Timestamps for a Page from Quran.com API v4
export const fetchWordByWordPage = async (pageNumber, reciterId = 7, options = {}) => {
  try {
    const data = await fetchTextJson(`https://api.quran.com/api/v4/verses/by_page/${pageNumber}?audio=${reciterId}&words=true&word_fields=text_uthmani,location,audio_url`, options);
    return data.verses || [];
  } catch (error) {
    console.error('Error fetching Word-by-Word page:', error);
    return [];
  }
};

// Helper to construct full QuranCDN Audio URL
export const getQuranCdnAudioUrl = (relativePath) => {
  if (!relativePath) return null;
  if (relativePath.startsWith('http')) return relativePath;
  return `https://audio.qurancdn.com/${relativePath}`;
};


// Parse AlQuran Cloud Tajweed Markup to HTML
export const parseTajweedText = (rawText) => {
  if (!rawText) return '';
  let prev = '';
  let result = rawText;
  
  // Recursively process nested brackets like [h:1[ٱ] or [n[ـٰ]
  while (result !== prev) {
    prev = result;
    result = result.replace(/\[([a-z]+)(?::\d+)?\[([^\]]+)\]/gi, (match, rule, content) => {
      return `<span class="tajweed-rule tajweed-${rule.toLowerCase()}" data-rule="${rule.toLowerCase()}">${content}</span>`;
    });
  }
  return result;
};
