import React, { useState } from 'react';
import { ShieldCheck, Users, Eye, Check, Copy, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function ChatMessages({ messages, loading, onInspectModal }) {
  const { user } = useAuth();
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="messages-container">
      {messages.map(msg => (
        <div
          key={msg.id}
          className={`message-bubble ${msg.sender === 'user' ? 'user-message' : 'ai-message'}`}
        >
          <div className="message-sender-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {msg.sender === 'user' ? (user ? user.name : 'You') : 'Sabha.ai Council'}
              {msg.sender === 'ai' && msg.verification && (
                <span className="verified-badge" title="Audited by Dual Verifiers">
                  <ShieldCheck size={13} color="#4ade80" /> Audit Verified
                </span>
              )}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {msg.sender === 'ai' && msg.personas && msg.personas.length > 0 && (
                <button
                  className="view-personas-badge-btn"
                  onClick={() => onInspectModal({ personas: msg.personas, transcript: msg.transcript, verification: msg.verification })}
                >
                  <Users size={14} color="#38bdf8" />
                  <span>Inspect {msg.personas.length} Personas & Audit</span>
                  <Eye size={12} style={{ marginLeft: '2px' }} />
                </button>
              )}

              <button
                className="copy-btn"
                onClick={() => handleCopy(msg.id, msg.text)}
                title="Copy to clipboard"
              >
                {copiedId === msg.id ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div className="message-content">{msg.text}</div>
        </div>
      ))}

      {loading && (
        <div className="message-bubble ai-message">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontStyle: 'italic' }}>
            <Sparkles size={16} className="spin-icon" color="#38bdf8" />
            Sabha.ai Council is debating, auditing & synthesizing consensus...
          </div>
        </div>
      )}
    </div>
  );
}
