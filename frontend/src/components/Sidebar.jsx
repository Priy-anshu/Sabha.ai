import React from 'react';
import { Bot, Plus, MessageSquare, Trash2, LogIn, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Sidebar({
  sessions,
  sessionId,
  theme,
  onToggleTheme,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onOpenAuthModal
}) {
  const { user, logoutState } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <Bot size={26} color="#38bdf8" />
        <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
          Sabha<span style={{ color: '#818cf8' }}>.ai</span>
        </span>
      </div>

      {/* New Session Button */}
      <button className="new-chat-btn" onClick={onNewChat}>
        <Plus size={18} /> New Session
      </button>

      {/* Chat History List */}
      <div className="chat-history">
        {sessions.map(s => (
          <div
            key={s.sessionId}
            className={`history-item ${s.sessionId === sessionId ? 'active' : ''}`}
            onClick={() => onSelectSession(s.sessionId)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1 }}>
              <MessageSquare size={15} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.title}
              </span>
            </div>
            <button
              className="delete-session-btn"
              onClick={(e) => onDeleteSession(e, s.sessionId)}
              title="Delete session"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Bottom Sidebar Settings & User Account Pill */}
      <div className="user-sidebar-bottom">
        {/* Theme Toggle Button */}
        <button className="theme-toggle-btn" onClick={onToggleTheme}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {theme === 'dark' ? <Moon size={16} color="#38bdf8" /> : <Sun size={16} color="#f59e0b" />}
            <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
          </div>
          <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Toggle</span>
        </button>

        {user ? (
          <div className="user-profile-pill">
            <div className="user-avatar-initials">{getInitials(user.name)}</div>
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-email">{user.email}</span>
            </div>
            <button className="logout-icon-btn" onClick={logoutState} title="Sign Out">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button className="sign-in-sidebar-btn" onClick={onOpenAuthModal}>
            <LogIn size={18} />
            <span>Sign In / Register</span>
          </button>
        )}
      </div>
    </div>
  );
}
