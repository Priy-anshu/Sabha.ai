import React, { useRef, useEffect } from 'react';
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
  const textareaRef = useRef(null);

  // Auto-expand textarea height up to 4 lines (~100px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
    }
  }, [input]);

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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && (input.trim() || attachedFile)) {
        onSend();
      }
    }
  };

  const getFileExtension = (filename) => {
    if (!filename) return 'DOC';
    const parts = filename.split('.');
    if (parts.length <= 1) return 'DOC';
    const ext = parts.pop().toUpperCase();
    return ext.length <= 4 ? ext : 'DOC';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="input-area">
      {/* File Attachment Chip Card inside Input Box */}
      {attachedFile && (
        <div className="attached-file-card">
          <div className="attached-file-icon-wrapper">
            <FileText size={16} color="#38bdf8" />
            <span className="file-ext-badge">{getFileExtension(attachedFile.name)}</span>
          </div>
          <div className="attached-file-info">
            <span className="attached-file-name" title={attachedFile.name}>{attachedFile.name}</span>
            {attachedFile.size && <span className="attached-file-size">{formatFileSize(attachedFile.size)}</span>}
          </div>
          <button
            className="remove-file-btn"
            onClick={() => setAttachedFile(null)}
            title="Remove attachment"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="input-row">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="*"
          style={{ display: 'none' }}
        />

        <button
          className="attach-btn"
          onClick={handlePaperclipClick}
          disabled={loading}
          title={user ? "Attach code, document, spreadsheet, or data file to Sabha.ai" : "Sign In to attach documents"}
          style={{ background: 'transparent', border: 'none', color: attachedFile ? '#38bdf8' : '#94a3b8', cursor: loading ? 'not-allowed' : 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', alignSelf: 'flex-end', marginBottom: '4px' }}
        >
          <Paperclip size={20} />
        </button>

        {/* Multiline Textarea capped at 4 lines */}
        <textarea
          ref={textareaRef}
          className="chat-input"
          rows={1}
          placeholder={attachedFile ? "Ask Sabha.ai Council about this document..." : "Ask Sabha.ai Council anything..."}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />

        {/* ChatGPT Style Stop Generating vs Send Button */}
        {loading ? (
          <button
            className="send-btn stop-btn"
            onClick={onStop}
            title="Stop generating"
            style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', alignSelf: 'flex-end', marginBottom: '4px' }}
          >
            <Square size={16} fill="white" />
          </button>
        ) : (
          <button
            className="send-btn"
            onClick={onSend}
            disabled={!input.trim() && !attachedFile}
            style={{ alignSelf: 'flex-end', marginBottom: '4px' }}
          >
            <Send size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
