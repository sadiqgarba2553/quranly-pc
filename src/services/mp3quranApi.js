// ─── MP3Quran API v3 Service ────────────────────────────────
// Base URL: https://mp3quran.net/api/v3
// No API key required. Language param: 'ar' | 'eng'

const BASE_URL = 'https://mp3quran.net/api/v3';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Generic fetch wrapper with abort-signal support
 */
async function apiFetch(path, signal) {
  const url = `${BASE_URL}${path}`;
  const timeout = AbortSignal.timeout(15000);
  const res = await fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  if (!res.ok) {
    throw new ApiError(`API request failed: ${url}`, res.status);
  }
  return res.json();
}

/**
 * Fetch all reciters
 * Response: { reciters: [{ id, name, letter, moshaf: [{ id, name, server, surah_total, moshaf_type, surah_list }] }] }
 * @param {string} language - 'ar' | 'eng'
 * @param {AbortSignal} [signal]
 */
export async function fetchReciters(language = 'eng', signal) {
  return apiFetch(`/reciters?language=${language}`, signal);
}

/**
 * Fetch all surahs (suwar)
 * Response: { suwar: [{ id, name, start_page, end_page, makkia, type }] }
 * @param {string} language - 'ar' | 'eng'
 * @param {AbortSignal} [signal]
 */
export async function fetchSuwar(language = 'eng', signal) {
  return apiFetch(`/suwar?language=${language}`, signal);
}

/**
 * Fetch all riwayat (narrations/readings)
 * Response: { riwayat: [{ id, name }] }
 * @param {string} language - 'ar' | 'eng'
 * @param {AbortSignal} [signal]
 */
export async function fetchRiwayat(language = 'eng', signal) {
  return apiFetch(`/riwayat?language=${language}`, signal);
}

/**
 * Fetch all moshaf (Quran editions/copies)
 * Response: { moshaf: [{ id, name, server, reciter_name, rewaya, moshaf_type, surah_total }] }
 * @param {string} language - 'ar' | 'eng'
 * @param {AbortSignal} [signal]
 */
export async function fetchMoshaf(language = 'eng', signal) {
  return apiFetch(`/moshaf?language=${language}`, signal);
}

/**
 * Fetch all radio streams
 * Response: { radios: [{ id, name, url, reciter_name }] }
 * @param {string} language - 'ar' | 'eng'
 * @param {AbortSignal} [signal]
 */
export async function fetchRadios(language = 'eng', signal) {
  return apiFetch(`/radios?language=${language}`, signal);
}

/**
 * Fetch all tafsir (Quranic interpretations)
 * Response: { tafasir: [{ id, name, bookname }] }
 * @param {string} language - 'ar' | 'eng'
 * @param {AbortSignal} [signal]
 */
export async function fetchTafasir(language = 'eng', signal) {
  return apiFetch(`/tafasir?language=${language}`, signal);
}

/**
 * Build the MP3 URL for a specific reciter server + surah number
 * e.g. server = "https://server5.mp3quran.net/sds/", surahNumber = 1 → "https://server5.mp3quran.net/sds/001.mp3"
 * @param {string} serverUrl
 * @param {number} surahNumber  (1-indexed)
 * @returns {string}
 */
export function buildSurahAudioUrl(serverUrl, surahNumber) {
  const padded = String(surahNumber).padStart(3, '0');
  return `${serverUrl.replace(/\/$/, '')}/${padded}.mp3`;
}
