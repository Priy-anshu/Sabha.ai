import React, { useState } from 'react';
import { MessageSquare, Plus, Send, Bot, Users, ShieldAlert, Sparkles, X, Eye, Copy, Check } from 'lucide-react';

export default function App() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Har Har Mahadev! Welcome to the Multi-Agent Debate Platform. Type any prompt to test persona allocation & response generation.',
      personas: []
    }
  ]);
  const [activePersonas, setActivePersonas] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalPersonas, setModalPersonas] = useState(null);
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
      // 1. Allocate / Adapt Personas
      const personaRes = await fetch('/api/chat/allocate-personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentInput, existingPersonas: activePersonas })
      });
      const personaData = await personaRes.json();
      const updatedPersonas = personaData.personas || activePersonas;
      setActivePersonas(updatedPersonas);

      // 2. Fetch AI Response
      const chatRes = await fetch('/api/chat/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentInput })
      });
      const chatData = await chatRes.json();

      if (chatData.success) {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'ai',
            text: chatData.response,
            personas: updatedPersonas
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { id: Date.now() + 1, sender: 'ai', text: `Error: ${chatData.error}`, personas: updatedPersonas }
        ]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, sender: 'ai', text: 'Failed to connect to backend service.' }
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
          <span className="chat-title">Multi-Agent AI Debate System</span>
        </div>

        <div className="messages-container">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`message-bubble ${msg.sender === 'user' ? 'user-message' : 'ai-message'}`}
            >
              <div className="message-sender-header">
                <span>{msg.sender === 'user' ? 'You' : 'AI Multi-Agent Team'}</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Clickable Persona Pop-Up Badge */}
                  {msg.sender === 'ai' && msg.personas && msg.personas.length > 0 && (
                    <button
                      className="view-personas-badge-btn"
                      onClick={() => setModalPersonas(msg.personas)}
                    >
                      <Users size={14} color="#38bdf8" />
                      <span>View {msg.personas.length} Allocated Personas</span>
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
                Allocating Indian expert personas & generating response...
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

      {/* Pop-Up Modal Window for Persona Inspection */}
      {modalPersonas && (
        <div className="modal-backdrop" onClick={() => setModalPersonas(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} color="#38bdf8" />
                <h3 style={{ margin: 0 }}>Allocated Personas ({modalPersonas.length})</h3>
              </div>
              <button className="close-modal-btn" onClick={() => setModalPersonas(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {modalPersonas.map((p, idx) => (
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
