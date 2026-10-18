/**
 * Sample surah recitations (Mishary Alafasy) for preview in Surah info sheets.
 * These are Quran recitation clips — not third-party scholar lecture series.
 */

export const SAMPLE_RECITATIONS = [
  {
    id: 'alafasy-samples',
    reciterName: 'Mishary Rashid Alafasy',
    title: 'Surah Recitation Samples',
    avatar: '/logo.png',
    description: 'Short preview clips of the surah recitation for listening reference.',
    license: 'Islamic Network CDN (open educational use)',
    samples: [
      {
        surahId: 1,
        surahName: 'Al-Fatiha',
        title: 'Al-Fatiha — Recitation Sample',
        duration: '~1 min',
        audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3',
        description: 'Full short surah sample for listening practice.',
      },
      {
        surahId: 18,
        surahName: 'Al-Kahf',
        title: 'Al-Kahf — Opening Recitation Sample',
        duration: 'Sample',
        audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/2130.mp3',
        description: 'Opening ayah sample of Surah Al-Kahf.',
      },
      {
        surahId: 36,
        surahName: 'Yasin',
        title: 'Yasin — Opening Recitation Sample',
        duration: 'Sample',
        audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/3706.mp3',
        description: 'Opening ayah sample of Surah Yasin.',
      },
      {
        surahId: 55,
        surahName: 'Ar-Rahman',
        title: 'Ar-Rahman — Opening Recitation Sample',
        duration: 'Sample',
        audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/4914.mp3',
        description: 'Opening ayah sample of Surah Ar-Rahman.',
      },
      {
        surahId: 67,
        surahName: 'Al-Mulk',
        title: 'Al-Mulk — Opening Recitation Sample',
        duration: 'Sample',
        audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/5242.mp3',
        description: 'Opening ayah sample of Surah Al-Mulk.',
      },
      {
        surahId: 2,
        surahName: 'Al-Baqarah',
        title: 'Al-Baqarah — Opening Recitation Sample',
        duration: 'Sample',
        audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/160.mp3',
        description: 'Opening ayah sample of Surah Al-Baqarah.',
      },
      {
        surahId: 12,
        surahName: 'Yusuf',
        title: 'Yusuf — Opening Recitation Sample',
        duration: 'Sample',
        audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/1602.mp3',
        description: 'Opening ayah sample of Surah Yusuf.',
      },
    ],
  },
];

/** @deprecated Use SAMPLE_RECITATIONS / fetchSamplesForSurah */
export const SCHOLAR_LECTURE_SERIES = SAMPLE_RECITATIONS;

export const fetchLecturesForSurah = (surahId) => fetchSamplesForSurah(surahId);

export const fetchSamplesForSurah = (surahId) => {
  const result = [];
  SAMPLE_RECITATIONS.forEach((series) => {
    const matched = (series.samples || series.lectures || []).filter(
      (l) => l.surahId === Number(surahId)
    );
    matched.forEach((lec) => {
      result.push({
        ...lec,
        scholarName: series.reciterName || series.scholarName,
        avatar: series.avatar,
        isSample: true,
      });
    });
  });
  return result;
};
