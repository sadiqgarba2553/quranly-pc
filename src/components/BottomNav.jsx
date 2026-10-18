import { NavLink } from 'react-router-dom';
import { memo } from 'react';
import { Home, Users, BookOpen, LayoutGrid, Settings } from 'lucide-react';
import { usePlayerActions } from '../context/PlayerContext';
import { prefetchRoute } from '../App';
import './BottomNav.css';

const BottomNav = memo(() => {
  const { openReciterProfile } = usePlayerActions();

  const navItems = [
    { path: '/app', icon: Home, label: 'Player' },
    { path: '/reciters', icon: Users, label: 'Reciters' },
    { path: '/mushaf', icon: BookOpen, label: 'Mushaf' },
    { path: '/playlists', icon: LayoutGrid, label: 'Playlists' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="bottom-nav glass-panel">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onMouseEnter={() => prefetchRoute(item.path)}
            onClick={() => {
              if (item.path === '/reciters') {
                openReciterProfile(null);
              }
            }}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} strokeWidth={2.2} />
            <span className="nav-label">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
});

BottomNav.displayName = 'BottomNav';

export default BottomNav;
