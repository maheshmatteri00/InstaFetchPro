import React, { useState, useCallback } from 'react';
import {
  Download, Music, CheckCircle2, ChevronLeft, ChevronRight,
  Eye, Heart, MessageCircle, CheckSquare, Square, Images, DownloadCloud
} from 'lucide-react';
import { downloadMediaFile } from '../services/downloadService';

export default function MediaPreviewer({ media, onStartDownload }) {
  const [selectedQuality, setSelectedQuality] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);
  const [selectedItems, setSelectedItems] = useState(() =>
    media?.type === 'carousel' ? new Set(media.items.map((_, i) => i)) : new Set()
  );
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingSelected, setDownloadingSelected] = useState(false);

  if (!media) return null;

  const isReel = media.type === 'reel';
  const isCarousel = media.type === 'carousel';

  const currentDownloadItem = isReel
    ? media.resolutions[selectedQuality]
    : isCarousel
    ? { label: `Slide ${activeSlide + 1} High-Res (JPG)`, url: media.items[activeSlide].url }
    : media.resolutions?.[selectedQuality];

  const handleDownloadClick = () => {
    onStartDownload({
      media,
      downloadInfo: currentDownloadItem,
      fileName: isReel
        ? `InstaFetch_Reel_${media.author.username}_${currentDownloadItem.quality || '1080p'}.${currentDownloadItem.isAudio ? 'mp3' : 'mp4'}`
        : `InstaFetch_Photo_${media.author.username}_hd.jpg`
    });
  };

  const toggleItem = (idx) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === media.items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(media.items.map((_, i) => i)));
    }
  };

  const handleDownloadSelected = async () => {
    if (!selectedItems.size) return;
    setDownloadingSelected(true);
    const toDownload = [...selectedItems].sort();
    for (const idx of toDownload) {
      const item = media.items[idx];
      await downloadMediaFile(item.url, `InstaFetch_Carousel_${media.author.username}_slide${idx + 1}.jpg`);
      await new Promise(r => setTimeout(r, 400));
    }
    setDownloadingSelected(false);
  };

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    for (let i = 0; i < media.items.length; i++) {
      const item = media.items[i];
      await downloadMediaFile(item.url, `InstaFetch_Carousel_${media.author.username}_slide${i + 1}.jpg`);
      await new Promise(r => setTimeout(r, 400));
    }
    setDownloadingAll(false);
  };

  return (
    <div className="glass-card preview-container glow-animation">
      <div className="preview-grid">
        {/* Media Player / Viewer Stage */}
        <div className="media-stage">
          {isReel ? (
            <video
              src={media.videoUrl}
              poster={media.posterUrl}
              controls
              autoPlay
              muted
              loop
              className="video-player"
            />
          ) : isCarousel ? (
            <div style={{ position: 'relative' }}>
              <img
                src={media.items[activeSlide].url}
                alt={media.items[activeSlide].caption}
                className="image-preview"
                style={{ cursor: 'pointer' }}
                onClick={() => toggleItem(activeSlide)}
              />

              {/* Selection badge on active slide */}
              <div
                style={{
                  position: 'absolute', top: '10px', left: '10px',
                  background: selectedItems.has(activeSlide) ? '#e1306c' : 'rgba(0,0,0,0.6)',
                  border: '2px solid white',
                  borderRadius: '50%', width: '28px', height: '28px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'background 0.2s'
                }}
                onClick={() => toggleItem(activeSlide)}
              >
                {selectedItems.has(activeSlide)
                  ? <CheckSquare size={16} color="white" />
                  : <Square size={16} color="white" />}
              </div>

              {/* Slide counter */}
              <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem' }}>
                {activeSlide + 1} / {media.items.length}
              </div>

              {media.items.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveSlide(prev => prev > 0 ? prev - 1 : media.items.length - 1)}
                    style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', borderRadius: '50%', padding: '0.4rem', cursor: 'pointer' }}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setActiveSlide(prev => prev < media.items.length - 1 ? prev + 1 : 0)}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', borderRadius: '50%', padding: '0.4rem', cursor: 'pointer' }}
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>
          ) : (
            <img
              src={media.imageUrl}
              alt={media.title}
              className="image-preview"
            />
          )}
        </div>

        {/* Media Details & Download Configuration */}
        <div>
          {/* Author Header */}
          <div className="author-bar">
            {media.author.avatar ? (
              <img
                src={media.author.avatar}
                alt={media.author.name}
                className="author-avatar"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="author-avatar"
              style={{
                display: media.author.avatar ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #e1306c, #fd1d1d)',
                color: 'white',
                fontWeight: 700,
                fontSize: '1.1rem',
                flexShrink: 0
              }}
            >
              {(media.author.username || media.author.name || '?')[0].toUpperCase()}
            </div>
            <div className="author-info">
              <h4>
                {media.author.name}
                {media.author.verified && <CheckCircle2 size={16} color="#38bdf8" />}
              </h4>
              <p>@{media.author.username}</p>
            </div>
          </div>

          <h3 style={{
            fontSize: '1rem',
            marginBottom: '0.75rem',
            lineHeight: '1.45',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word',
            color: 'var(--text-primary)'
          }}>
            {media.title}
          </h3>

          {/* Social Metrics Bar */}
          <div style={{ display: 'flex', gap: '1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Heart size={15} color="#e1306c" /> {media.metrics.likes}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <MessageCircle size={15} /> {media.metrics.comments}
            </span>
            {media.metrics.views && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Eye size={15} /> {media.metrics.views}
              </span>
            )}
            {isCarousel && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#e1306c', fontWeight: 600 }}>
                <Images size={15} /> {media.items.length} slides
              </span>
            )}
          </div>

          {/* ═══════════════════════════════════════════════
              CAROUSEL DOWNLOAD PANEL
          ═══════════════════════════════════════════════ */}
          {isCarousel && (
            <div className="download-options-box">
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Select slides to download:
                </span>
                <button
                  onClick={toggleSelectAll}
                  style={{
                    background: 'none', border: '1px solid rgba(225,48,108,0.4)',
                    borderRadius: '8px', color: '#e1306c', fontSize: '0.78rem',
                    padding: '0.25rem 0.7rem', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', gap: '0.35rem', fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                >
                  {selectedItems.size === media.items.length
                    ? <><CheckSquare size={13} /> Deselect All</>
                    : <><CheckSquare size={13} /> Select All</>}
                </button>
              </div>

              {/* Thumbnail Grid with checkboxes */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
                gap: '0.5rem',
                maxHeight: '220px',
                overflowY: 'auto',
                marginBottom: '1rem',
                paddingRight: '2px'
              }}>
                {media.items.map((item, idx) => {
                  const isSelected = selectedItems.has(idx);
                  const isActive = activeSlide === idx;
                  return (
                    <div
                      key={item.id || idx}
                      onClick={() => { setActiveSlide(idx); toggleItem(idx); }}
                      style={{
                        position: 'relative',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: isActive
                          ? '2px solid #e1306c'
                          : isSelected
                          ? '2px solid rgba(225,48,108,0.5)'
                          : '2px solid transparent',
                        transition: 'all 0.18s',
                        aspectRatio: '1',
                        background: 'rgba(255,255,255,0.05)'
                      }}
                    >
                      <img
                        src={item.url}
                        alt={item.caption}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        loading="lazy"
                      />
                      {/* Overlay */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: isSelected ? 'rgba(225,48,108,0.25)' : 'rgba(0,0,0,0.15)',
                        transition: 'background 0.18s'
                      }} />
                      {/* Checkbox */}
                      <div style={{
                        position: 'absolute', top: '4px', right: '4px',
                        background: isSelected ? '#e1306c' : 'rgba(0,0,0,0.55)',
                        borderRadius: '4px', padding: '1px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {isSelected
                          ? <CheckSquare size={12} color="white" />
                          : <Square size={12} color="white" />}
                      </div>
                      {/* Slide number */}
                      <div style={{
                        position: 'absolute', bottom: '3px', left: '4px',
                        background: 'rgba(0,0,0,0.65)', borderRadius: '4px',
                        fontSize: '0.6rem', color: 'white', padding: '1px 4px', fontWeight: 700
                      }}>
                        {idx + 1}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Download buttons */}
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  onClick={handleDownloadSelected}
                  disabled={!selectedItems.size || downloadingSelected || downloadingAll}
                  className="btn-ig-primary"
                  style={{
                    flex: 1, padding: '0.85rem 0.5rem', fontSize: '0.85rem',
                    opacity: (!selectedItems.size || downloadingSelected || downloadingAll) ? 0.5 : 1
                  }}
                >
                  <Download size={16} />
                  <span>
                    {downloadingSelected
                      ? 'Downloading...'
                      : `Download Selected (${selectedItems.size})`}
                  </span>
                </button>

                <button
                  onClick={handleDownloadAll}
                  disabled={downloadingAll || downloadingSelected}
                  style={{
                    flex: 1, padding: '0.85rem 0.5rem', fontSize: '0.85rem',
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '12px', color: 'white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '0.4rem', fontWeight: 600, transition: 'all 0.2s',
                    opacity: (downloadingAll || downloadingSelected) ? 0.5 : 1
                  }}
                >
                  <DownloadCloud size={16} />
                  <span>{downloadingAll ? 'Downloading...' : `Download All (${media.items.length})`}</span>
                </button>
              </div>

              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
                Click thumbnails or main image to toggle selection
              </p>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              REEL / PHOTO DOWNLOAD PANEL
          ═══════════════════════════════════════════════ */}
          {!isCarousel && (
            <div className="download-options-box">
              {isReel && media.resolutions && (
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>
                    Select Resolution / Output Format:
                  </label>
                  <select
                    className="select-quality"
                    value={selectedQuality}
                    onChange={(e) => setSelectedQuality(Number(e.target.value))}
                  >
                    {media.resolutions.map((res, index) => (
                      <option key={index} value={index}>
                        {res.label} ({res.size})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {media.audioTrack && (
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Music size={14} color="#fcb045" />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Audio: {media.audioTrack}
                  </span>
                </div>
              )}

              <button
                onClick={handleDownloadClick}
                className="btn-ig-primary"
                style={{ width: '100%', marginTop: '0.5rem', padding: '1rem' }}
              >
                <Download size={20} />
                <span>Download {isReel && media.resolutions[selectedQuality]?.isAudio ? 'MP3 Audio' : 'Media File'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
