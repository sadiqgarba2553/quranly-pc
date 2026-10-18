import React, { useState, useEffect } from 'react';
import { X, Heart, Tag, Sparkles, BookOpen, Save, Trash2 } from 'lucide-react';
import { useUserData, usePlayerActions } from '../context/PlayerContext';
import './TadabburModal.css';

const DEFAULT_TAGS = ['#patience', '#hope', '#gratitude', '#dua', '#guidance', '#reflection', '#wisdom'];

export default function TadabburModal({ isOpen, onClose, verseInfo }) {
  const { verseReflections } = useUserData();
  const { saveReflection, deleteReflection } = usePlayerActions();
  const [noteText, setNoteText] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (verseInfo) {
      const existing = verseReflections.find(
        r => r.surahId === verseInfo.surahId && r.verseNumber === verseInfo.verseNumber
      );
      if (existing) {
        setNoteText(existing.noteText || '');
        setSelectedTags(existing.tags || []);
      } else {
        setNoteText('');
        setSelectedTags(['#reflection']);
      }
    }
  }, [verseInfo, verseReflections]);

  if (!isOpen || !verseInfo) return null;

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = (e) => {
    if (e.key === 'Enter' && customTagInput.trim()) {
      e.preventDefault();
      let formatted = customTagInput.trim();
      if (!formatted.startsWith('#')) formatted = '#' + formatted;
      if (!selectedTags.includes(formatted)) {
        setSelectedTags([...selectedTags, formatted]);
      }
      setCustomTagInput('');
    }
  };

  const handleSave = () => {
    if (!noteText.trim()) return;

    saveReflection({
      surahId: verseInfo.surahId,
      surahName: verseInfo.surahName || `Surah ${verseInfo.surahId}`,
      verseNumber: verseInfo.verseNumber,
      verseText: verseInfo.verseText,
      translationText: verseInfo.translationText,
      noteText: noteText.trim(),
      tags: selectedTags,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const handleDelete = () => {
    const existing = verseReflections.find(
      r => r.surahId === verseInfo.surahId && r.verseNumber === verseInfo.verseNumber
    );
    if (existing) {
      deleteReflection(existing.id);
    }
    onClose();
  };

  return (
    <div className="tadabbur-modal-overlay" onClick={onClose}>
      <div className="tadabbur-modal-card glass-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="tadabbur-modal-header">
          <div className="tadabbur-modal-title">
            <div className="tadabbur-icon-badge">
              <Heart size={20} color="currentColor" />
            </div>
            <div>
              <h3>Verse Tadabbur & Personal Reflection</h3>
              <p>Surah {verseInfo.surahName || verseInfo.surahId}:{verseInfo.verseNumber}</p>
            </div>
          </div>
          <button className="tadabbur-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Verse Quote Box */}
        <div className="tadabbur-verse-preview glass-panel">
          <p className="tadabbur-arabic-quote arabic-font">{verseInfo.verseText}</p>
          {verseInfo.translationText && (
            <p className="tadabbur-translation-quote">"{verseInfo.translationText}"</p>
          )}
        </div>

        {/* Note Textarea */}
        <div className="tadabbur-input-section">
          <label htmlFor="tadabburNote">Spiritual Note & Personal Insight</label>
          <textarea
            id="tadabburNote"
            className="tadabbur-textarea"
            placeholder="Write your reflections, how this Ayah touches your heart, or what lesson you take today..."
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            rows={4}
          />
        </div>

        {/* Tags Selector */}
        <div className="tadabbur-tags-section">
          <label>Topic Tags</label>
          <div className="tadabbur-tags-grid">
            {DEFAULT_TAGS.map(tag => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={`tadabbur-tag-pill ${isSelected ? 'active' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  <Tag size={12} />
                  <span>{tag}</span>
                </button>
              );
            })}
          </div>

          <input
            type="text"
            className="tadabbur-custom-tag-input"
            placeholder="Add custom tag (Press Enter)..."
            value={customTagInput}
            onChange={e => setCustomTagInput(e.target.value)}
            onKeyDown={handleAddCustomTag}
          />
        </div>

        {/* Action Buttons */}
        <div className="tadabbur-modal-actions">
          {verseReflections.some(r => r.surahId === verseInfo.surahId && r.verseNumber === verseInfo.verseNumber) && (
            <button type="button" className="tadabbur-delete-btn" onClick={handleDelete}>
              <Trash2 size={16} />
              <span>Delete Note</span>
            </button>
          )}

          <div className="tadabbur-right-actions">
            <button type="button" className="tadabbur-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className={`tadabbur-save-btn ${savedSuccess ? 'success' : ''}`}
              onClick={handleSave}
              disabled={!noteText.trim()}
            >
              <Save size={16} />
              <span>{savedSuccess ? 'Saved!' : 'Save Reflection'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
