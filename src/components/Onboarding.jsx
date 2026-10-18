import { useState } from 'react';
import { ChevronRight, BookOpen, Target, Palette, Check } from 'lucide-react';
import { useData, usePlayerActions } from '../context/PlayerContext';
import ReciterAvatar from './ReciterAvatar';
import './Onboarding.css';

const DAILY_GOALS = [5, 10, 20, 30, 60];
const FEATURED_RECITERS = [1, 2, 3, 4, 5, 6]; // IDs to show in onboarding

const Onboarding = ({ onComplete }) => {
  const { reciters } = useData();
  const { toggleFavouriteReciter, setDailyGoal, setThemeMode } = usePlayerActions();
  const [step, setStep] = useState(0);
  const [selectedReciters, setSelectedReciters] = useState(new Set());
  const [selectedGoal, setSelectedGoal] = useState(10);
  const [selectedTheme, setSelectedTheme] = useState('system');

  const featuredReciters = reciters
    .filter(r => FEATURED_RECITERS.includes(r.id))
    .slice(0, 6);

  const toggleReciter = (id) => {
    setSelectedReciters(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleFinish = () => {
    // Apply selections
    selectedReciters.forEach(id => toggleFavouriteReciter(id));
    setDailyGoal(selectedGoal);
    setThemeMode(selectedTheme);
    localStorage.setItem('quranly_onboarded', 'true');
    onComplete();
  };

  const steps = [
    {
      id: 'welcome',
      icon: <BookOpen size={40} className="ob-icon" />,
      title: 'Welcome to Quranly',
      subtitle: 'Your companion for Quran recitation, discovery, and daily listening goals.',
      content: null,
    },
    {
      id: 'reciters',
      icon: null,
      title: 'Pick your favourites',
      subtitle: 'Follow reciters whose voice you love. You can always change later.',
      content: (
        <div className="ob-reciters-grid">
          {featuredReciters.map(r => (
            <div
              key={r.id}
              className={`ob-reciter-item ${selectedReciters.has(r.id) ? 'selected' : ''}`}
              onClick={() => toggleReciter(r.id)}
            >
              <div className="ob-reciter-avatar-wrap">
                <ReciterAvatar name={r.name} src={r.avatar} alt={r.name} />
                {selectedReciters.has(r.id) && (
                  <div className="ob-check-badge"><Check size={12} /></div>
                )}
              </div>
              <p>{r.name.split(' ').slice(0, 2).join(' ')}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'goal',
      icon: <Target size={40} className="ob-icon" />,
      title: 'Set your daily goal',
      subtitle: 'How many minutes of Quran do you want to listen to each day?',
      content: (
        <div className="ob-goals-row">
          {DAILY_GOALS.map(min => (
            <button
              key={min}
              className={`ob-goal-pill ${selectedGoal === min ? 'selected' : ''}`}
              onClick={() => setSelectedGoal(min)}
            >
              {min} min
            </button>
          ))}
        </div>
      ),
    },
    {
      id: 'theme',
      icon: <Palette size={40} className="ob-icon" />,
      title: 'Choose your look',
      subtitle: 'You can change this anytime in Settings.',
      content: (
        <div className="ob-theme-options">
          {[
            { id: 'system', label: 'System', desc: 'Follow device setting' },
            { id: 'dark', label: 'Dark', desc: 'Easy on the eyes' },
            { id: 'light', label: 'Light', desc: 'Clean and bright' },
          ].map(t => (
            <button
              key={t.id}
              className={`ob-theme-card ${selectedTheme === t.id ? 'selected' : ''}`}
              onClick={() => setSelectedTheme(t.id)}
            >
              <span className="ob-theme-dot" data-theme-id={t.id} />
              <div>
                <strong>{t.label}</strong>
                <p>{t.desc}</p>
              </div>
              {selectedTheme === t.id && <Check size={16} className="ob-theme-check" />}
            </button>
          ))}
        </div>
      ),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        {/* Progress dots */}
        <div className="ob-dots">
          {steps.map((_, i) => (
            <span key={i} className={`ob-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
          ))}
        </div>

        {/* Icon */}
        {current.icon && <div className="ob-icon-wrap">{current.icon}</div>}

        {/* Text */}
        <h1 className="ob-title">{current.title}</h1>
        <p className="ob-subtitle">{current.subtitle}</p>

        {/* Step content */}
        {current.content && <div className="ob-content">{current.content}</div>}

        {/* Actions */}
        <div className="ob-actions">
          {step > 0 && (
            <button className="ob-back-btn" onClick={() => setStep(s => s - 1)}>
              Back
            </button>
          )}
          <button
            className="ob-next-btn"
            onClick={isLast ? handleFinish : () => setStep(s => s + 1)}
          >
            <span>{isLast ? 'Get Started' : 'Continue'}</span>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Skip */}
        {!isLast && (
          <button className="ob-skip-btn" onClick={handleFinish}>
            Skip setup
          </button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;


