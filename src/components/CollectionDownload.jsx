import {useEffect,useMemo,useState} from 'react';
import './CollectionDownload.css';
export const formatDownloadBytes=bytes=>bytes>=1024**3?`${(bytes/1024**3).toFixed(2)} GB`:`${(bytes/1024**2).toFixed(1)} MB`;
export function collectionTracks(jobs){return jobs.flatMap(job=>job.entries.filter(e=>e.status==='complete').map(e=>({id:`${job.id}/${e.id}`,collectionId:job.id,surahId:e.id,surahName:e.name,surahArabic:e.arabic,reciterId:job.reciter.id,reciterName:job.reciter.name,audioUrl:e.url,sizeBytes:e.sizeBytes,quality:job.quality,editionName:job.edition.name})));}
export function useCollections(){
  const [jobs,setJobs]=useState([]),[error,setError]=useState('');
  useEffect(()=>{const api=window.quranlyDesktop?.collections;if(!api)return;let mounted=true;const unsubscribe=api.subscribe(value=>{if(mounted)setJobs(value);});api.list().then(value=>{if(mounted)setJobs(value);}).catch(e=>{if(mounted)setError(e.message);});return()=>{mounted=false;unsubscribe();};},[]);
  return{jobs,error};
}
export default function CollectionDownload({reciter,surahs,initialEdition=0,onClose}){
  const [editionIndex,setEditionIndex]=useState(initialEdition),[quality,setQuality]=useState('original'),[estimate,setEstimate]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[added,setAdded]=useState(false);
  const editions=useMemo(()=>reciter.moshaf?.length?reciter.moshaf:[{name:'Standard',server:reciter.server}],[reciter]);
  const spec=useMemo(()=>{const edition=editions[editionIndex]||editions[0];const available=edition.surah_list?new Set(edition.surah_list.split(',').map(Number)):null;return{reciter:{id:reciter.id,name:reciter.name},edition:{name:edition.name||'Standard',server:edition.server||reciter.server},quality,surahs:surahs.filter(s=>!available||available.has(s.id))};},[reciter,editions,editionIndex,quality,surahs]);
  const api=window.quranlyDesktop?.collections;
  const change=setter=>event=>{setter(event.target.value);setEstimate(null);setError('');setAdded(false);};
  async function check(){setBusy(true);setError('');try{setEstimate(await api.estimate(spec));}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function start(){setBusy(true);setError('');try{await api.start(spec);setAdded(true);}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <section className="collection-panel glass-panel" aria-label={`Download ${reciter.name} collection`}>
    <div className="collection-heading"><div><h2>Download collection</h2><p>{reciter.name} · {spec.surahs.length} available surahs</p></div>{onClose&&<button onClick={onClose} aria-label="Close collection download">Close</button>}</div>
    {!api?<p>Collection downloads are available in the Windows app. Individual surah downloads remain available here.</p>:<>
      <div className="collection-fields">
        <label>Recording<select aria-label="Collection recording" value={editionIndex} disabled={busy} onChange={change(setEditionIndex)}>{editions.map((edition,index)=><option value={index} key={index}>{edition.name||'Standard'}</option>)}</select></label>
        <label>Audio quality<select aria-label="Collection audio quality" value={quality} disabled={busy} onChange={change(setQuality)}><option value="original">Original recording</option><option value="128">128 kbps MP3</option><option value="64">64 kbps MP3 · smaller files</option></select></label>
      </div>
      <p className="collection-help">{quality==='original'?'Keep the source audio unchanged.':'Audio is converted locally after downloading the original. A higher bitrate cannot improve the original recording.'} Downloads continue while you browse Quranly. Closing the app saves the queue for you to resume.</p>
      {estimate&&<div className="collection-estimate" role="status"><p>{estimate.approximate?'Estimated download':'Source download'}: <strong>{formatDownloadBytes(estimate.sourceBytes)}</strong> · Free storage: <strong>{formatDownloadBytes(estimate.freeBytes)}</strong></p><p>Allow {formatDownloadBytes(estimate.reserveBytes)} of free space{quality!=='original'?' for audio and temporary conversion files':''}. {estimate.approximate?'Some file sizes could not be checked. ':''}Final converted size depends on the recording.</p>{estimate.freeBytes<estimate.reserveBytes&&<p className="collection-error">Free more storage before downloading this collection.</p>}</div>}
      {error&&<p className="collection-error" role="alert">{error}</p>}
      {added?<p role="status">Collection added. Open Downloads to pause, resume, or listen offline.</p>:<div className="collection-buttons"><button onClick={check} disabled={busy||!spec.surahs.length}>{busy?'Working…':'Check storage'}</button><button className="collection-primary" onClick={start} disabled={busy||!estimate||estimate.freeBytes<estimate.reserveBytes}>Download {spec.surahs.length} surahs</button></div>}
    </>}
  </section>;
}
