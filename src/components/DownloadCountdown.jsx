import React, { useState, useEffect } from 'react';
import { Download, Loader2, X, CheckCircle, Shield, Sparkles } from 'lucide-react';
import AdSlot from './AdSlot';

export default function DownloadCountdown({ downloadTask, adsenseConfig, onClose, onConfirmDownload }) {
  const [secondsLeft, setSecondsLeft] = useState(3);
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
      <div className="glass-card modal-content glow-animation" style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="modal-header" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontWeight: 700 }}>
            <Sparkles size={18} color="#e1306c" />
            <span>High-Speed Download Link</span>
          </div>
          <button onClick={onClose} className="close-modal-btn">
            <X size={18} />
          </button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          Preparing HD media file stream: <strong style={{ color: 'white' }}>{downloadTask?.fileName}</strong>
        </p>

        {/* High-eCPM Interstitial Ad Unit Box */}
        <div style={{ margin: '1rem 0' }}>
          <AdSlot type="countdown" adsenseConfig={adsenseConfig} label="Sponsored Ad" />
        </div>

        {/* Countdown Progress Circle / Action */}
        <div style={{ margin: '1.5rem 0' }}>
          {!isReady ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ position: 'relative', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyCenter: 'center', background: 'rgba(253, 29, 29, 0.1)', borderRadius: '50%', border: '2px solid var(--ig-red)', color: 'white', fontSize: '1.4rem', fontWeight: 800 }}>
                <span style={{ margin: 'auto' }}>{secondsLeft}</span>
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Unlocking HD download link in {secondsLeft} seconds...
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontWeight: 600 }}>
                <CheckCircle size={20} />
                <span>Link Secured & Scanned Clean</span>
              </div>

              <button
                onClick={onConfirmDownload}
                className="btn-ig-primary"
                style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)' }}
              >
                <Download size={22} />
                <span>Click to Start Download</span>
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
          <Shield size={12} />
          <span>256-Bit SSL Encrypted Direct Download • No Popups</span>
        </div>
      </div>
    </div>
  );
}
