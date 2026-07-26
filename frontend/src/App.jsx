import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Send, Bot, Users, ShieldAlert, Sparkles, X, Eye, Copy, Check, MessageCircle, ShieldCheck, Trash2, LogIn, LogOut, User as UserIcon, Lock, Mail, KeyRound } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

export default function App() {
  const [sessionId, setSessionId] = useState(() => 'sess_' + Date.now());
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Har Har Mahadev! Real Email Verification (OTP via Nodemailer) & Google Auth are active. Click Sign In at the bottom left!',
      personas: [],
      transcript: [],
      verification: null
    }
  ]);
  const [activePersonas, setActivePersonas] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Authentication State
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register', or 'otp'
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [otpInput, setOtpInput] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');

  // Fetch session history list for sidebar
  const fetchSessions = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/sessions', { headers });
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.warn('Failed to load sessions:', err.message);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [user, token]);

  const handleNewChat = () => {
    const newId = 'sess_' + Date.now();
    setSessionId(newId);
    setMessages([]);
    setActivePersonas([]);
  };

  const handleSelectSession = async (sId) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/sessions/${sId}`, { headers });
      const data = await res.json();
      if (data.success && data.session) {
        setSessionId(data.session.sessionId);
        setMessages(data.session.messages || []);
        setActivePersonas(data.session.activePersonas || []);
      }
    } catch (err) {
      console.error('Error loading session:', err.message);
    }
  };

  const handleDeleteSession = async (e, sId) => {
    e.stopPropagation();
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await fetch(`/api/sessions/${sId}`, { method: 'DELETE', headers });
      if (sId === sessionId) {
        handleNewChat();
      }
      fetchSessions();
    } catch (err) {
      console.error('Failed to delete session:', err.message);
    }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Auth Handlers
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');
    const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();

      if (data.success) {
        if (data.requireOtp) {
          setPendingEmail(data.email);
          setAuthMode('otp');
          setAuthSuccessMsg(data.message || `Verification code sent to ${data.email}`);
        } else {
          setUser(data.user);
          setToken(data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('token', data.token);
          setShowAuthModal(false);
          setAuthForm({ name: '', email: '', password: '' });
        }
      } else {
        setAuthError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setAuthError('Connection error during auth.');
    }
  };

  // Handle OTP Verification Submit
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, otp: otpInput })
      });
      const data = await res.json();

      if (data.success) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        setShowAuthModal(false);
        setOtpInput('');
        setPendingEmail('');
      } else {
        setAuthError(data.error || 'Verification failed');
      }
    } catch (err) {
      setAuthError('Error verifying OTP.');
    }
  };

  // Real Google OAuth Success Handler
  const handleGoogleSuccess = async (credentialResponse) => {
    setAuthError('');
    try {
      const decodedGoogleUser = jwtDecode(credentialResponse.credential);

      const realGooglePayload = {
        googleId: decodedGoogleUser.sub,
        email: decodedGoogleUser.email,
        name: decodedGoogleUser.name,
        avatar: decodedGoogleUser.picture
      };

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(realGooglePayload)
      });
      const data = await res.json();

      if (data.success) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        setShowAuthModal(false);
      } else {
        setAuthError(data.error || 'Google auth sync failed');
      }
    } catch (err) {
      console.error('Google decode error:', err);
      setAuthError('Google sign in decoding failed');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    handleNewChat();
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { id: String(Date.now()), sender: 'user', text: input };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const debateRes = await fetch('/api/chat/debate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt: currentInput, existingPersonas: activePersonas })
      });
      const debateData = await debateRes.json();

      if (debateData.success) {
        setActivePersonas(debateData.personas);
        const aiMsg = {
          id: String(Date.now() + 1),
          sender: 'ai',
          text: debateData.response,
          personas: debateData.personas,
          transcript: debateData.transcript,
          verification: debateData.verification
        };
        const finalMessages = [...updatedMessages, aiMsg];
        setMessages(finalMessages);

        // Save to MongoDB
        await fetch('/api/sessions/save', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            sessionId,
            activePersonas: debateData.personas,
            messages: finalMessages
          })
        });
        fetchSessions();
      } else {
        setMessages(prev => [
          ...prev,
          { id: String(Date.now() + 1), sender: 'ai', text: `Error: ${debateData.error}`, personas: activePersonas }
        ]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { id: String(Date.now() + 1), sender: 'ai', text: 'Failed to connect to backend debate service.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
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
          {sessions.map(s => (
            <div
              key={s.sessionId}
              className={`history-item ${s.sessionId === sessionId ? 'active' : ''}`}
              onClick={() => handleSelectSession(s.sessionId)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1 }}>
                <MessageSquare size={15} style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.title}
                </span>
              </div>
              <button
                className="delete-session-btn"
                onClick={(e) => handleDeleteSession(e, s.sessionId)}
                title="Delete session"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {/* Bottom Left User Account Pill */}
        <div className="user-sidebar-bottom">
          {user ? (
            <div className="user-profile-pill">
              <div className="user-avatar-initials">{getInitials(user.name)}</div>
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className="user-email">{user.email}</span>
              </div>
              <button className="logout-icon-btn" onClick={handleLogout} title="Sign Out">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button className="sign-in-sidebar-btn" onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccessMsg(''); setShowAuthModal(true); }}>
              <LogIn size={18} />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="main-chat-area">
        <div className="chat-header">
          <span className="chat-title">Multi-Agent AI Debate System</span>
          {user && <span style={{ fontSize: '0.85rem', color: '#38bdf8' }}>Logged in as {user.name}</span>}
        </div>

        <div className="messages-container">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`message-bubble ${msg.sender === 'user' ? 'user-message' : 'ai-message'}`}
            >
              <div className="message-sender-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {msg.sender === 'user' ? (user ? user.name : 'You') : 'AI Multi-Agent Team'}
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
                      onClick={() => setModalData({ personas: msg.personas, transcript: msg.transcript, verification: msg.verification })}
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

      {/* Auth Pop-Up Modal Window */}
      {showAuthModal && (
        <div className="modal-backdrop" onClick={() => setShowAuthModal(false)}>
          <div className="modal-content auth-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>
                {authMode === 'otp' ? 'Email Verification' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
              </h3>
              <button className="close-modal-btn" onClick={() => setShowAuthModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {authError && <div className="auth-error-box">{authError}</div>}
              {authSuccessMsg && <div style={{ background: 'rgba(74, 222, 128, 0.15)', border: '1px solid rgba(74, 222, 128, 0.4)', color: '#4ade80', padding: '0.6rem', borderRadius: '6px', fontSize: '0.85rem' }}>{authSuccessMsg}</div>}

              {authMode === 'otp' ? (
                /* OTP Verification Screen */
                <form onSubmit={handleOtpSubmit} className="auth-form">
                  <p style={{ fontSize: '0.88rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                    Enter the 6-digit code sent to <strong>{pendingEmail}</strong>:
                  </p>

                  <div className="form-group">
                    <div className="input-icon-wrapper">
                      <KeyRound size={16} color="#38bdf8" />
                      <input
                        type="text"
                        placeholder="123456"
                        maxLength="6"
                        value={otpInput}
                        onChange={e => setOtpInput(e.target.value)}
                        style={{ letterSpacing: '4px', fontWeight: 'bold', fontSize: '1.1rem' }}
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="auth-submit-btn">
                    Verify Code & Login
                  </button>

                  <div className="auth-toggle-footer">
                    <button type="button" onClick={() => setAuthMode('register')}>
                      ← Back to Registration
                    </button>
                  </div>
                </form>
              ) : (
                /* Standard Login / Register Screen */
                <>
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setAuthError('Google Sign-In was cancelled or failed')}
                      useOneTap
                      theme="filled_blue"
                      shape="pill"
                      width="300"
                    />
                  </div>

                  <div className="auth-divider"><span>OR</span></div>

                  <form onSubmit={handleAuthSubmit} className="auth-form">
                    {authMode === 'register' && (
                      <div className="form-group">
                        <label>Full Name</label>
                        <div className="input-icon-wrapper">
                          <UserIcon size={16} />
                          <input
                            type="text"
                            placeholder="Priyanshu Kumar"
                            value={authForm.name}
                            onChange={e => setAuthForm({ ...authForm, name: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                    )}

                    <div className="form-group">
                      <label>Email Address</label>
                      <div className="input-icon-wrapper">
                        <Mail size={16} />
                        <input
                          type="email"
                          placeholder="user@example.com"
                          value={authForm.email}
                          onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Password</label>
                      <div className="input-icon-wrapper">
                        <Lock size={16} />
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={authForm.password}
                          onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <button type="submit" className="auth-submit-btn">
                      {authMode === 'login' ? 'Sign In' : 'Register Account'}
                    </button>
                  </form>

                  <div className="auth-toggle-footer">
                    {authMode === 'login' ? (
                      <span>Don't have an account? <button onClick={() => { setAuthMode('register'); setAuthError(''); setAuthSuccessMsg(''); }}>Sign Up</button></span>
                    ) : (
                      <span>Already have an account? <button onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccessMsg(''); }}>Sign In</button></span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Persona Inspection Pop-Up Modal */}
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
