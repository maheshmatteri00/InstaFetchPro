import React, { useState } from 'react';
import { X, DollarSign, Save, Sparkles, CheckCircle2, HelpCircle } from 'lucide-react';

export default function AdSenseConfigModal({ config, onSave, onClose }) {
  const [formData, setFormData] = useState({ ...config });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-overlay">
      <div className="glass-card modal-content" style={{ padding: '2rem' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: 'rgba(252, 176, 69, 0.15)', color: '#fcb045', padding: '0.4rem', borderRadius: '10px' }}>
              <DollarSign size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem' }}>Google AdSense Monetization Setup</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Configure Publisher ID & eCPM Ad Units</p>
            </div>
          </div>
          <button onClick={onClose} className="close-modal-btn">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Mode Toggle */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', cursor: 'pointer' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem' }}>Enable AdSense Monetization</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Render ad containers across website pages</span>
              </div>
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#fd1d1d' }}
              />
            </label>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', cursor: 'pointer' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem' }}>Interactive Demo Mode</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {formData.isDemoMode ? 'Showing visual preview ad boxes with estimated eCPM earnings' : 'Active Live Google AdSense Code Mode'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.isDemoMode}
                onChange={(e) => setFormData({ ...formData, isDemoMode: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#38bdf8' }}
              />
            </label>
          </div>

          {/* Publisher ID Input */}
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
              AdSense Publisher Client ID (ca-pub-XXXXXXXXXXXXXXXX):
            </label>
            <input
              type="text"
              className="select-quality"
              placeholder="e.g. ca-pub-9840291048201948"
              value={formData.publisherId}
              onChange={(e) => setFormData({ ...formData, publisherId: e.target.value })}
              required
            />
          </div>

          {/* Slot IDs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                Header Banner Slot ID (728x90)
              </label>
              <input
                type="text"
                className="select-quality"
                style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}
                value={formData.slots.headerLeaderboard}
                onChange={(e) => setFormData({
                  ...formData,
                  slots: { ...formData.slots, headerLeaderboard: e.target.value }
                })}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                Pre-Download Slot ID (336x280)
              </label>
              <input
                type="text"
                className="select-quality"
                style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}
                value={formData.slots.preDownloadBox}
                onChange={(e) => setFormData({
                  ...formData,
                  slots: { ...formData.slots, preDownloadBox: e.target.value }
                })}
              />
            </div>
          </div>

          <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '0.85rem', borderRadius: '10px', fontSize: '0.8rem', color: '#7dd3fc', display: 'flex', gap: '0.5rem' }}>
            <HelpCircle size={18} style={{ flexShrink: 0 }} />
            <span>
              Tip for Google AdSense Approval: Ensure you keep the included Privacy Policy, DMCA Disclaimer, and Terms pages accessible in the footer. Google requires these legal pages before approving sites.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="submit"
              className="btn-ig-primary"
              style={{ flex: 1 }}
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 size={18} />
                  <span>Settings Saved!</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
