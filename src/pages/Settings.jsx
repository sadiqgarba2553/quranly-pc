import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Diamond, Tag, Handshake, Gift, Lightbulb, ChevronRight, Globe, Radio, BookOpen, X, Send, Sun, Moon, Monitor, CheckCircle, Check, User, CloudCheck,
  Sparkles, Waves, CloudRain, Palette, Lock, Zap, Shield, Droplets
} from 'lucide-react';
import { useData, useUserData, usePlayerActions } from '../context/PlayerContext';
import { submitAppFeedback, auth } from '../services/cloud';
import './Settings.css';
import DesktopTools from '../components/DesktopTools';

const LANGUAGES = [
  { code: 'eng', label: 'English', native: 'English', flag: 'EN' },
  { code: 'ar', label: 'Arabic', native: 'العربية', flag: 'AR' },
];

function CollaborateModal({ onClose }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) return;
    try {
      await submitAppFeedback({
        type: 'collaborate',
        uid: auth.currentUser?.uid || null,
        email: email.trim(),
        payload: {
          name: name.trim().slice(0, 80),
          email: email.trim().slice(0,254),
          message: message.trim().slice(0, 2000),
        },
      });
      setSent('Your message was saved to Supabase.');
      return;
    } catch {
      // fallback local
      try {
        const key = 'quranly_collaborate_requests';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        const list = Array.isArray(existing) ? existing : [];
        list.push({ name: name.trim(), email: email.trim(), message: message.trim(), createdAt: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(list));
      } catch { /* ignore */ }
    }
    setSent(true);
    setTimeout(onClose, 1800);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="suggest-modal" onClick={(e) => e.stopPropagation()}>
        <div className="suggest-header">
          <h3>Collaborate with Us</h3>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        {sent ? (
          <div className="suggest-sent">
            <span><CheckCircle size={24} color="currentColor" /></span>
            <p>{typeof sent === 'string' ? sent : 'Your interest was saved on this device.'}</p>
          </div>
        ) : (
          <>
            <input
              className="suggest-textarea"
              style={{ minHeight: 44, marginBottom: 10, resize: 'none' }}
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="suggest-textarea"
              style={{ minHeight: 44, marginBottom: 10, resize: 'none' }}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <textarea
              className="suggest-textarea"
              placeholder="How would you like to collaborate (design, content, engineering, outreach)…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
            <button
              className="suggest-send-btn"
              onClick={handleSend}
              disabled={!name.trim() || !email.trim() || !message.trim()}
            >
              <Send size={16} /> Submit Interest
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SuggestModal({ onClose }) {
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!text.trim()) return;
    try {
      await submitAppFeedback({
        type: 'feature_suggestion',
        uid: auth.currentUser?.uid || null,
        payload: { text: text.trim().slice(0, 2000) },
      });
      setSent('Your suggestion was saved to Supabase.');
      return;
    } catch {
      try {
        const key = 'quranly_feature_suggestions';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        const list = Array.isArray(existing) ? existing : [];
        list.push({ text: text.trim(), createdAt: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(list));
      } catch { /* ignore */ }
    }
    setSent(true);
    setTimeout(onClose, 1800);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="suggest-modal" onClick={(e) => e.stopPropagation()}>
        <div className="suggest-header">
          <h3>Suggest a Feature</h3>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        {sent ? (
          <div className="suggest-sent">
            <span><CheckCircle size={24} color="currentColor" /></span>
            <p>{typeof sent === 'string' ? sent : 'Your suggestion was saved on this device.'}</p>
          </div>
        ) : (
          <>
            <textarea
              className="suggest-textarea"
              placeholder="Describe the feature you'd like to see…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
            />
            <button className="suggest-send-btn" onClick={handleSend} disabled={!text.trim()}>
              <Send size={16} /> Send
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const Settings = () => {
  const { apiLanguage, radios = [], tafasir = [], riwayat = [], apiLoading } = useData();
  const {
    themeMode = 'dark', appTheme = 'white', playerNatureTheme = 'darkveil', currentUser,
  } = useUserData();
  const {
    setApiLanguage, setThemeMode, setAppTheme, setPlayerNatureTheme, openAuthModal,
  } = usePlayerActions();
  const [modal, setModal] = useState(null); // 'collaborate' | 'suggest'
  const navigate = useNavigate();

  const handleShare = async () => {
    const text = 'Check out Quranly — the best Quran listening app!';
    if (navigator.share) {
      await navigator.share({ title: 'Quranly', text }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
      alert('Link copied to clipboard!');
    }
  };

  const safeRadios = Array.isArray(radios) ? radios : [];
  const safeTafasir = Array.isArray(tafasir) ? tafasir : [];
  const safeRiwayat = Array.isArray(riwayat) ? riwayat : [];

  return (
    <div className="settings-page">
      <h1>Settings</h1>
      <DesktopTools />

      <div className="settings-section">
        <p className="section-subtitle">Supabase Account &amp; Cloud Sync</p>
        <div className="settings-group glass-panel">
          <button className="settings-item" onClick={openAuthModal}>
            <div className="settings-item-left">
              <User size={20} color={currentUser ? 'var(--text-primary)' : 'var(--text-primary)'} />
              <div className="item-text">
                <span className="item-title">
                  {currentUser ? (currentUser.displayName || currentUser.email) : 'Sign In / Register Account'}
                </span>
                <span className="item-desc">
                  {currentUser ? 'Signed in with Supabase' : 'Save favorites, playlists & listening progress'}
                </span>
              </div>
            </div>
            <ChevronRight size={18} color="currentColor" />
          </button>
        </div>
      </div>

      <div className="free-app-note"><CheckCircle size={18} /><div><strong>Every feature is free</strong><p>Read, listen, download and explore. No plans or subscriptions.</p></div></div>

      <div className="settings-section">
        <p className="section-subtitle">App Features</p>
        <div className="settings-group glass-panel">
          <button className="settings-item" onClick={() => navigate('/downloads')}>
            <div className="settings-item-left">
              <CloudCheck size={20} color="currentColor" />
              <div className="item-text">
                <span className="item-title">Downloads Manager</span>
                <span className="item-desc">View and delete offline audio files</span>
              </div>
            </div>
            <ChevronRight size={18} color="currentColor" />
          </button>
          <div className="settings-divider"></div>
          <button className="settings-item" onClick={() => navigate('/ask-ai')}>
            <div className="settings-item-left">
              <Sparkles size={20} color="currentColor" />
              <div className="item-text">
                <span className="item-title">Ask AI Settings</span>
                <span className="item-desc">Configure your Gemini API Key</span>
              </div>
            </div>
            <ChevronRight size={18} color="currentColor" />
          </button>
        </div>
      </div>

      {/* Appearance: light / dark / system */}
      <div className="settings-section">
        <p className="section-subtitle">
          <Monitor size={14} style={{ display: 'inline', marginRight: 4 }} />
          Appearance
        </p>
        <div className="settings-group glass-panel theme-selector-group nature-theme-group">
          <button
            className={`theme-option-btn ${themeMode === 'light' ? 'active' : ''}`}
            onClick={() => setThemeMode && setThemeMode('light')}
          >
            <Sun size={18} />
            <span>Light</span>
          </button>
          <button
            className={`theme-option-btn ${themeMode === 'dark' ? 'active' : ''}`}
            onClick={() => setThemeMode && setThemeMode('dark')}
          >
            <Moon size={18} />
            <span>Dark</span>
          </button>
          <button
            className={`theme-option-btn ${themeMode === 'system' ? 'active' : ''}`}
            onClick={() => setThemeMode && setThemeMode('system')}
          >
            <Monitor size={18} />
            <span>System</span>
          </button>
        </div>
      </div>

      <div className="settings-section">
        <p className="section-subtitle"><Palette size={14} style={{ display: 'inline', marginRight: 4 }} />App Accent Theme</p>
        <div className="settings-group glass-panel theme-selector-group accent-theme-group">
          {[
            {id:'white',name:'Mono',color:'#000000'}, {id:'indigo',name:'Indigo',color:'#6366f1'},
            {id:'amethyst',name:'Amethyst',color:'#a855f7'}, {id:'ocean',name:'Ocean',color:'#0ea5e9'},
            {id:'emerald',name:'Emerald',color:'#10b981'}, {id:'sunset',name:'Sunset',color:'#f97316'},
          ].map(theme => <button key={theme.id} className={`theme-option-btn accent-swatch-btn ${appTheme === theme.id ? 'active' : ''}`} aria-pressed={appTheme === theme.id} onClick={() => setAppTheme(theme.id)}>
            <div className="accent-swatch" style={{background:theme.color}}>{appTheme === theme.id && <Check size={14} color={theme.id === 'white' ? '#fff' : '#fff'} />}</div><span>{theme.name}</span>
          </button>)}
        </div>
      </div>
      <div className="settings-section">
        <p className="section-subtitle"><Sparkles size={14} style={{ display: 'inline', marginRight: 4 }} />Player Background</p>
        <div className="settings-group glass-panel theme-selector-group nature-theme-group">
          {[
            {id:'darkveil',name:'Dark Veil',icon:Shield}, {id:'liquidether',name:'Liquid Ether',icon:Droplets},
            {id:'prism',name:'Prism',icon:Diamond}, {id:'acid',name:'Acid Squares',icon:Zap}, {id:'none',name:'Off',icon:Moon},
          ].map(theme => { const Icon=theme.icon; return <button key={theme.id} className={`theme-option-btn ${playerNatureTheme === theme.id ? 'active' : ''}`} aria-pressed={playerNatureTheme === theme.id} onClick={() => setPlayerNatureTheme(theme.id)}><Icon size={18}/><span>{theme.name}</span></button>; })}
        </div>
      </div>

      <div className="settings-section">
        <p className="section-subtitle">
          <Globe size={14} style={{ display: 'inline', marginRight: 4 }} />
          API Language
        </p>
        <div className="settings-group glass-panel">
          {LANGUAGES.map((lang, idx) => (
            <div key={lang.code}>
              {idx > 0 && <div className="settings-divider"></div>}
              <button
                className={`settings-item ${apiLanguage === lang.code ? 'active-lang' : ''}`}
                onClick={() => setApiLanguage && setApiLanguage(lang.code)}
                disabled={apiLoading}
              >
                <div className="settings-item-left">
                  <span className="lang-flag">{lang.flag}</span>
                  <div className="item-text">
                    <span className="item-title">{lang.label}</span>
                    <span className="item-desc">{lang.native}</span>
                  </div>
                </div>
                {apiLanguage === lang.code && <span className="lang-checkmark"><Check size={16} /></span>}
              </button>
            </div>
          ))}
          {apiLoading && (
            <>
              <div className="settings-divider"></div>
              <div className="settings-item" style={{ justifyContent: 'center', opacity: 0.6 }}>
                <span style={{ fontSize: '0.8rem' }}>Fetching data…</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="settings-section">
        <p className="section-subtitle">MP3Quran API v3</p>
        <div className="settings-group glass-panel">
          <div className="settings-item non-interactive">
            <div className="settings-item-left">
              <Radio size={20} />
              <div className="item-text">
                <span className="item-title">Radio Stations</span>
                <span className="item-desc">{safeRadios.length} available</span>
              </div>
            </div>
          </div>
          <div className="settings-divider"></div>
          <div className="settings-item non-interactive">
            <div className="settings-item-left">
              <BookOpen size={20} />
              <div className="item-text">
                <span className="item-title">Tafsir Books</span>
                <span className="item-desc">{safeTafasir.length} available</span>
              </div>
            </div>
          </div>
          <div className="settings-divider"></div>
          <div className="settings-item non-interactive">
            <div className="settings-item-left">
              <BookOpen size={20} />
              <div className="item-text">
                <span className="item-title">Riwayat (Readings)</span>
                <span className="item-desc">{safeRiwayat.length} available</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <p className="section-subtitle">Community &amp; Support</p>
        <div className="settings-group glass-panel">
          <button className="settings-item" onClick={() => setModal('collaborate')}>
            <div className="settings-item-left">
              <Handshake size={20} />
              <div className="item-text">
                <span className="item-title">Collaborate</span>
                <span className="item-desc">Work with us to improve Quranly</span>
              </div>
            </div>
            <ChevronRight size={18} color="currentColor" />
          </button>
          <div className="settings-divider"></div>
          <button className="settings-item" onClick={handleShare}>
            <div className="settings-item-left">
              <Gift size={20} />
              <div className="item-text">
                <span className="item-title">Share App</span>
                <span className="item-desc">Share Quranly with friends &amp; family</span>
              </div>
            </div>
            <ChevronRight size={18} color="currentColor" />
          </button>
          <div className="settings-divider"></div>
          <button className="settings-item" onClick={() => setModal('suggest')}>
            <div className="settings-item-left">
              <Lightbulb size={20} />
              <div className="item-text">
                <span className="item-title">Suggest a Feature</span>
                <span className="item-desc">Tell us what you'd like to see next</span>
              </div>
            </div>
            <ChevronRight size={18} color="currentColor" />
          </button>
        </div>
      </div>

      <div className="settings-footer">
        <p>Quranly v0.1.0 Alpha • Powered by Blue Cloud AI (bluecloudai.online)</p>
      </div>

      {modal === 'collaborate' && <CollaborateModal onClose={() => setModal(null)} />}
      {modal === 'suggest' && <SuggestModal onClose={() => setModal(null)} />}
    </div>
  );
};

export default Settings;
