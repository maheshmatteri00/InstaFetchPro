import React from 'react';
import { Zap, Heart, Shield } from 'lucide-react';

export default function Footer({ onOpenLegal, onOpenAdSettings }) {
  return (
    <footer>
      <div className="footer-container">
        <div>
          <a href="#" className="brand-logo" style={{ marginBottom: '0.75rem', display: 'inline-flex' }}>
            <div className="brand-icon" style={{ width: '32px', height: '32px' }}>
              <Zap size={18} fill="white" />
            </div>
            <span style={{ fontSize: '1.2rem' }}>Insta<span className="gradient-text">Fetch Pro</span></span>
          </a>
          <div className="footer-disclaimer">
            <p style={{ marginBottom: '0.5rem' }}>InstaFetch Pro is an independent web application. We are not affiliated with, authorized, maintained, sponsored, or endorsed by Meta Platforms, Inc. or Instagram.</p>
            <p style={{ marginBottom: '0.5rem' }}><strong>Non-Hosting Declaration:</strong> We do not host, store, archive, or cache any videos, images, or copyrighted content on our servers. All media is fetched directly from the original platform's public CDNs.</p>
            <p><strong>Fair Use:</strong> Media downloaded is strictly for personal, non-commercial offline viewing.</p>
          </div>
        </div>

        <div>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.85rem', fontSize: '0.95rem' }}>
            AdSense Legal & Compliance
          </h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <li>
              <button onClick={() => onOpenLegal('privacy')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                Privacy Policy
              </button>
            </li>
            <li>
              <button onClick={() => onOpenLegal('terms')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                Terms of Service
              </button>
            </li>
            <li>
              <button onClick={() => onOpenLegal('dmca')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                DMCA & Copyright Disclaimer
              </button>
            </li>
            <li>
              <button onClick={onOpenAdSettings} style={{ background: 'none', border: 'none', color: '#fcb045', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <Shield size={12} /> Configure Publisher ID
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-glass)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        <p>© 2026 InstaFetch Pro. All rights reserved. Google AdSense Ready Downloader Engine.</p>
      </div>
    </footer>
  );
}
