import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function ChatHeader() {
  const { user } = useAuth();

  return (
    <div className="chat-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="chat-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
          Sabha<span style={{ color: '#38bdf8' }}>.ai</span>
        </span>
        <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>| Multi-Agent Consensus Platform</span>
      </div>
      {user && <span style={{ fontSize: '0.85rem', color: '#38bdf8' }}>Logged in as {user.name}</span>}
    </div>
  );
}
