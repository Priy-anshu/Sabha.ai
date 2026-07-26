import React, { useRef } from 'react';
import { Paperclip, Send, FileText, X } from 'lucide-react';

export default function ChatInput({
  input,
  setInput,
  attachedFile,
  setAttachedFile,
  loading,
  onSend
}) {
  const fileInputRef = useRef(null);

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
          onClick={() => fileInputRef.current?.click()}
          title="Attach PDF or document to Sabha.ai"
          style={{ background: 'transparent', border: 'none', color: attachedFile ? '#38bdf8' : '#94a3b8', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center' }}
        >
          <Paperclip size={20} />
        </button>

        <input
          type="text"
          className="chat-input"
          placeholder={attachedFile ? "Ask Sabha.ai Council about this document..." : "Ask Sabha.ai Council anything..."}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSend()}
        />
        <button className="send-btn" onClick={onSend} disabled={loading}>
          <Send size={18} />
        </button>
      </div>
    </>
  );
}
