import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { HOW_TO_STEPS, FAQ_DATA } from '../data/seoContent';

export default function HowToSection() {
  const [openFaq, setOpenFaq] = useState(0);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <section style={{ maxWidth: '960px', margin: '4rem auto', padding: '0 1.5rem' }}>
      {/* How to section */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.2rem', marginBottom: '0.75rem' }}>
          How to Download Instagram Media in <span className="gradient-text">3 Simple Steps</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          No app installation required. Works seamlessly on iOS iPhone, Android, Mac, and Windows PC.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginTop: '2.5rem' }}>
          {HOW_TO_STEPS.map((s, idx) => (
            <div key={idx} className="glass-card" style={{ padding: '2rem', textAlign: 'left', position: 'relative' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'rgba(253, 29, 29, 0.25)', position: 'absolute', top: '15px', right: '20px', fontFamily: 'var(--font-heading)' }}>
                {s.step}
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.6rem', color: 'var(--text-primary)' }}>
                {s.title}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Accordion Section */}
      <div className="faq-section">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#fcb045', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <HelpCircle size={18} /> Frequently Asked Questions
          </div>
          <h2 style={{ fontSize: '2rem' }}>Got Questions? We Have Answers</h2>
        </div>

        <div>
          {FAQ_DATA.map((faq, index) => (
            <div key={index} className="faq-item">
              <button
                className="faq-question"
                onClick={() => toggleFaq(index)}
              >
                <span>{faq.q}</span>
                {openFaq === index ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {openFaq === index && (
                <div className="faq-answer">
                  <p>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
