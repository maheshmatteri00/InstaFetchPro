import React from 'react';
import { X, ShieldCheck, FileText, Copyright } from 'lucide-react';
import { LEGAL_DOCS } from '../data/seoContent';

export default function LegalModal({ docKey = 'privacy', onClose }) {
  const doc = LEGAL_DOCS[docKey] || LEGAL_DOCS.privacy;

  const icons = {
    privacy: <ShieldCheck size={22} color="#38bdf8" />,
    terms: <FileText size={22} color="#fcb045" />,
    dmca: <Copyright size={22} color="#e1306c" />
  };

  return (
    <div className="modal-overlay">
      <div className="glass-card modal-content" style={{ padding: '2.5rem', maxWidth: '720px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {icons[docKey]}
            <div>
              <h3 style={{ fontSize: '1.3rem' }}>{doc.title}</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Effective Date: {doc.lastUpdated}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="close-modal-btn">
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.95rem',
            lineHeight: '1.7',
            maxHeight: '60vh',
            overflowY: 'auto',
            paddingRight: '0.5rem'
          }}
          dangerouslySetInnerHTML={{ __html: doc.content }}
        />
      </div>
    </div>
  );
}
