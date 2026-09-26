import React from 'react';
import { History, Trash2, ExternalLink, X } from 'lucide-react';

export default function RecentHistory({ historyItems, onClear, onClose, onReFetch }) {
  return (
    <div className="modal-overlay">
      <div className="glass-card modal-content" style={{ padding: '2rem' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <History size={20} color="#e1306c" />
            <h3 style={{ fontSize: '1.2rem' }}>Your Download History</h3>
          </div>
          <button onClick={onClose} className="close-modal-btn">
            <X size={18} />
          </button>
        </div>

        {historyItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
            <p>No recent downloads found in browser storage.</p>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button
                onClick={onClear}
                className="btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
              >
                <Trash2 size={14} />
                <span>Clear History</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {historyItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border-glass)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <img
                      src={item.preview}
                      alt={item.title}
                      style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                    />
                    <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '280px' }}>
                      <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.title}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        @{item.author} • {item.downloadedAt}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      onReFetch(item.sourceUrl);
                    }}
                    className="btn-secondary"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    <ExternalLink size={14} />
                    <span>Re-fetch</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
