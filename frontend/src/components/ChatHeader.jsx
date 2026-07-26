import React from 'react';
import { Bot, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function ChatHeader({ onOpenAuthModal }) {
  const { user } = useAuth();

  return (
    <div className="chat-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {!user && <Bot size={24} color="#38bdf8" />}
        <span className="chat-title" style={{ fontSize: '1.15rem', fontWeight: 800 }}>
          Sabha<span style={{ color: '#818cf8' }}>.ai</span>
        </span>
        <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>| Multi-Agent Consensus Platform</span>
      </div>

      <div>
        {user ? (
          <span style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 600 }}>
            Logged in as {user.name}
          </span>
        ) : (
          <button className="sign-in-sidebar-btn" onClick={onOpenAuthModal} style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}>
            <LogIn size={16} />
            <span>Sign In / Register</span>
          </button>
        )}
      </div>
    </div>
  );
}
