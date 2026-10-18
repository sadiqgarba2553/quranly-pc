import { fetchHadiths } from './hadithApi';
import { fetchTafsir } from './quranApi';

/**
 * Retrieve authentic context (Verses, Tafsir, Hadiths) matching user query
 */
export const retrieveIslamicContext = async (query, {signal} = {}) => {
  const context = {
    verses: [],
    tafsir: [],
    hadiths: []
  };

  try {
    // 1. Search Quran.com API v4 for matching verses
    const quranRes = await fetch(`https://api.quran.com/api/v4/search?q=${encodeURIComponent(query)}&size=3&language=en`, {signal: signal ? AbortSignal.any([signal,AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000)});
    if (quranRes.ok) {
      const quranData = await quranRes.json();
      if (quranData.search?.results) {
        context.verses = quranData.search.results.map(r => ({
          verseKey: r.verse_key,
          arabicText: r.text,
          translation: r.translations?.[0]?.text?.replace(/<[^>]+>/g, '') || ''
        }));
      }
    }

    // 2. Fetch Tafsir for top matching verse if available
    if (context.verses.length > 0) {
      const [surahNum, verseNum] = context.verses[0].verseKey.split(':');
      const tafsir = await fetchTafsir(169, surahNum, verseNum, {signal}); // 169 is Ibn Kathir
      if (tafsir?.text) {
        context.tafsir.push({
          verseKey: context.verses[0].verseKey,
          sourceName: 'Tafsir Ibn Kathir',
          text: tafsir.text.replace(/<[^>]+>/g, '').slice(0, 500) + '...'
        });
      }
    }

    // 3. Fetch Hadiths matching query
    const hadithRes = await fetchHadiths({ search: query, page: 1 });
    if (hadithRes?.hadiths && hadithRes.hadiths.length > 0) {
      context.hadiths = hadithRes.hadiths.slice(0, 3).map(h => ({
        bookName: h.book?.bookName || 'Sahih Collection',
        hadithNumber: h.hadithNumber,
        status: h.status || 'Grade not supplied',
        textEnglish: h.hadithEnglish,
        textArabic: h.hadithArabic
      }));
    }
  } catch (err) {
    if (signal?.aborted) throw err;
    if (!context.verses.length) throw Error('Could not retrieve sources. Check your connection and try again.');
    console.warn("Some sources were unavailable:", err.message);
  }

  return context;
};

/**
 * Generate Grounded RAG System Prompt
 */
export const buildGroundedPrompt = (query, retrievedContext) => {
  let prompt = `You are Quranly AI, an Islamic Assistant grounded STRICTLY in authentic retrieved sources.\n`;
  prompt += `Answer the user's question accurately using ONLY the retrieved facts below.\n\n`;

  prompt += `--- RETRIEVED QURANIC VERSES ---\n`;
  if (retrievedContext.verses.length > 0) {
    retrievedContext.verses.forEach(v => {
      prompt += `[Verse ${v.verseKey}]: Arabic: "${v.arabicText}" | Translation: "${v.translation}"\n`;
    });
  } else {
    prompt += `No specific verse matching query directly.\n`;
  }

  prompt += `\n--- RETRIEVED TAFSIR COMMENTARY ---\n`;
  if (retrievedContext.tafsir.length > 0) {
    retrievedContext.tafsir.forEach(t => {
      prompt += `[Tafsir for ${t.verseKey} (${t.sourceName})]: "${t.text}"\n`;
    });
  } else {
    prompt += `No specific tafsir commentary loaded.\n`;
  }

  prompt += `\n--- RETRIEVED HADITHS ---\n`;
  if (retrievedContext.hadiths.length > 0) {
    retrievedContext.hadiths.forEach(h => {
      prompt += `[${h.bookName} #${h.hadithNumber} - ${h.status}]: "${h.textEnglish}"\n`;
    });
  } else {
    prompt += `No specific Hadith found for query.\n`;
  }

  prompt += `\n--- INSTRUCTIONS ---\n`;
  prompt += `1. Synthesize a respectful, clear answer to: "${query}" based on the retrieved sources above.\n`;
  prompt += `2. You MUST cite inline references strictly corresponding to the retrieved sources (e.g. [Verse 2:153] or [Sahih Bukhari #1]).\n`;
  prompt += `3. Do NOT make up any citations or facts outside of the retrieved context.\n`;

  return prompt;
};
