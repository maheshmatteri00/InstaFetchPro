import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import MediaPreviewer from './components/MediaPreviewer';
import DownloadCountdown from './components/DownloadCountdown';
import AdSlot from './components/AdSlot';
import AdBlockNotice from './components/AdBlockNotice';
import AdSenseConfigModal from './components/AdSenseConfigModal';
import FeatureGrid from './components/FeatureGrid';
import RecentHistory from './components/RecentHistory';
import HowToSection from './components/HowToSection';
import LegalModal from './components/LegalModal';
import Footer from './components/Footer';

import { fetchInstagramMedia } from './services/instagramParser';
import { getStoredAdSenseConfig, saveAdSenseConfig, injectAdSenseScript, detectAdBlocker } from './services/adsenseManager';
import { downloadMediaFile, getDownloadHistory, addToDownloadHistory, clearDownloadHistory } from './services/downloadService';

export default function App() {
  const [adsenseConfig, setAdsenseConfig] = useState(getStoredAdSenseConfig());
  const [activeMedia, setActiveMedia] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [downloadTask, setDownloadTask] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'adsense', 'history', 'legal'
  const [legalDocKey, setLegalDocKey] = useState('privacy');

  const [downloadHistory, setDownloadHistory] = useState(getDownloadHistory());
  const [isAdBlockDetected, setIsAdBlockDetected] = useState(false);
  const [showStickyAd, setShowStickyAd] = useState(true);

  const mediaPreviewRef = useRef(null);

  // Auto-scroll to media preview card whenever new media is fetched
  useEffect(() => {
    if (activeMedia) {
      const timer = setTimeout(() => {
        if (mediaPreviewRef.current) {
          mediaPreviewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeMedia]);

  // Initialize AdSense scripts and AdBlock detector on mount
  useEffect(() => {
    if (adsenseConfig.enabled && !adsenseConfig.isDemoMode) {
      injectAdSenseScript(adsenseConfig.publisherId);
    }
    detectAdBlocker().then((blocked) => setIsAdBlockDetected(blocked));
  }, [adsenseConfig]);

  const handleFetchMedia = async (url) => {
    setIsLoading(true);
    setError(null);
    try {
      const media = await fetchInstagramMedia(url);
      setActiveMedia(media);
    } catch (err) {
      setError(err.message || 'Failed to extract media from the provided Instagram URL.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartDownload = (task) => {
    setDownloadTask(task);
  };

  const handleConfirmDownload = async () => {
    if (!downloadTask) return;
    
    // Save to local download history
    const updatedHistory = addToDownloadHistory(downloadTask.media);
    setDownloadHistory(updatedHistory);

    // Trigger file download
    await downloadMediaFile(downloadTask.downloadInfo.url, downloadTask.fileName);
    setDownloadTask(null);
  };

  const handleSaveAdConfig = (newConfig) => {
    setAdsenseConfig(newConfig);
    saveAdSenseConfig(newConfig);
  };

  return (
    <div className="app-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Navigation */}
      <Navbar
        onOpenAdSettings={() => setActiveModal('adsense')}
        onOpenLegal={(docKey) => {
          setLegalDocKey(docKey);
          setActiveModal('legal');
        }}
        onOpenHistory={() => setActiveModal('history')}
        historyCount={downloadHistory.length}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {/* AdBlocker Warning if active */}
        {isAdBlockDetected && (
          <div style={{ padding: '1rem 1.5rem 0' }}>
            <AdBlockNotice onClose={() => setIsAdBlockDetected(false)} />
          </div>
        )}

        {/* Hero Section */}
        <HeroSection
          onFetchMedia={handleFetchMedia}
          isLoading={isLoading}
          error={error}
        />

        {/* Top Header Leaderboard Ad Slot (728x90) */}
        <div style={{ padding: '0 1rem' }}>
          <AdSlot type="leaderboard" adsenseConfig={adsenseConfig} label="Header Leaderboard Ad" />
        </div>

        {/* Media Preview Card */}
        {activeMedia && (
          <div ref={mediaPreviewRef} style={{ scrollMarginTop: '90px' }}>
            <MediaPreviewer
              media={activeMedia}
              onStartDownload={handleStartDownload}
            />
          </div>
        )}

        {/* In-Feed Banner Ad Slot (300x250) */}
        {activeMedia && (
          <div style={{ padding: '0 1rem' }}>
            <AdSlot type="box" adsenseConfig={adsenseConfig} label="In-Feed Sponsor Ad" />
          </div>
        )}

        {/* Features Overview */}
        <FeatureGrid />

        {/* How to use & FAQ Accordion */}
        <HowToSection />
      </main>

      {/* Footer */}
      <Footer
        onOpenLegal={(docKey) => {
          setLegalDocKey(docKey);
          setActiveModal('legal');
        }}
        onOpenAdSettings={() => setActiveModal('adsense')}
      />

      {/* Sticky Mobile/Desktop Footer Anchor Ad */}
      {adsenseConfig.enabled && showStickyAd && (
        <div className="sticky-ad-banner">
          <AdSlot type="sticky" adsenseConfig={adsenseConfig} label="Sticky Anchor Ad" />
          <button
            className="close-sticky-btn"
            onClick={() => setShowStickyAd(false)}
            title="Close Ad"
          >
            ✕
          </button>
        </div>
      )}

      {/* Modals */}
      {downloadTask && (
        <DownloadCountdown
          downloadTask={downloadTask}
          adsenseConfig={adsenseConfig}
          onClose={() => setDownloadTask(null)}
          onConfirmDownload={handleConfirmDownload}
        />
      )}

      {activeModal === 'adsense' && (
        <AdSenseConfigModal
          config={adsenseConfig}
          onSave={handleSaveAdConfig}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'legal' && (
        <LegalModal
          docKey={legalDocKey}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'history' && (
        <RecentHistory
          historyItems={downloadHistory}
          onClear={() => {
            const cleared = clearDownloadHistory();
            setDownloadHistory(cleared);
          }}
          onReFetch={(url) => {
            handleFetchMedia(url);
          }}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}
