import React from 'react';
import { Zap, History, Shield } from 'lucide-react';

export default function Navbar({ onOpenLegal, onOpenHistory, historyCount = 0 }) {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <a href="#" className="brand-logo">
          <div className="brand-icon">
            <Zap size={20} fill="white" />
          </div>
          <span className="brand-name">Insta<span className="gradient-text">Fetch</span></span>
        </a>

        <div className="navbar-actions">
          <button 
            onClick={onOpenHistory} 
            className="nav-action-btn btn-secondary" 
            title="View download history"
          >
            <History size={16} />
            <span className="action-btn-text">History</span>
            {historyCount > 0 && (
              <span className="history-badge">
                {historyCount}
              </span>
            )}
          </button>

          <button 
            onClick={() => onOpenLegal('privacy')} 
            className="nav-action-btn nav-link-text" 
            title="Privacy & Terms"
          >
            <Shield size={15} />
            <span className="action-btn-text">Legal</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
