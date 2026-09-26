import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import MediaPreviewer from './components/MediaPreviewer';
import DownloadCountdown from './components/DownloadCountdown';
import FeatureGrid from './components/FeatureGrid';
import RecentHistory from './components/RecentHistory';
import HowToSection from './components/HowToSection';
import LegalModal from './components/LegalModal';
import Footer from './components/Footer';

import { fetchInstagramMedia } from './services/instagramParser';
import { downloadMediaFile, getDownloadHistory, addToDownloadHistory, clearDownloadHistory } from './services/downloadService';

export default function App() {
  const [activeMedia, setActiveMedia] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [downloadTask, setDownloadTask] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'history', 'legal'
  const [legalDocKey, setLegalDocKey] = useState('privacy');

  const [downloadHistory, setDownloadHistory] = useState(getDownloadHistory());
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

  return (
    <div className="app-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Navigation */}
      <Navbar
        onOpenLegal={(docKey) => {
          setLegalDocKey(docKey);
          setActiveModal('legal');
        }}
        onOpenHistory={() => setActiveModal('history')}
        historyCount={downloadHistory.length}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {/* Hero Section */}
        <HeroSection
          onFetchMedia={handleFetchMedia}
          isLoading={isLoading}
          error={error}
        />

        {/* Media Preview Card */}
        {activeMedia && (
          <div ref={mediaPreviewRef} style={{ scrollMarginTop: '80px' }}>
            <MediaPreviewer
              media={activeMedia}
              onStartDownload={handleStartDownload}
            />
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
      />

      {/* Modals */}
      {downloadTask && (
        <DownloadCountdown
          downloadTask={downloadTask}
          onClose={() => setDownloadTask(null)}
          onConfirmDownload={handleConfirmDownload}
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
