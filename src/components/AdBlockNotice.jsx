import React from 'react';
import { ShieldAlert, RefreshCw, X } from 'lucide-react';

export default function AdBlockNotice({ onClose }) {
  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(185, 28, 28, 0.25))', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '14px', padding: '1rem 1.25rem', maxWidth: '860px', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', color: '#fca5a5' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <ShieldAlert size={24} style={{ flexShrink: 0 }} />
        <div>
          <strong style={{ color: 'white', display: 'block', fontSize: '0.95rem' }}>AdBlocker Detected</strong>
          <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
            InstaFetch Pro is 100% free thanks to our non-intrusive ads. Please consider disabling your AdBlocker to support our server hosting!
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          onClick={() => window.location.reload()}
          className="btn-secondary"
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', background: 'rgba(255, 255, 255, 0.1)' }}
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: '0.2rem' }}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
