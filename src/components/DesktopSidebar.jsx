import {version} from '../../package.json';
import { usePlayerActions } from '../context/PlayerContext';
import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Headphones, Users, BookOpen, Search, ListMusic, Radio, Heart, BookMarked, Target, ChartNoAxesColumn, Download, Sparkles, Settings, WifiOff } from 'lucide-react';

const groups = [
  ['Discover', [['/app', Headphones, 'Listen'], ['/reciters', Users, 'Reciters'], ['/search', Search, 'Search'], ['/radio', Radio, 'Live radio']]],
  ['Your practice', [['/mushaf', BookOpen, 'Read Quran'], ['/memorize', Target, 'Memorize'], ['/hadith', BookMarked, 'Hadith'], ['/azkar', Heart, 'Daily azkar'], ['/ask-ai', Sparkles, 'Ask AI']]],
  ['Your library', [['/playlists', ListMusic, 'Playlists'], ['/downloads', Download, 'Downloads'], ['/insights', ChartNoAxesColumn, 'Progress']]],
];
export default function DesktopSidebar() {
  const [online, setOnline] = useState(navigator.onLine);
  const navigate = useNavigate();
  const { closePlayer } = usePlayerActions();
  useEffect(() => {
    const status = () => setOnline(navigator.onLine);
    const key = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); navigate('/search'); }
    };
    window.addEventListener('online', status); window.addEventListener('offline', status); window.addEventListener('keydown', key);
    return () => { window.removeEventListener('online', status); window.removeEventListener('offline', status); window.removeEventListener('keydown', key); };
  }, [navigate]);
  return <aside className="desktop-sidebar" aria-label="Main navigation" onClick={event => { if (event.target.closest('a')) closePlayer(); }}>
    <NavLink to="/app" className="desktop-brand"><img src={`${import.meta.env.BASE_URL}logo.png`} alt="" /><span>Quranly<small>{version}</small></span></NavLink>
    <div className="desktop-nav-scroll">{groups.map(([title, items]) => <section key={title}>
      <p className="desktop-nav-heading">{title}</p>
      {items.map(([to, Icon, label]) => <NavLink key={to} to={to} className={({isActive}) => `desktop-nav-link${isActive ? ' active' : ''}`}><Icon size={18} aria-hidden="true"/><span>{label}</span>{to === '/search' && <kbd>Ctrl K</kbd>}</NavLink>)}
    </section>)}</div>
    <div className="desktop-sidebar-footer">{!online && <p role="status"><WifiOff size={14}/> Offline · downloads available</p>}<NavLink to="/settings" className="desktop-nav-link"><Settings size={18}/>Settings</NavLink></div>
  </aside>;
}
