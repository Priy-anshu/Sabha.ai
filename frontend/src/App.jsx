import React, { useState } from 'react';
import { MessageSquare, Plus, Send, Bot, Users, ShieldAlert, Sparkles, X, Eye, Copy, Check, MessageCircle } from 'lucide-react';

export default function App() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Har Har Mahadev! Step B (Sequential Adversarial Debate Loop) is active. Type any question to launch a multi-persona debate!',
      personas: [],
      transcript: []
    }
  ]);
  const [activePersonas, setActivePersonas] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalData, setModalData] = useState(null); // { personas, transcript }
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
      // Execute Step A Allocation + Step B Multi-Turn Debate Loop
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
            transcript: debateData.transcript
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
          <span className="chat-title">Multi-Agent AI Debate System — Phase 3 Debate Engine</span>
        </div>

        <div className="messages-container">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`message-bubble ${msg.sender === 'user' ? 'user-message' : 'ai-message'}`}
            >
              <div className="message-sender-header">
                <span>{msg.sender === 'user' ? 'You' : 'AI Multi-Agent Debate Team'}</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Clickable Persona & Transcript Pop-Up Badge */}
                  {msg.sender === 'ai' && msg.personas && msg.personas.length > 0 && (
                    <button
                      className="view-personas-badge-btn"
                      onClick={() => setModalData({ personas: msg.personas, transcript: msg.transcript })}
                    >
                      <Users size={14} color="#38bdf8" />
                      <span>Inspect {msg.personas.length} Personas & Debate</span>
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
                Allocating expert personas & running sequential debate loop...
              </div>
            </div>
          )}
        </div>

        <div className="input-area">
          <input
            type="text"
            className="chat-input"
            placeholder="Type any prompt (e.g. 'Which tech stack is best for a real-time card game?')..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button className="send-btn" onClick={handleSend} disabled={loading}>
            <Send size={18} />
          </button>
        </div>
      </div>

      {/* Pop-Up Modal Window for Persona & Debate Transcript Inspection */}
      {modalData && (
        <div className="modal-backdrop" onClick={() => setModalData(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} color="#38bdf8" />
                <h3 style={{ margin: 0 }}>Debate Team & Transcript ({modalData.personas.length} Personas)</h3>
              </div>
              <button className="close-modal-btn" onClick={() => setModalData(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <h4 style={{ color: '#38bdf8', marginTop: 0 }}>👥 Allocated Personas</h4>
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

              {modalData.transcript && modalData.transcript.length > 0 && (
                <>
                  <h4 style={{ color: '#818cf8', marginTop: '1.5rem' }}>💬 Debate Transcript Highlights</h4>
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
