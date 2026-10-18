import { useState } from 'react';
import { cloudConfigured, cloudProvider } from '../services/cloud';
import { useUserData } from '../context/PlayerContext';
import { progressSnapshot } from '../utils/accountProgress';
export default function DesktopTools() {
  const userData = useUserData();
  const sync=userData.cloudBackupStatus || {state:'guest'};
  const syncText={guest:'Sign in to back up automatically.',loading:'Restoring your account…',pending:'Changes saved on this device. Backup queued…',saving:'Backing up to Supabase…',saved:'All changes backed up to Supabase.',offline:'Saved on this device. Backup will retry when connected.'}[sync.state];
  const [message, setMessage] = useState('');
  const backup = async () => {
    try {
      const data = progressSnapshot(userData);
      const preferences = {themeMode:userData.themeMode,appTheme:userData.appTheme,playerNatureTheme:userData.playerNatureTheme};
      const text = JSON.stringify({ app: 'Quranly', version: 2, createdAt: new Date().toISOString(), data, preferences }, null, 2);
      if (window.quranlyDesktop) {
        if (await window.quranlyDesktop.exportBackup(text)) setMessage('Your backup has been saved.');
      } else {
        const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        const link = document.createElement('a'); link.href = url; link.download = 'Quranly-backup.json'; link.click(); URL.revokeObjectURL(url);
        setMessage('Your backup has been downloaded.');
      }
    } catch { setMessage('Could not save the backup. Please try again.'); }
  };
  return <section className="desktop-tools glass-panel" aria-label="Data and backup">
    <strong>Your data</strong><p>{cloudConfigured ? `Cloud provider: ${cloudProvider}. Sign in to sync your progress.` : 'Your progress is saved on this device. Cloud sync is not connected yet.'}</p>
    <div className="cloud-backup-status" role="status" data-sync-state={sync.state}><span className={`backup-indicator ${sync.state}`} aria-hidden="true"/><span>{syncText}{sync.lastSaved && <small>Last backup {new Date(sync.lastSaved).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small>}</span></div>
    <button onClick={backup}>Export progress backup</button>
    <p role="status">{message || 'Backups include your preferences, bookmarks and playlists. Downloaded audio and API keys are excluded.'}</p>
  </section>;
}
