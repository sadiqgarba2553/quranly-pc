import { useState, useEffect } from 'react';
import { DownloadCloud, Trash2, Play, HardDrive, AlertCircle } from 'lucide-react';
import { getDownloadedTracks, getTotalStorageUsed } from '../services/offlineCache';
import { usePlayerActions } from '../context/PlayerContext';
import './Downloads.css';

// Helper to format bytes to MB
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
};

const Downloads = () => {
  const [tracks, setTracks] = useState([]);
  const [storageUsed, setStorageUsed] = useState(0);
  const { setTrack, removeTrack, openPlayer } = usePlayerActions();

  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = () => {
    setTracks(getDownloadedTracks());
    setStorageUsed(getTotalStorageUsed());
  };

  const handleDelete = async (surahId, reciterId) => {
    if (window.confirm('Are you sure you want to delete this track?')) {
      await removeTrack(surahId, reciterId);
      loadTracks();
    }
  };

  const handlePlay = (track) => {
    const surah = { id: track.surahId, nameEnglish: track.surahName, nameArabic: track.surahArabic };
    const reciter = { id: track.reciterId, name: track.reciterName, offlineAudioUrl: track.audioUrl, offlineSurahId: track.surahId };
    setTrack(surah, reciter, [surah], 0, 0);
    openPlayer();
  };

  return (
    <div className="downloads-page">
      <div className="downloads-header">
        <h1><DownloadCloud size={28} color="currentColor" /> Downloads</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Manage your offline audio files.</p>
      </div>

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
                <span className="download-subtitle">{track.reciterName} • {formatBytes(track.sizeBytes)}</span>
              </div>
              <div className="download-actions">
                <button className="download-play-btn" aria-label={`Play ${track.surahName}`} onClick={() => handlePlay(track)}>
                  <Play size={16} fill="currentColor" />
                </button>
                <button className="download-delete-btn" aria-label={`Delete ${track.surahName}`} onClick={() => handleDelete(track.surahId, track.reciterId)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Downloads;
