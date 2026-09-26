import React from 'react';
import { Video, Image, Layers, Music, ShieldCheck, Zap } from 'lucide-react';

export default function FeatureGrid() {
  const features = [
    {
      icon: <Video size={24} />,
      title: 'No Watermark',
      desc: 'Download clean, original videos and photos exactly as they were uploaded, without any intrusive logos or watermarks.'
    },
    {
      icon: <Image size={24} />,
      title: 'High Quality (HD/4K)',
      desc: 'Save media in the highest possible resolution available on Instagram, including 1080p and 4K videos.'
    },
    {
      icon: <Zap size={24} />,
      title: '100% Free & Unlimited',
      desc: 'Use our tool as many times as you want. There are no hidden fees, subscriptions, or daily download limits.'
    },
    {
      icon: <Layers size={24} />,
      title: 'No Installation Required',
      desc: 'Completely browser-based. Works flawlessly on Chrome, Safari, Edge, and Firefox without needing to install apps or extensions.'
    },
    {
      icon: <ShieldCheck size={24} />,
      title: 'Safe & Private',
      desc: 'We respect your privacy. You don\'t need to create an account, log in, or provide any personal information to use our service.'
    }
  ];

  return (
    <section className="feature-grid">
      {features.map((item, index) => (
        <div key={index} className="glass-card feature-card">
          <div className="feature-icon-box">{item.icon}</div>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            {item.title}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
            {item.desc}
          </p>
        </div>
      ))}
    </section>
  );
}
