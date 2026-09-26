import React, { useState, useRef } from 'react';
import { Link2, Clipboard, X, ArrowRight, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { QUICK_TEST_URLS } from '../data/sampleData';

const INSTAGRAM_URL_PATTERN = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|reels|tv|stories)\/([A-Za-z0-9_-]+)/i;

export default function HeroSection({ onFetchMedia, isLoading, error }) {
  const [url, setUrl] = useState('');
  const autoFetchTimer = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim()) {
      onFetchMedia(url.trim());
    }
  };

  // Auto-fetch when a valid Instagram URL is pasted into the input
  const handlePaste = (e) => {
    const pasted = e.clipboardData?.getData('text') || '';
    const trimmed = pasted.trim();
    if (trimmed && INSTAGRAM_URL_PATTERN.test(trimmed)) {
      // Allow React to update state first, then fire fetch
      clearTimeout(autoFetchTimer.current);
      autoFetchTimer.current = setTimeout(() => {
        onFetchMedia(trimmed.split('?')[0]);
      }, 100);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        onFetchMedia(text.trim());
      }
    } catch (err) {
      console.warn('Clipboard read permission denied:', err);
    }
  };

  const handleClearUrl = () => {
    setUrl('');
  };

  const handleSelectChip = (chipUrl) => {
    setUrl(chipUrl);
    onFetchMedia(chipUrl);
  };

  return (
    <section className="hero-section">
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(225, 48, 108, 0.12)', border: '1px solid rgba(225, 48, 108, 0.3)', padding: '0.35rem 1rem', borderRadius: '99px', color: '#e1306c', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.25rem' }}>
        <Sparkles size={16} /> 1080p Ultra HD • Reels • Photos • MP3 Audio • Carousels
      </div>

      <h1 className="hero-title">
        Download Instagram <span className="gradient-text">Videos, Reels, & Photos</span> Online
      </h1>
      
      <p className="hero-subtitle">
        The fastest, easiest, and free way to save high-quality Instagram content directly to your device.
      </p>

      <form onSubmit={handleSubmit} className="downloader-box">
        <div className="input-group">
          <div className="input-field-wrapper">
            <Link2 className="input-icon" size={20} />
            <input
              type="url"
              className="url-input"
              placeholder="Paste Instagram link (Reel, Photo, Audio)..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onPaste={handlePaste}
              required
            />

            {url && (
              <button
                type="button"
                className="quick-clear-btn"
                onClick={handleClearUrl}
                title="Clear URL"
                aria-label="Clear URL"
              >
                <X size={16} />
              </button>
            )}

            <button
              type="button"
              className="quick-paste-btn"
              onClick={handlePasteClipboard}
              title="Paste from clipboard"
              aria-label="Paste from clipboard"
            >
              <Clipboard size={15} />
              <span className="btn-label-text">Paste</span>
            </button>
          </div>

          <button
            type="submit"
            className="btn-ig-primary fetch-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Fetching...</span>
              </>
            ) : (
              <>
                <span>Fetch Media</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </form>

      {/* Quick Test Chip Selector */}
      <div className="quick-test-bar">
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Try Sample URLs:</span>
        {QUICK_TEST_URLS.map((chip, idx) => (
          <button
            key={idx}
            className="test-chip"
            onClick={() => handleSelectChip(chip.url)}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </section>
  );
}
