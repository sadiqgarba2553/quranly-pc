import { useState, useEffect } from 'react';
import { DownloadCloud, Trash2, Play, HardDrive, AlertCircle } from 'lucide-react';
import { getDownloadedTracks } from '../services/offlineCache';
import { usePlayerActions, useData, useUserData } from '../context/PlayerContext';
import CollectionDownload, {useCollections,collectionTracks,formatDownloadBytes} from '../components/CollectionDownload';
import './Downloads.css';

// Helper to format bytes to MB
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
};

const Downloads = () => {
  const [cachedTracks, setCachedTracks] = useState(getDownloadedTracks);
  const {jobs,error:queueError}=useCollections();
  const {reciters=[],surahs=[]}=useData();
  const {downloadedTracks}=useUserData();
  const [selectedReciter,setSelectedReciter]=useState('');
  const [actionError,setActionError]=useState('');
  const reciter=reciters.find(r=>String(r.id)===selectedReciter);
  const tracks=[...cachedTracks,...collectionTracks(jobs)];
  const storageUsed=tracks.reduce((sum,track)=>sum+(track.sizeBytes||0),0);
  const { setTrack, removeTrack, openPlayer } = usePlayerActions();

  useEffect(() => {
    setCachedTracks(getDownloadedTracks());
  }, [downloadedTracks]);

  const loadTracks = () => {
    setCachedTracks(getDownloadedTracks());
  };
  const queueAction=async(action,id)=>{setActionError('');try{await window.quranlyDesktop.collections[action](id);}catch(e){setActionError(e.message);}};

  const handleDelete = async (surahId, reciterId) => {
    if (window.confirm('Are you sure you want to delete this track?')) {
      await removeTrack(surahId, reciterId);
      loadTracks();
    }
  };

  const handlePlay = (track) => {
    const surah = { id: track.surahId, nameEnglish: track.surahName, nameArabic: track.surahArabic };
    const reciter = { id: track.reciterId, name: track.reciterName, offlineAudioUrl: track.collectionId?`quranly-audio://cache/${track.collectionId}/${track.surahId}`:track.audioUrl, offlineSurahId: track.surahId };
    setTrack(surah, reciter, [surah], 0, 0);
    openPlayer();
  };

  return (
    <div className="downloads-page">
      <div className="downloads-header">
        <h1><DownloadCloud size={28} color="currentColor" /> Downloads</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Manage your offline audio files.</p>
      </div>

      {window.quranlyDesktop?.collections&&<section className="collection-add" aria-label="Add offline collection">
        <label htmlFor="download-reciter">Download a reciter collection</label>
        <select id="download-reciter" className="collection-reciter-select" value={selectedReciter} onChange={event=>setSelectedReciter(event.target.value)}><option value="">Choose a reciter…</option>{reciters.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>
        {reciter&&<CollectionDownload key={reciter.id} reciter={reciter} surahs={surahs}/>}
      </section>}
      {(actionError||queueError)&&<p className="collection-error" role="alert">{actionError||queueError}</p>}
      {jobs.length>0&&<section aria-label="Collection download queue">
        <h2>Collections</h2>
        {jobs.map(job=>{const complete=job.entries.filter(e=>e.status==='complete').length;const running=['downloading','converting','queued'].includes(job.status);const progress=(complete+(job.status==='downloading'&&job.totalBytes?job.receivedBytes/job.totalBytes:0))/job.entries.length*100;return <article key={job.id} className="collection-queue" aria-label={`${job.reciter.name} collection`}>
          <div className="collection-queue-header"><div><h3>{job.reciter.name}</h3><p>{job.edition.name} · {job.quality==='original'?'Original':`${job.quality} kbps`} · {complete}/{job.entries.length} surahs saved</p></div><span>{job.status}</span></div>
          <progress value={Math.min(100,progress)} max="100" aria-label={`${job.reciter.name} collection progress`}/>
          <p className={job.status==='failed'?'collection-error':''} role="status">{job.message}{job.status==='downloading'&&job.totalBytes?` · ${formatDownloadBytes(job.receivedBytes||0)} / ${formatDownloadBytes(job.totalBytes)}`:''}</p>
          <div className="collection-buttons">{running?<button onClick={()=>queueAction('pause',job.id)}>Pause collection</button>:job.status!=='completed'&&<button onClick={()=>queueAction('resume',job.id)}>Resume collection</button>}<button onClick={()=>{if(window.confirm('Remove this collection and its downloaded audio? Other downloads and your progress will be kept.'))queueAction('remove',job.id);}}>Remove collection</button></div>
        </article>;})}
      </section>}

      <div className="storage-info">
        <div className="storage-info-left">
          <span className="storage-label">Total Storage Used</span>
          <span className="storage-value">{formatBytes(storageUsed)}</span>
        </div>
        <HardDrive size={24} color="currentColor" />
      </div>

      {tracks.length === 0 ? (
        <div className="downloads-empty">
          <AlertCircle size={48} color="currentColor" />
          <p>You haven't downloaded any tracks yet.<br/>Tap the download icon while playing a Surah to save it for offline listening.</p>
        </div>
      ) : (
        <div className="downloads-list">
          {tracks.map((track) => (
            <div key={track.id} className="download-item">
              <div className="download-icon">
                <DownloadCloud size={20} />
              </div>
              <div className="download-details">
                <span className="download-title">{track.surahName}</span>
                <span className="download-subtitle">{track.reciterName} • {formatBytes(track.sizeBytes)}{track.collectionId?` · ${track.quality==='original'?'Original':`${track.quality} kbps`}`:''}</span>
              </div>
              <div className="download-actions">
                <button className="download-play-btn" aria-label={`Play ${track.surahName}`} onClick={() => handlePlay(track)}>
                  <Play size={16} fill="currentColor" />
                </button>
                {!track.collectionId&&<button className="download-delete-btn" aria-label={`Delete ${track.surahName}`} onClick={() => handleDelete(track.surahId, track.reciterId)}>
                  <Trash2 size={16} />
                </button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Downloads;
