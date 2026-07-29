import React, { useRef, useEffect } from 'react';
import { Paperclip, Send, Square, FileText, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function ChatInput({
  input,
  setInput,
  attachedFiles: propAttachedFiles,
  setAttachedFiles: propSetAttachedFiles,
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

  // Normalize attached files list for backward compatibility
  const currentAttachedFiles = propAttachedFiles || (attachedFile ? [attachedFile] : []);
  const updateAttachedFiles = (files) => {
    if (propSetAttachedFiles) {
      propSetAttachedFiles(files);
    } else if (setAttachedFile) {
      setAttachedFile(files[0] || null);
    }
  };

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
    if (currentAttachedFiles.length >= 3) {
      alert('You can only select up to 3 files.');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (currentAttachedFiles.length + selectedFiles.length > 3) {
      alert('You can only select up to 3 files.');
    }

    const availableSlots = Math.max(0, 3 - currentAttachedFiles.length);
    const filesToAdd = selectedFiles.slice(0, availableSlots);
    const newFiles = [...currentAttachedFiles, ...filesToAdd];
    updateAttachedFiles(newFiles);

    // Reset input value so re-selecting same file works
    if (e.target) e.target.value = '';
  };

  const handleRemoveFile = (indexToRemove) => {
    const newFiles = currentAttachedFiles.filter((_, idx) => idx !== indexToRemove);
    updateAttachedFiles(newFiles);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && (input.trim() || currentAttachedFiles.length > 0)) {
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
      {/* Horizontal Scroll Bar for Attached File Chips (Max 3) */}
      {currentAttachedFiles.length > 0 && (
        <div className="attached-files-scroll-container">
          {currentAttachedFiles.map((file, idx) => (
            <div key={idx} className="attached-file-card">
              <div className="attached-file-icon-wrapper">
                <FileText size={16} color="#38bdf8" />
                <span className="file-ext-badge">{getFileExtension(file.name)}</span>
              </div>
              <div className="attached-file-info">
                <span className="attached-file-name" title={file.name}>{file.name}</span>
                {file.size && <span className="attached-file-size">{formatFileSize(file.size)}</span>}
              </div>
              <button
                className="remove-file-btn"
                onClick={() => handleRemoveFile(idx)}
                title="Remove attachment"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="input-row">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="*"
          multiple
          style={{ display: 'none' }}
        />

        <button
          className="attach-btn"
          onClick={handlePaperclipClick}
          disabled={loading}
          title={user ? "Attach up to 3 code, document, spreadsheet, or data files to Sabha.ai" : "Sign In to attach documents"}
          style={{ background: 'transparent', border: 'none', color: currentAttachedFiles.length > 0 ? '#38bdf8' : '#94a3b8', cursor: loading ? 'not-allowed' : 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', alignSelf: 'flex-end', marginBottom: '4px' }}
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
