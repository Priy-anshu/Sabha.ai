import React, { useState } from 'react';
import { MessageSquare, Plus, Send, Bot, User } from 'lucide-react';

export default function App() {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: 'Har Har Mahadev! Welcome to the Multi-Agent Debate Platform. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { id: Date.now(), sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentInput })
      });
      const data = await response.json();

      if (data.success) {
        setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: data.response }]);
      } else {
        setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: `Error: ${data.error}` }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: 'Failed to connect to backend service.' }]);
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
        <button className="new-chat-btn" onClick={() => setMessages([])}>
          <Plus size={18} /> New Chat
        </button>

        <div className="chat-history">
          <div className="history-item active">
            <MessageSquare size={16} style={{ display: 'inline', marginRight: '8px' }} />
            Phase 1 Baseline Chat
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
            <div key={msg.id} className={`message-bubble ${msg.sender === 'user' ? 'user-message' : 'ai-message'}`}>
              <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '4px' }}>
                {msg.sender === 'user' ? 'You' : 'AI Assistant'}
              </div>
              {msg.text}
            </div>
          ))}
          {loading && (
            <div className="message-bubble ai-message" style={{ fontStyle: 'italic', opacity: 0.8 }}>
              Thinking...
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
    </div>
  );
}
