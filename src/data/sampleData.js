// High quality demo media assets for seamless previewing & testing

export const DEMO_MEDIA = {
  reel: {
    type: 'reel',
    title: 'Modern Architecture & Aesthetic Sunset Beats 🌆✨',
    author: {
      username: 'creative_mindsets',
      name: 'Creative Mindsets',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      verified: true
    },
    metrics: {
      likes: '142.8K',
      comments: '1,290',
      views: '1.4M'
    },
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-with-neon-lights-at-night-41566-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1200&auto=format&fit=max&q=80',
    duration: '0:28',
    resolutions: [
      { label: '1080p Full HD (MP4)', quality: '1080p', size: '14.2 MB', url: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-with-neon-lights-at-night-41566-large.mp4' },
      { label: '720p HD (MP4)', quality: '720p', size: '8.6 MB', url: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-with-neon-lights-at-night-41566-medium.mp4' },
      { label: 'Audio MP3 (320kbps)', quality: 'audio', size: '2.1 MB', isAudio: true, url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' }
    ],
    audioTrack: 'Original Sound - creative_mindsets (Chill Lofi Beats)'
  },
  photo: {
    type: 'photo',
    title: 'Golden Hour Reflections in Tokyo 🎌 High Resolution Photography',
    author: {
      username: 'tokyo_lens',
      name: 'Kenji Sato',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      verified: true
    },
    metrics: {
      likes: '89.4K',
      comments: '542'
    },
    imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=2400&auto=format&fit=max&q=80',
    resolutions: [
      { label: 'Original High-Res (JPG)', quality: 'original', size: '4.8 MB', url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=2400&auto=format&fit=max&q=80' },
      { label: 'Standard HD (1080px)', quality: 'hd', size: '2.1 MB', url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1080&auto=format&fit=max&q=80' }
    ]
  },
  carousel: {
    type: 'carousel',
    title: 'Top 5 Minimalist Workspace Setups of 2026 🖥️ Workspace Goals',
    author: {
      username: 'tech_aesthetics',
      name: 'Tech & Design Hub',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      verified: true
    },
    metrics: {
      likes: '210.5K',
      comments: '3,410'
    },
    items: [
      { id: 1, type: 'photo', url: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=1600&auto=format&fit=max&q=80', caption: 'Slide 1: Clean Cyberpunk Glow Desk' },
      { id: 2, type: 'photo', url: 'https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=1600&auto=format&fit=max&q=80', caption: 'Slide 2: Minimal Warm Wood & Monstera' },
      { id: 3, type: 'photo', url: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=1600&auto=format&fit=max&q=80', caption: 'Slide 3: Dual UltraWide Developer Rig' }
    ]
  }
};

export const QUICK_TEST_URLS = [
  { label: '🔥 Sample Reel', url: 'https://www.instagram.com/reel/C3x9L2kM7aB/' },
  { label: '📸 HD Photo', url: 'https://www.instagram.com/p/C2m8K0xP9zQ/' },
  { label: '🖼️ Multi-Carousel', url: 'https://www.instagram.com/p/C4v1N6mO8rS/' }
];
