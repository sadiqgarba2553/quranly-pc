// Real working offline cache service using browser Cache API

const CACHE_NAME = 'quranly-audio-v1';
const METADATA_KEY = 'quranly_downloaded_tracks';

// Get list of downloaded tracks metadata from localStorage
export function getDownloadedTracks() {
  try {
    const saved = localStorage.getItem(METADATA_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('Error loading downloaded tracks metadata:', e);
    return [];
  }
}

// Calculate total storage used in bytes
export function getTotalStorageUsed() {
  const tracks = getDownloadedTracks();
  return tracks.reduce((total, track) => total + (track.sizeBytes || 0), 0);
}

// Check if a specific track is downloaded
export function isTrackDownloaded(surahId, reciterId) {
  const tracks = getDownloadedTracks();
  return tracks.some(t => t.surahId === surahId && t.reciterId === reciterId);
}

// Save downloaded tracks metadata
function saveDownloadedTracks(tracks) {
  try {
    localStorage.setItem(METADATA_KEY, JSON.stringify(tracks));
  } catch (e) {
    console.error('Error saving downloaded tracks metadata:', e);
  }
}

// Download and cache an audio URL
export async function downloadAudioTrack(audioUrl, surah, reciter, onProgress, signal) {
  if (!audioUrl) throw new Error('No audio URL provided');
  if (!('caches' in window)) throw new Error('Cache API not supported in this browser');

  const cache = await caches.open(CACHE_NAME);

  // Fetch with progress tracking
  const response = await fetch(audioUrl, {signal});
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

  const contentLength = response.headers.get('content-length');
  const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

  const reader = response.body.getReader();
  let receivedBytes = 0;
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    receivedBytes += value.length;

    if (totalBytes && onProgress) {
      const percent = Math.round((receivedBytes / totalBytes) * 100);
      onProgress(percent);
    }
  }

  // Combine chunks into a single Blob and create Response for Cache
  const blob = new Blob(chunks, { type: response.headers.get('content-type') || 'audio/mpeg' });
  const cacheResponse = new Response(blob, {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': blob.type,
      'Content-Length': blob.size.toString(),
    },
  });

  await cache.put(audioUrl, cacheResponse);

  // Save metadata
  const tracks = getDownloadedTracks();
  const trackId = `${surah.id}_${reciter.id}`;
  const existingIndex = tracks.findIndex(t => t.id === trackId);

  const metadata = {
    id: trackId,
    surahId: surah.id,
    surahName: surah.nameEnglish || surah.name,
    surahArabic: surah.nameArabic,
    reciterId: reciter.id,
    reciterName: reciter.name,
    audioUrl,
    sizeBytes: blob.size,
    downloadedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    tracks[existingIndex] = metadata;
  } else {
    tracks.push(metadata);
  }

  saveDownloadedTracks(tracks);
  return metadata;
}

// Remove cached track
export async function removeAudioTrack(surahId, reciterId) {
  const trackId = `${surahId}_${reciterId}`;
  const tracks = getDownloadedTracks();
  const target = tracks.find(t => t.id === trackId);

  if (target && 'caches' in window) {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(target.audioUrl);
  }

  const updated = tracks.filter(t => t.id !== trackId);
  saveDownloadedTracks(updated);
  return updated;
}

// Try to get cached response matching URL
export async function getCachedAudioUrl(audioUrl) {
  if(audioUrl?.startsWith('quranly-audio://cache/'))return audioUrl;
  if(audioUrl&&window.quranlyDesktop?.collections){
    try{const local=await window.quranlyDesktop.collections.audio(audioUrl);if(local)return local;}catch(error){console.warn('Collection audio unavailable:',error.message);}
  }
  if (!audioUrl || !('caches' in window)) return audioUrl;
  try {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(audioUrl);
    if (match) {
      const blob = await match.blob();
      return URL.createObjectURL(blob);
    }
  } catch (e) {
    console.error('Cache match error:', e);
  }
  return audioUrl;
}
