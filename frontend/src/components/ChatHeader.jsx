import React from 'react';
import { Bot, LogIn, PanelLeftOpen, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function ChatHeader({ sidebarOpen, onToggleSidebar, onOpenAuthModal, theme, onToggleTheme }) {
  const { user } = useAuth();

  return (
    <div className="chat-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Toggle Sidebar Button for Logged-In User when collapsed */}
        {user && !sidebarOpen && (
          <button className="expand-sidebar-btn" onClick={onToggleSidebar} title="Open Sidebar">
            <PanelLeftOpen size={20} />
          </button>
        )}

        {(!user || !sidebarOpen) && <Bot size={24} color="#38bdf8" />}

        <span className="chat-title" style={{ fontSize: '1.15rem', fontWeight: 800 }}>
          Sabha<span style={{ color: '#818cf8' }}>.ai</span>
        </span>
        <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>| Multi-Agent Consensus Platform</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Small Theme Toggle Button */}
        <button
          className="theme-toggle-icon-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#38bdf8" />}
        </button>

        {!user && (
          <button className="sign-in-sidebar-btn" onClick={onOpenAuthModal} style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}>
            <LogIn size={16} />
            <span>Sign In / Register</span>
          </button>
        )}
      </div>
    </div>
  );
}
