import React, { useState } from 'react';
import { MessageSquare, Plus, Send, Bot, Users, ShieldAlert, Sparkles, X, Eye, Copy, Check, MessageCircle, ShieldCheck } from 'lucide-react';

export default function App() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Har Har Mahadev! Phase 4 (Step C Dual-Persona Verification Layer) is active. Responses are now audited by 2 independent verifiers before delivery!',
      personas: [],
      transcript: [],
      verification: null
    }
  ]);
  const [activePersonas, setActivePersonas] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalData, setModalData] = useState(null); // { personas, transcript, verification }
  const [copiedId, setCopiedId] = useState(null);

  const handleNewChat = () => {
    setMessages([]);
    setActivePersonas([]);
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { id: Date.now(), sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      // Execute 4-Step Pipeline: Allocation -> Debate -> Dual Verification -> Output
      const debateRes = await fetch('/api/chat/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentInput, existingPersonas: activePersonas })
      });
      const debateData = await debateRes.json();

      if (debateData.success) {
        setActivePersonas(debateData.personas);
        setMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'ai',
            text: debateData.response,
            personas: debateData.personas,
            transcript: debateData.transcript,
            verification: debateData.verification
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { id: Date.now() + 1, sender: 'ai', text: `Error: ${debateData.error}`, personas: activePersonas }
        ]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, sender: 'ai', text: 'Failed to connect to backend debate service.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <Bot size={24} />
          <span>Multi-Agent Platform</span>
        </div>
        <button className="new-chat-btn" onClick={handleNewChat}>
          <Plus size={18} /> New Chat
        </button>

        <div className="chat-history">
          <div className="history-item active">
            <MessageSquare size={16} style={{ display: 'inline', marginRight: '8px' }} />
            Active Session ({activePersonas.length} Personas)
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="main-chat-area">
        <div className="chat-header">
          <span className="chat-title">Multi-Agent AI Debate System — Phase 4 Dual Verification</span>
        </div>

        <div className="messages-container">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`message-bubble ${msg.sender === 'user' ? 'user-message' : 'ai-message'}`}
            >
              <div className="message-sender-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {msg.sender === 'user' ? 'You' : 'AI Multi-Agent Team'}
                  {msg.sender === 'ai' && msg.verification && (
                    <span className="verified-badge" title="Audited by Dual Verifiers">
                      <ShieldCheck size={13} color="#4ade80" /> Audit Verified
                    </span>
                  )}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Clickable Persona & Transcript Pop-Up Badge */}
                  {msg.sender === 'ai' && msg.personas && msg.personas.length > 0 && (
                    <button
                      className="view-personas-badge-btn"
                      onClick={() => setModalData({ personas: msg.personas, transcript: msg.transcript, verification: msg.verification })}
                    >
                      <Users size={14} color="#38bdf8" />
                      <span>Inspect {msg.personas.length} Personas & Audit</span>
                      <Eye size={12} style={{ marginLeft: '2px' }} />
                    </button>
                  )}

                  {/* Copy Button */}
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
                Allocating personas, debating & running Dual Verifier Audit...
              </div>
            </div>
          )}
        </div>

        <div className="input-area">
          <input
            type="text"
            className="chat-input"
            placeholder="Type your message or prompt here..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button className="send-btn" onClick={handleSend} disabled={loading}>
            <Send size={18} />
          </button>
        </div>
      </div>

      {/* Pop-Up Modal Window for Persona, Debate & Verification Inspection */}
      {modalData && (
        <div className="modal-backdrop" onClick={() => setModalData(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} color="#38bdf8" />
                <h3 style={{ margin: 0 }}>Debate Team & Verification Audit</h3>
              </div>
              <button className="close-modal-btn" onClick={() => setModalData(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Dual Verifier Audit Section */}
              {modalData.verification && modalData.verification.verifiers && modalData.verification.verifiers.length > 0 && (
                <div style={{ marginBottom: '1rem', background: 'rgba(74, 222, 128, 0.1)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4ade80', fontWeight: 700, marginBottom: '0.5rem' }}>
                    <ShieldCheck size={18} />
                    <span>Step C: Dual-Persona Verification Audit Passed</span>
                  </div>
                  {modalData.verification.verifiers.map((v, idx) => (
                    <div key={idx} style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: '0.4rem' }}>
                      <strong>{v.name}:</strong> <span style={{ color: '#4ade80' }}>{v.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Allocated Personas Section */}
              <h4 style={{ color: '#38bdf8', marginTop: 0 }}>👥 Allocated Personas ({modalData.personas.length})</h4>
              {modalData.personas.map((p, idx) => (
                <div key={p.id || idx} className="persona-card">
                  <div className="persona-card-header">
                    <span className="persona-badge">Persona {idx + 1}</span>
                    <span className="persona-name">{p.name}</span>
                  </div>
                  <div className="persona-detail">
                    <strong>Role:</strong> {p.role}
                  </div>
                  <div className="persona-detail mindset">
                    <ShieldAlert size={14} color="#f43f5e" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span><strong>Critical Mindset:</strong> {p.mindset}</span>
                  </div>
                </div>
              ))}

              {/* Debate Transcript Highlights */}
              {modalData.transcript && modalData.transcript.length > 0 && (
                <>
                  <h4 style={{ color: '#818cf8', marginTop: '1.5rem' }}>💬 Step B Debate Transcript Highlights</h4>
                  {modalData.transcript.map((t, idx) => (
                    <div key={idx} className="persona-card" style={{ borderLeft: '4px solid #818cf8' }}>
                      <div className="persona-card-header">
                        <MessageCircle size={16} color="#818cf8" />
                        <span className="persona-name">{t.personaName}</span>
                      </div>
                      <div className="persona-detail" style={{ whiteSpace: 'pre-wrap', marginTop: '0.4rem' }}>
                        {t.output}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
