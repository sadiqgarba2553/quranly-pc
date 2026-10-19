// Commit audio bytes before publishing the offline library entry.
const CACHE_NAME = 'quranly-audio-v1';
const METADATA_KEY = 'quranly_downloaded_tracks';
const BACKUP_KEY = METADATA_KEY + '_backup';
const activeDownloads = new Set();
export function getDownloadedTracks() {
  for (const key of [METADATA_KEY, BACKUP_KEY]) {
    try {
      const saved=localStorage.getItem(key);if(!saved)continue;
      const tracks=JSON.parse(saved);
      if(Array.isArray(tracks))return tracks.filter(track=>track&&typeof track.id==='string'&&typeof track.audioUrl==='string'&&Number.isFinite(track.sizeBytes)&&track.sizeBytes>0);
    } catch {}
  }
  return [];
}
export function getTotalStorageUsed(){return getDownloadedTracks().reduce((sum,track)=>sum+track.sizeBytes,0);}
export function isTrackDownloaded(surahId,reciterId){return getDownloadedTracks().some(track=>String(track.surahId)===String(surahId)&&String(track.reciterId)===String(reciterId));}
function saveDownloadedTracks(tracks){
  const previous=JSON.stringify(getDownloadedTracks());
  localStorage.setItem(BACKUP_KEY,previous);
  localStorage.setItem(METADATA_KEY,JSON.stringify(tracks));
}
export async function downloadAudioTrack(audioUrl,surah,reciter,onProgress,signal){
  if(!audioUrl)throw Error('No audio URL provided');
  if(!('caches' in window))throw Error('Offline audio is not supported on this device');
  const trackId=`${surah.id}_${reciter.id}`;
  if(activeDownloads.has(trackId))throw Error('This track is already downloading');
  activeDownloads.add(trackId);
  let reader,cache,stagedKey,committed=false;
  try{
    signal?.throwIfAborted();cache=await caches.open(CACHE_NAME);
    const response=await fetch(audioUrl,{signal});
    if(!response.ok||!response.body)throw Error('The audio download could not start');
    const type=response.headers.get('content-type')||'audio/mpeg';
    if(/text\/html|application\/json/i.test(type))throw Error('The server returned a page instead of audio');
    const total=Number(response.headers.get('content-length'))||0;
    reader=response.body.getReader();const chunks=[];let received=0;
    while(true){
      signal?.throwIfAborted();const {done,value}=await reader.read();if(done)break;
      received+=value.length;if(received>512*1024*1024)throw Error('This audio download is too large');
      chunks.push(value);onProgress?.(total?Math.min(99,Math.floor(received/total*100)):0);
    }
    signal?.throwIfAborted();
    if(!received||(total&&received!==total))throw Error('The audio download was interrupted. Retry to save the complete track.');
    const blob=new Blob(chunks,{type});
    stagedKey=`https://offline.quranly.local/audio/${encodeURIComponent(trackId)}/${crypto.randomUUID()}`;
    await cache.put(stagedKey,new Response(blob,{headers:{'Content-Type':type,'Content-Length':String(blob.size)}}));
    signal?.throwIfAborted();
    const tracks=getDownloadedTracks(),old=tracks.find(track=>track.id===trackId);
    const metadata={id:trackId,surahId:surah.id,surahName:surah.nameEnglish||surah.name,surahArabic:surah.nameArabic,reciterId:reciter.id,reciterName:reciter.name,audioUrl,cacheKey:stagedKey,sizeBytes:blob.size,downloadedAt:new Date().toISOString()};
    const updated=[...tracks.filter(track=>track.id!==trackId),metadata];
    saveDownloadedTracks(updated);committed=true;
    if(old&&!updated.some(track=>track.id!==trackId&&(track.cacheKey||track.audioUrl)===(old.cacheKey||old.audioUrl)))await cache.delete(old.cacheKey||old.audioUrl).catch(()=>{});
    onProgress?.(100);return metadata;
  }finally{
    if(reader){await reader.cancel().catch(()=>{});reader.releaseLock();}
    if(cache&&stagedKey&&!committed)await cache.delete(stagedKey).catch(()=>{});
    activeDownloads.delete(trackId);
  }
}
export async function removeAudioTrack(surahId,reciterId){
  const tracks=getDownloadedTracks(),target=tracks.find(track=>String(track.surahId)===String(surahId)&&String(track.reciterId)===String(reciterId));
  const updated=tracks.filter(track=>track!==target);
  // Keep the file if metadata cannot be committed; the user can retry removal.
  saveDownloadedTracks(updated);
  if(target&&'caches' in window&&!updated.some(track=>(track.cacheKey||track.audioUrl)===(target.cacheKey||target.audioUrl))){
    const cache=await caches.open(CACHE_NAME);await cache.delete(target.cacheKey||target.audioUrl);
  }
  return updated;
}
export async function verifyOfflineLibrary(){
  if(!('caches' in window))return {tracks:getDownloadedTracks(),missing:[]};
  const cache=await caches.open(CACHE_NAME),tracks=getDownloadedTracks(),missing=[];
  for(const track of tracks){const response=await cache.match(track.cacheKey||track.audioUrl);if(!response||Number(response.headers.get('content-length'))!==track.sizeBytes)missing.push(track.id);}
  return {tracks,missing};
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
    const track=getDownloadedTracks().find(track=>track.audioUrl===audioUrl);
    const match = await cache.match(track?.cacheKey||audioUrl);
    if (match) {
      const blob = await match.blob();
      return URL.createObjectURL(blob);
    }
  } catch (e) {
    console.error('Cache match error:', e);
  }
  return audioUrl;
}
