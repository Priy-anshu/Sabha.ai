import React, { useState } from 'react';
import { ShieldCheck, Users, Eye, Check, Copy, Sparkles, MessageSquare, ShieldAlert, Cpu, FileText, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function ChatMessages({
  messages,
  loading,
  onInspectModal,
  onSelectSuggestion
}) {
  const { user } = useAuth();
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter out default welcome system message if user has started talking
  const displayMessages = messages.filter(m => m.id !== 1 || messages.length === 1);

  const suggestions = [
    {
      icon: <Cpu size={18} color="#38bdf8" />,
      title: 'Design System Architecture',
      subtitle: 'Multi-agent debate on microservices, DBs & scalability'
    },
    {
      icon: <ShieldAlert size={18} color="#f43f5e" />,
      title: 'Audit Code & Security',
      subtitle: 'Identify vulnerabilities, race conditions & performance bugs'
    },
    {
      icon: <FileText size={18} color="#818cf8" />,
      title: 'Upload PDF Document Q&A',
      subtitle: 'Attach documents for context-aware Q&A and analysis'
    },
    {
      icon: <Zap size={18} color="#4ade80" />,
      title: 'Brainstorm Project Ideas',
      subtitle: 'Get curated fresher-to-pro CS project recommendations'
    }
  ];

  // ChatGPT Landing View (When starting a New Chat)
  if (messages.length <= 1) {
    return (
      <div className="hero-landing-container">
        <div className="hero-greeting">
          <h1 className="hero-title">
            {user ? `Welcome back, ${user.name.split(' ')[0]}` : 'What can I help with today?'}
          </h1>
          <p className="hero-subtitle">
            Sabha.ai uses specialized AI expert teams and dual verification to give you multi-perspective, verified answers.
          </p>
        </div>

        {/* Actionable Suggestion Cards */}
        <div className="suggestions-grid">
          {suggestions.map((s, idx) => (
            <div
              key={idx}
              className="suggestion-card"
              onClick={() => onSelectSuggestion(s.title)}
            >
              <div className="suggestion-icon">{s.icon}</div>
              <div className="suggestion-text">
                <div className="suggestion-title">{s.title}</div>
                <div className="suggestion-subtitle">{s.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Active Message Feed View
  return (
    <div className="messages-container">
      {displayMessages.map(msg => (
        <div
          key={msg.id}
          className={`message-bubble ${msg.sender === 'user' ? 'user-message' : 'ai-message'}`}
        >
          <div className="message-sender-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {msg.sender === 'user' ? (user ? user.name : 'You') : null}
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
            Debating & auditing consensus...
          </div>
        </div>
      )}
    </div>
  );
}
