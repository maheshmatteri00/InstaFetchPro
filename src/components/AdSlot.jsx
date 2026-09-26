import React, { useEffect, useRef } from 'react';
import { DollarSign, Sparkles } from 'lucide-react';

export default function AdSlot({ type = 'leaderboard', adsenseConfig, label = 'Advertisement' }) {
  const adRef = useRef(null);

  const slotDimensions = {
    leaderboard: { width: '728px', height: '90px', title: 'Header Leaderboard (728x90)', slotId: adsenseConfig?.slots?.headerLeaderboard },
    box: { width: '300px', height: '250px', title: 'In-Feed Banner (300x250)', slotId: adsenseConfig?.slots?.inFeedNative },
    countdown: { width: '336px', height: '280px', title: 'High-Yield Interstitial Ad (336x280)', slotId: adsenseConfig?.slots?.preDownloadBox },
    sticky: { width: '320px', height: '50px', title: 'Mobile Sticky Anchor (320x50)', slotId: adsenseConfig?.slots?.stickyFooter }
  };

  const currentSlot = slotDimensions[type] || slotDimensions.leaderboard;

  useEffect(() => {
    // Attempt AdSense push if live script is active & not demo mode
    if (adsenseConfig?.enabled && !adsenseConfig?.isDemoMode && window.adsbygoogle) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error('AdSense push error:', e);
      }
    }
  }, [adsenseConfig]);

  if (!adsenseConfig?.enabled) return null;

  return (
    <div className="ad-container" style={{ maxWidth: type === 'sticky' ? '100%' : '100%' }}>
      {adsenseConfig.isDemoMode ? (
        <div 
          className="ad-demo-box"
          style={{ 
            minHeight: currentSlot.height,
            maxWidth: currentSlot.width,
            margin: '0 auto' 
          }}
        >
          <span className="ad-label">{label}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fcb045', fontWeight: 600 }}>
            <Sparkles size={16} />
            <span>{currentSlot.title}</span>
          </div>
          <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.25rem' }}>
            Google AdSense Ad Unit • Slot ID: {currentSlot.slotId || '1234567890'}
          </p>
          <div className="ad-ecpm-tag">
            <DollarSign size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> Estimated eCPM: $4.50 - $12.00 / 1k views
          </div>
        </div>
      ) : (
        <div style={{ minHeight: currentSlot.height, display: 'flex', justifyContent: 'center' }}>
          <ins
            ref={adRef}
            className="adsbygoogle"
            style={{ display: 'block', width: currentSlot.width, height: currentSlot.height }}
            data-ad-client={adsenseConfig.publisherId}
            data-ad-slot={currentSlot.slotId}
            data-ad-format={type === 'leaderboard' ? 'auto' : 'rectangle'}
            data-full-width-responsive="true"
          />
        </div>
      )}
    </div>
  );
}
