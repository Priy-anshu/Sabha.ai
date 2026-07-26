import React, { useRef } from 'react';
import { Paperclip, Send, Square, FileText, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function ChatInput({
  input,
  setInput,
  attachedFile,
  setAttachedFile,
  loading,
  onSend,
  onStop,
  onOpenAuthModal
}) {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const handlePaperclipClick = () => {
    if (!user) {
      onOpenAuthModal();
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachedFile(file);
    }
  };

  return (
    <>
      {/* File Attachment Chip */}
      {attachedFile && (
        <div style={{ padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '0.3rem 0.6rem', borderRadius: '8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={14} />
            <span>{attachedFile.name}</span>
            <button onClick={() => setAttachedFile(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="input-area">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.txt,.md,.json"
          style={{ display: 'none' }}
        />

        <button
          className="attach-btn"
          onClick={handlePaperclipClick}
          disabled={loading}
          title={user ? "Attach PDF or document to Sabha.ai" : "Sign In to attach documents"}
          style={{ background: 'transparent', border: 'none', color: attachedFile ? '#38bdf8' : '#94a3b8', cursor: loading ? 'not-allowed' : 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center' }}
        >
          <Paperclip size={20} />
        </button>

        <input
          type="text"
          className="chat-input"
          placeholder={attachedFile ? "Ask Sabha.ai Council about this document..." : "Ask Sabha.ai Council anything..."}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && onSend()}
          disabled={loading}
        />

        {/* ChatGPT Style Stop Generating vs Send Button */}
        {loading ? (
          <button
            className="send-btn stop-btn"
            onClick={onStop}
            title="Stop generating"
            style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}
          >
            <Square size={16} fill="white" />
          </button>
        ) : (
          <button className="send-btn" onClick={onSend} disabled={!input.trim() && !attachedFile}>
            <Send size={18} />
          </button>
        )}
      </div>
    </>
  );
}
