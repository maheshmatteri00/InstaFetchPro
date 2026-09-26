const ADSENSE_STORAGE_KEY = 'instafetch_adsense_config';

export const DEFAULT_ADSENSE_CONFIG = {
  enabled: true,
  publisherId: 'ca-pub-9840291048201948', // Default placeable publisher ID format
  isDemoMode: true, // Shows visually rich AdSense placeable units when in demo mode
  slots: {
    headerLeaderboard: '1234567890',
    preDownloadBox: '2345678901',
    inFeedNative: '3456789012',
    stickyFooter: '4567890123'
  }
};

export function getStoredAdSenseConfig() {
  try {
    const saved = localStorage.getItem(ADSENSE_STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_ADSENSE_CONFIG;
  } catch (e) {
    return DEFAULT_ADSENSE_CONFIG;
  }
}

export function saveAdSenseConfig(config) {
  try {
    localStorage.setItem(ADSENSE_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save AdSense config', e);
  }
}

/**
 * Dynamically injects Google AdSense script into document head
 */
export function injectAdSenseScript(publisherId) {
  if (!publisherId || publisherId.includes('XXXXXXXXXXXXXXXX')) return;

  const existingScript = document.getElementById('adsense-script');
  if (existingScript) return;

  const script = document.createElement('script');
  script.id = 'adsense-script';
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
}

/**
 * Checks if user has an active AdBlocker enabled
 */
export async function detectAdBlocker() {
  return new Promise((resolve) => {
    const testAd = document.createElement('div');
    testAd.innerHTML = '&nbsp;';
    testAd.className = 'adsbygoogle ad-unit ad-zone google-ad';
    testAd.style.position = 'absolute';
    testAd.style.top = '-9999px';
    testAd.style.left = '-9999px';
    testAd.style.height = '10px';
    testAd.style.width = '10px';

    document.body.appendChild(testAd);

    window.setTimeout(() => {
      const isBlocked = testAd.offsetHeight === 0 || testAd.clientHeight === 0 || testAd.style.display === 'none';
      testAd.remove();
      resolve(isBlocked);
    }, 150);
  });
}
