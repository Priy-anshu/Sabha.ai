import React, { useState } from 'react';
import { Cpu, X, ArrowRight, ShieldCheck, Sparkles, LogIn } from 'lucide-react';

export default function GuestNoticeModal({ onClose, onOpenAuthModal }) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleDismiss = () => {
    if (dontShowAgain) {
      localStorage.setItem('sabha_guest_notice_dismissed', 'true');
    }
    sessionStorage.setItem('sabha_guest_notice_seen', 'true');
    onClose();
  };

  const handleSignIn = () => {
    sessionStorage.setItem('sabha_guest_notice_seen', 'true');
    onClose();
    if (onOpenAuthModal) onOpenAuthModal();
  };

  return (
    <div className="modal-backdrop" onClick={handleDismiss}>
      <div 
        className="modal-content guest-notice-modal" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(129, 140, 248, 0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(56, 189, 248, 0.4)'
            }}>
              <Sparkles size={18} color="#38bdf8" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
              A Quick Note Before You Start
            </h3>
          </div>
          <button className="close-modal-btn" onClick={handleDismiss} title="Close window">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '1.4rem' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '999px',
            padding: '4px 10px',
            fontSize: '0.75rem',
            color: '#38bdf8',
            fontWeight: 700,
            marginBottom: '0.85rem'
          }}>
            <Cpu size={13} />
            <span>Multi-AI Council System</span>
          </div>

          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: 700 }}>
            This is not a regular chatbot
          </h4>

          <p style={{ margin: '0 0 0.9rem 0', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.55' }}>
            Most chatbots give you a fast answer from just one AI. <strong>Sabha.ai is different.</strong> For every question, multiple AI experts talk, debate with each other, and verify the facts before giving you a final answer.
          </p>

          {/* Simple Warning Box */}
          <div style={{
            background: 'rgba(129, 140, 248, 0.08)',
            border: '1px solid rgba(129, 140, 248, 0.25)',
            borderRadius: '12px',
            padding: '0.9rem 1rem',
            marginBottom: '1.15rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#818cf8', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.3rem' }}>
              <ShieldCheck size={16} />
              <span>Please use it for meaningful work</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
              Because multiple AIs debate together, every message uses a lot of computer power and tokens. Please use it for <strong>real questions, coding, research, planning, and study problems</strong> — rather than just testing single words like "hi".
            </p>
          </div>

          {/* Checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>
            <input 
              type="checkbox" 
              checked={dontShowAgain}
              onChange={e => setDontShowAgain(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Don't show this message again on this device</span>
          </label>

          {/* Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={handleDismiss}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7, #4f46e5)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>Got it, let's start!</span>
              <ArrowRight size={16} />
            </button>

            <button
              onClick={handleSignIn}
              style={{
                width: '100%',
                padding: '0.65rem 1rem',
                borderRadius: '10px',
                background: 'transparent',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-color)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <LogIn size={15} />
              <span>Sign In / Sign Up to save your chats</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
