export function savePlaybackCheckpoint(storage,track,position){
  if(!track?.surah?.id||!track?.reciter?.id)return false;
  const time=Number(position);
  if(!Number.isFinite(time)||time<0)return false;
  try{storage.setItem('quranly_last_track',JSON.stringify({track,currentTime:time,savedAt:new Date().toISOString()}));return true;}catch{return false;}
}
