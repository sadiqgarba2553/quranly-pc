const {test,beforeEach,afterEach}=require('node:test'),assert=require('node:assert/strict');
let values,entries,cache,service,originalFetch;
beforeEach(async()=>{
  values=new Map();entries=new Map();originalFetch=global.fetch;
  global.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  cache={put:async(key,response)=>entries.set(key,response.clone()),match:async key=>entries.get(key)?.clone(),delete:async key=>entries.delete(key)};
  global.caches={open:async()=>cache};global.window={caches};
  service=await import('../src/services/offlineCache.js');
});
afterEach(()=>{global.fetch=originalFetch;delete global.localStorage;delete global.caches;delete global.window;});
const surah={id:1,nameEnglish:'Al-Fatihah',nameArabic:'Al-Fatihah'},reciter={id:2,name:'Reciter'},url='https://audio.example/001.mp3';
const audio=()=>new Response(Buffer.from('complete audio'),{headers:{'content-type':'audio/mpeg','content-length':'14'}});
test('offline save commits complete audio and validates the library',async()=>{
  global.fetch=async()=>audio();const track=await service.downloadAudioTrack(url,surah,reciter);
  assert.equal(track.sizeBytes,14);assert.equal(service.isTrackDownloaded('1','2'),true);assert.deepEqual((await service.verifyOfflineLibrary()).missing,[]);
  entries.delete(track.cacheKey);assert.deepEqual((await service.verifyOfflineLibrary()).missing,['1_2']);
});
test('interrupted, empty and non-audio responses never enter the offline library',async()=>{
  for(const response of [new Response('short',{headers:{'content-length':'40'}}),new Response(''),new Response('<html>error</html>',{headers:{'content-type':'text/html'}})]){
    global.fetch=async()=>response;await assert.rejects(()=>service.downloadAudioTrack(url,surah,reciter));assert.deepEqual(service.getDownloadedTracks(),[]);assert.equal(entries.size,0);
  }
});
test('metadata quota failures preserve the previous download and remove staged bytes',async()=>{
  global.fetch=async()=>audio();const original=await service.downloadAudioTrack(url,surah,reciter);
  const save=localStorage.setItem;localStorage.setItem=(key,value)=>{if(key==='quranly_downloaded_tracks')throw new DOMException('Full','QuotaExceededError');save(key,value);};
  await assert.rejects(()=>service.downloadAudioTrack(url,surah,reciter),{name:'QuotaExceededError'});
  assert.deepEqual(service.getDownloadedTracks(),[original]);assert.equal(entries.size,1);assert.ok(entries.has(original.cacheKey));
});
test('cancelled downloads leave no completed entry and malformed metadata falls back to its backup',async()=>{
  global.fetch=async()=>audio();const controller=new AbortController();controller.abort();
  await assert.rejects(()=>service.downloadAudioTrack(url,surah,reciter,null,controller.signal),{name:'AbortError'});assert.equal(entries.size,0);
  const track=await service.downloadAudioTrack(url,surah,reciter);values.set('quranly_downloaded_tracks_backup',JSON.stringify([track]));values.set('quranly_downloaded_tracks','broken');assert.deepEqual(service.getDownloadedTracks(),[track]);
});
test('removing one legacy entry keeps shared cached audio for the other entry',async()=>{
  const a={id:'1_2',surahId:1,reciterId:2,audioUrl:url,sizeBytes:14},b={...a,id:'1_3',reciterId:3};
  values.set('quranly_downloaded_tracks',JSON.stringify([a,b]));await cache.put(url,audio());
  await service.removeAudioTrack(1,2);assert.equal(entries.has(url),true);assert.equal(service.getDownloadedTracks().length,1);
});
test('playback checkpoints preserve the final seconds and reject invalid positions',async()=>{
  const {savePlaybackCheckpoint}=await import('../src/utils/playbackCheckpoint.js'),track={surah,reciter};
  assert.equal(savePlaybackCheckpoint(localStorage,track,42.7),true);assert.equal(JSON.parse(values.get('quranly_last_track')).currentTime,42.7);
  assert.equal(savePlaybackCheckpoint(localStorage,track,NaN),false);assert.equal(savePlaybackCheckpoint(localStorage,null,0),false);assert.equal(JSON.parse(values.get('quranly_last_track')).currentTime,42.7);
});
