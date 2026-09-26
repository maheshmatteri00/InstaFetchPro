import React from 'react';
import { Zap, Settings, History, HelpCircle, ShieldCheck } from 'lucide-react';

export default function Navbar({ onOpenAdSettings, onOpenLegal, onOpenHistory, historyCount = 0 }) {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <a href="#" className="brand-logo">
          <div className="brand-icon">
            <Zap size={22} fill="white" />
          </div>
          <span>Insta<span className="gradient-text">Fetch Pro</span></span>
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <ul className="nav-links">
            <li>
              <button 
                onClick={onOpenHistory} 
                className="nav-link btn-secondary" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              >
                <History size={16} />
                <span>History</span>
                {historyCount > 0 && (
                  <span style={{ 
                    background: '#e1306c', 
                    color: 'white', 
                    borderRadius: '50%', 
                    padding: '2px 6px', 
                    fontSize: '0.7rem' 
                  }}>
                    {historyCount}
                  </span>
                )}
              </button>
            </li>

            <li>
              <button 
                onClick={() => onOpenLegal('privacy')} 
                className="nav-link" 
                style={{ background: 'none', border: 'none', font: 'inherit' }}
              >
                AdSense Legal
              </button>
            </li>
          </ul>

          <div className="badge-live-ads" title="AdSense Integration Active">
            <ShieldCheck size={14} />
            <span>AdSense Ready</span>
          </div>

          <button 
            onClick={onOpenAdSettings}
            className="btn-secondary"
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
            title="Configure Google AdSense Publisher ID"
          >
            <Settings size={16} />
            <span style={{ display: 'none', smDisplay: 'inline' }}>AdSense Settings</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
