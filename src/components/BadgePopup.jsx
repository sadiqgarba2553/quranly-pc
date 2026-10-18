import { useEffect, useState } from 'react';
import { Trophy, Award, Sparkles, X } from 'lucide-react';
import './BadgePopup.css';

const ICON_MAP = {
  Sparkles, Trophy, Medal: Award
};

const BadgePopup = ({ badge, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (badge) {
      setTimeout(() => setVisible(true), 100);
      const timer = setTimeout(() => {
        handleClose();
      }, 5000); // Auto-hide after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [badge]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 400); // Wait for transition
  };

  if (!badge) return null;

  const IconComp = ICON_MAP[badge.icon] || Sparkles;

  return (
    <div className={`badge-popup-container ${visible ? 'show' : ''}`}>
      <div className="badge-popup">
        <button className="badge-close-btn" onClick={handleClose}>
          <X size={16} color="var(--text-secondary)" />
        </button>
        <div className="badge-popup-icon-wrapper" style={{ borderColor: badge.color, boxShadow: `0 0 20px ${badge.color}40` }}>
          <IconComp size={28} color={badge.color} />
        </div>
        <div className="badge-popup-text">
          <span className="badge-unlocked-title">Achievement Unlocked!</span>
          <span className="badge-title">{badge.title}</span>
          <span className="badge-xp">+{badge.xp} XP</span>
        </div>
      </div>
    </div>
  );
};

export default BadgePopup;
