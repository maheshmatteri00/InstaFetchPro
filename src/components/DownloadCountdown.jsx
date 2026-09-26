import React, { useState, useEffect } from 'react';
import { Download, X, CheckCircle, Shield, Sparkles, Zap } from 'lucide-react';

export default function DownloadCountdown({ downloadTask, onClose, onConfirmDownload }) {
  const [secondsLeft, setSecondsLeft] = useState(2);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (secondsLeft > 0) {
      const timer = setTimeout(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setIsReady(true);
    }
  }, [secondsLeft]);

  return (
    <div className="modal-overlay">
      <div className="glass-card modal-content countdown-modal glow-animation">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontWeight: 700 }}>
            <Sparkles size={18} color="#e1306c" />
            <span>High-Speed Download</span>
          </div>
          <button onClick={onClose} className="close-modal-btn" aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <p className="countdown-filename">
          File: <strong>{downloadTask?.fileName}</strong>
        </p>

        {/* Security & Verification Card */}
        <div className="security-notice-card">
          <div className="security-item">
            <Zap size={16} color="#fcb045" />
            <span>Direct CDN stream ready</span>
          </div>
          <div className="security-item">
            <Shield size={16} color="#10b981" />
            <span>Verified 1080p Ultra HD Quality</span>
          </div>
        </div>

        {/* Countdown Progress Circle / Action */}
        <div style={{ margin: '1.25rem 0' }}>
          {!isReady ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
              <div className="countdown-timer-circle">
                <span>{secondsLeft}</span>
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Preparing direct download link...
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontWeight: 600, fontSize: '0.9rem' }}>
                <CheckCircle size={18} />
                <span>Link Verified & Ready</span>
              </div>

              <button
                onClick={onConfirmDownload}
                className="btn-ig-primary download-now-btn"
              >
                <Download size={20} />
                <span>Click to Save File</span>
              </button>
            </div>
          )}
        </div>

        <div className="countdown-footer-note">
          <Shield size={13} />
          <span>Clean Direct Download • No Ads/Redirects</span>
        </div>
      </div>
    </div>
  );
}
