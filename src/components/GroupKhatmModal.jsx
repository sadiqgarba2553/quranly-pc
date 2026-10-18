import React, { useState } from 'react';
import { X, Users, CheckCircle, BookOpen, Plus, Sparkles, Trash2, Award } from 'lucide-react';
import { useUserData, usePlayerActions } from '../context/PlayerContext';
import { useNavigate } from 'react-router-dom';
import './GroupKhatmModal.css';

export default function GroupKhatmModal({ isOpen, onClose }) {
  const { groupKhatms } = useUserData();
  const { createGroupKhatm, claimKhatmJuz, deleteGroupKhatm } = usePlayerActions();
  const navigate = useNavigate();

  const [activeKhatmId, setActiveKhatmId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [claimNameInput, setClaimNameInput] = useState('');
  const [selectedJuzForClaim, setSelectedJuzForClaim] = useState(null);

  if (!isOpen) return null;

  const currentKhatm = groupKhatms.find(k => k.id === activeKhatmId) || groupKhatms[0];

  const handleCreateKhatm = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    createGroupKhatm({
      title: newTitle.trim(),
      type: 'group',
    });

    setNewTitle('');
    setShowCreateForm(false);
  };

  const handleClaimJuzSubmit = (status = 'claimed') => {
    if (!selectedJuzForClaim || !currentKhatm) return;
    claimKhatmJuz({
      khatmId: currentKhatm.id,
      juzNumber: selectedJuzForClaim,
      claimedBy: claimNameInput.trim() || 'Me',
      status,
    });
    setSelectedJuzForClaim(null);
    setClaimNameInput('');
  };

  const calculateProgress = (khatm) => {
    if (!khatm || !khatm.claimedJuz) return 0;
    const completedCount = Object.values(khatm.claimedJuz).filter(j => j.status === 'completed').length;
    return Math.round((completedCount / 30) * 100);
  };

  const handleReadJuz = (juzNumber) => {
    onClose();
    // Navigate to Mushaf page
    navigate(`/mushaf?juz=${juzNumber}`);
  };

  return (
    <div className="khatm-modal-overlay" onClick={onClose}>
      <div className="khatm-modal-card glass-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="khatm-modal-header">
          <div className="khatm-modal-title">
            <div className="khatm-icon-badge">
              <Users size={20} color="currentColor" />
            </div>
            <div>
              <h3>Khatm & reading plans</h3>
              <p>Plan the 30 Juz and track completion. These reading plans sync privately to your account.</p>
            </div>
          </div>
          <button className="khatm-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Khatm Selector Tabs & Create Button */}
        <div className="khatm-tabs-row">
          <div className="khatm-tabs-scroll">
            {groupKhatms.map(khatm => {
              const progress = calculateProgress(khatm);
              const isSelected = currentKhatm?.id === khatm.id;
              return (
                <button
                  key={khatm.id}
                  className={`khatm-tab-pill ${isSelected ? 'active' : ''}`}
                  onClick={() => { setActiveKhatmId(khatm.id); setShowCreateForm(false); }}
                >
                  <span>{khatm.title}</span>
                  <span className="khatm-pill-progress">{progress}%</span>
                </button>
              );
            })}
          </div>

          <button
            className="khatm-new-btn"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <Plus size={16} />
            <span>New Khatm</span>
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <form className="khatm-create-card glass-panel" onSubmit={handleCreateKhatm}>
            <h4>Create New Group Khatm</h4>
            <input
              type="text"
              placeholder="e.g. Ramadan 1447 Family Khatm or Weekly Circle"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              required
            />
            <div className="khatm-create-actions">
              <button type="button" className="khatm-btn-sec" onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
              <button type="submit" className="khatm-btn-pri">
                Create Project
              </button>
            </div>
          </form>
        )}

        {/* Active Khatm Dashboard */}
        {groupKhatms.length === 0 && !showCreateForm && (
          <div className="khatm-empty-state">
            <Users size={32} color="var(--accent-color)" />
            <h4>No Group Khatm yet</h4>
            <p>Create a shared reading plan and track Juz progress with family. Syncs when you sign in.</p>
            <button type="button" className="khatm-btn-pri" onClick={() => setShowCreateForm(true)}>
              Create your first Khatm
            </button>
          </div>
        )}

        {currentKhatm && !showCreateForm && (
          <div className="khatm-dashboard">
            {/* Overview Banner */}
            <div className="khatm-overview-card glass-panel">
              <div className="khatm-overview-left">
                <div className="khatm-name-row">
                  <h4>{currentKhatm.title}</h4>
                  <button
                    className="khatm-del-icon"
                    onClick={() => deleteGroupKhatm(currentKhatm.id)}
                    title="Delete Khatm"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p>30 Juz collective completion challenge</p>
              </div>

              <div className="khatm-progress-ring-wrap">
                <svg className="khatm-progress-ring" viewBox="0 0 64 64">
                  <circle className="khatm-ring-bg" cx="32" cy="32" r="28" />
                  <circle
                    className="khatm-ring-fill"
                    cx="32" cy="32" r="28"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - calculateProgress(currentKhatm) / 100)}`}
                  />
                </svg>
                <div className="khatm-ring-text">
                  <span className="progress-num">{calculateProgress(currentKhatm)}%</span>
                  <span className="progress-lbl">Done</span>
                </div>
              </div>
            </div>

            {/* Juz 1 to 30 Grid */}
            <div className="khatm-juz-grid-container">
              <div className="khatm-grid-header">
                <span>Select a Juz (1 - 30) to claim or mark completed:</span>
              </div>

              <div className="khatm-juz-grid">
                {Array.from({ length: 30 }, (_, i) => i + 1).map(juzNum => {
                  const claimInfo = currentKhatm.claimedJuz?.[juzNum];
                  const isCompleted = claimInfo?.status === 'completed';
                  const isClaimed = claimInfo?.status === 'claimed';

                  return (
                    <div
                      key={juzNum}
                      className={`khatm-juz-box ${isCompleted ? 'completed' : isClaimed ? 'claimed' : 'unclaimed'}`}
                      onClick={() => setSelectedJuzForClaim(juzNum)}
                    >
                      <span className="juz-num">Juz {juzNum}</span>
                      {isCompleted && <CheckCircle size={14} className="status-icon" color="currentColor" />}
                      {isClaimed && <Users size={14} className="status-icon" color="currentColor" />}
                      <span className="juz-claimer">
                        {isCompleted ? claimInfo.claimedBy : isClaimed ? claimInfo.claimedBy : 'Available'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Claim Modal Popover */}
        {selectedJuzForClaim && currentKhatm && (
          <div className="khatm-claim-popover glass-panel">
            <div className="claim-pop-header">
              <h5>Juz {selectedJuzForClaim} Status</h5>
              <button onClick={() => setSelectedJuzForClaim(null)}><X size={16} /></button>
            </div>

            <input
              type="text"
              placeholder="Your Name (e.g. Garba / Mom / Brother)"
              value={claimNameInput}
              onChange={e => setClaimNameInput(e.target.value)}
            />

            <div className="claim-pop-btns">
              <button className="btn-read" onClick={() => handleReadJuz(selectedJuzForClaim)}>
                <BookOpen size={14} />
                <span>Read Juz {selectedJuzForClaim}</span>
              </button>
              <button className="btn-claim" onClick={() => handleClaimJuzSubmit('claimed')}>
                Claim Juz
              </button>
              <button className="btn-complete" onClick={() => handleClaimJuzSubmit('completed')}>
                Mark Completed
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
