import React, { useState, useRef, useEffect } from 'react';
import { Bot, Users, Eye, Check, Copy, Sparkles, ShieldAlert, Cpu, FileText, Zap, ChevronDown, ChevronUp, History } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext.jsx';
import LiveThinkingCard from './LiveThinkingCard.jsx';

// Skeleton Loader Component for Instant Chat Session Loading
function ChatSkeletonLoader() {
  return (
    <div className="skeleton-chat-container">
      <div className="message-bubble user-message skeleton-bubble shadow-sm">
        <div className="skeleton-line skeleton-title" style={{ width: '50%' }}></div>
      </div>

      <div className="message-bubble ai-message skeleton-bubble shadow-sm">
        <div className="message-sender-header" style={{ marginBottom: '0.6rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Bot size={18} color="#38bdf8" />
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Sabha<span style={{ color: '#818cf8' }}>.ai</span></span>
          </span>
        </div>
        <div className="skeleton-line skeleton-body" style={{ width: '85%' }}></div>
        <div className="skeleton-line skeleton-body" style={{ width: '92%' }}></div>
        <div className="skeleton-line skeleton-body" style={{ width: '65%' }}></div>
      </div>
    </div>
  );
}

// Component for rendering user prompt text with Copy button & "Show More / Show Less" after 3 lines
function ExpandableUserText({ text, msgId, onCopy, isCopied }) {
  const [expanded, setExpanded] = useState(false);
  const safeText = typeof text === 'string' ? text : String(text || '');
  const isLongText = safeText.length > 180 || safeText.split('\n').length > 3;

  const truncatedText = isLongText ? safeText.slice(0, 180) + '...' : safeText;

  return (
    <div className="user-message-body" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div className="message-content" style={{ flex: 1 }}>
          <span>{expanded || !isLongText ? safeText : truncatedText}</span>
          {isLongText && (
            <button
              className="expand-text-btn"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <span>Show Less</span> <ChevronUp size={13} />
                </>
              ) : (
                <>
                  <span>Show More</span> <ChevronDown size={13} />
                </>
              )}
            </button>
          )}
        </div>

        {/* User Prompt Copy Button */}
        <button
          className="copy-btn user-copy-btn"
          onClick={() => onCopy(msgId, safeText)}
          title="Copy prompt"
          style={{ opacity: 0.8, color: 'rgba(255, 255, 255, 0.85)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px' }}
        >
          {isCopied ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

// Streaming Markdown component for smooth word-by-word/line-by-line ChatGPT response animation
function StreamingMarkdown({ text, isLatest }) {
  const [displayedText, setDisplayedText] = useState(isLatest ? '' : text);

  useEffect(() => {
    if (!isLatest) {
      setDisplayedText(text);
      return;
    }

    if (!text) {
      setDisplayedText('');
      return;
    }

    let idx = 0;
    const interval = setInterval(() => {
      if (idx < text.length) {
        const step = Math.min(text.length, idx + 5);
        setDisplayedText(text.slice(0, step));
        idx += 5;
      } else {
        setDisplayedText(text);
        clearInterval(interval);
      }
    }, 12);

    return () => clearInterval(interval);
  }, [text, isLatest]);

  return <ReactMarkdown>{displayedText}</ReactMarkdown>;
}

export default function ChatMessages({
  messages = [],
  loading = false,
  isSessionLoading = false,
  hasMore = false,
  totalCount = 0,
  onLoadMore,
  isLoadingMore = false,
  liveSteps = [],
  activePersona = null,
  onInspectModal,
  onSelectSuggestion,
  userHasScrolledUp = false,
  setUserHasScrolledUp,
  messagesEndRef
}) {
  const { user } = useAuth();
  const [copiedId, setCopiedId] = useState(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef(null);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const prevMessagesLengthRef = useRef(messages.length);

  // Force scroll to bottom on new prompt submission
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current && !isLoadingMore) {
      if (setUserHasScrolledUp) setUserHasScrolledUp(false);
      messagesEndRef?.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, isLoadingMore, setUserHasScrolledUp, messagesEndRef]);

  // Smart Auto-scroll during streaming: Only scroll down if user hasn't manually scrolled up
  useEffect(() => {
    if (!userHasScrolledUp && !isLoadingMore) {
      messagesEndRef?.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, liveSteps, userHasScrolledUp, isLoadingMore, messagesEndRef]);

  // Scroll detection to handle manual user scrolling and scrollbar visibility
  const handleScroll = (e) => {
    setIsScrolling(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 1000);

    // Detect if user manually scrolled up away from bottom (> 60px)
    const target = e.target;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 60;
    if (setUserHasScrolledUp) {
      setUserHasScrolledUp(!isAtBottom);
    }
  };

  const suggestions = [
    {
      icon: <Cpu size={18} color="#38bdf8" />,
      title: 'Design System Architecture',
      subtitle: 'Multi-agent debate on microservices, DBs & scalability'
    },
    {
      icon: <ShieldAlert size={18} color="#f43f5e" />,
      title: 'Audit Code & Security',
      subtitle: 'Identify vulnerabilities, race conditions & performance bugs'
    },
    {
      icon: <FileText size={18} color="#818cf8" />,
      title: 'Upload PDF Document Q&A',
      subtitle: 'Attach documents for context-aware Q&A and analysis'
    },
    {
      icon: <Zap size={18} color="#4ade80" />,
      title: 'Brainstorm Project Ideas',
      subtitle: 'Get curated fresher-to-pro CS project recommendations'
    }
  ];

  // ChatGPT Landing View: Only when messages list is completely empty AND not loading
  if (messages.length === 0 && !loading && !isSessionLoading) {
    return (
      <div className="hero-landing-container">
        <div className="hero-greeting">
          <h1 className="hero-title">
            {user ? `Welcome back, ${user.name.split(' ')[0]}` : 'What can I help with today?'}
          </h1>
          <p className="hero-subtitle">
            Sabha.ai uses specialized AI expert teams and dual verification to give you multi-perspective, verified answers.
          </p>
        </div>

        {/* Actionable Suggestion Cards */}
        <div className="suggestions-grid">
          {suggestions.map((s, idx) => (
            <div
              key={idx}
              className="suggestion-card"
              onClick={() => onSelectSuggestion(s.title)}
            >
              <div className="suggestion-icon">{s.icon}</div>
              <div className="suggestion-text">
                <div className="suggestion-title">{s.title}</div>
                <div className="suggestion-subtitle">{s.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Active Message Feed View with Rightmost Auto-Hiding Scrollbar
  return (
    <div
      className={`messages-feed-wrapper ${isScrolling ? 'scrolling-active' : ''}`}
      onScroll={handleScroll}
    >
      <div className="messages-container">
        {/* Instant Skeleton Loader when switching session */}
        {isSessionLoading ? (
          <ChatSkeletonLoader />
        ) : (
          <>
            {/* Load Earlier Messages Pagination Button (Batch by Batch, hides when finished) */}
            {hasMore && totalCount > messages.length && (totalCount - messages.length) > 0 && (
              <div className="load-more-wrapper">
                <button
                  className="load-more-btn"
                  onClick={onLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <>
                      <Sparkles size={14} className="spin-icon text-sky-400" />
                      <span>Loading earlier batch...</span>
                    </>
                  ) : (
                    <>
                      <History size={14} />
                      <span>Load Earlier Messages ({Math.max(0, totalCount - messages.length)} remaining)</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {messages.map((msg, index) => {
              const isLatestAi = msg.sender === 'ai' && index === messages.length - 1;

              return (
                <div
                  key={msg.id}
                  className={`message-bubble ${msg.sender === 'user' ? 'user-message' : 'ai-message'}`}
                >
                  {msg.sender === 'ai' && (
                    <div className="message-sender-header">
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Bot size={18} color="#38bdf8" />
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Sabha<span style={{ color: '#818cf8' }}>.ai</span></span>
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {msg.personas && msg.personas.length > 0 && (
                          <button
                            className="view-personas-badge-btn"
                            onClick={() => onInspectModal({ personas: msg.personas, transcript: msg.transcript, verification: msg.verification })}
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
                  )}

                  {/* Render User Prompts vs AI Rich Markdown Responses with Line-by-Line Streaming */}
                  {msg.sender === 'user' ? (
                    <ExpandableUserText
                      text={msg.text}
                      msgId={msg.id}
                      onCopy={handleCopy}
                      isCopied={copiedId === msg.id}
                    />
                  ) : isLatestAi && msg.isNew ? (
                    <div className="message-content markdown-body">
                      <StreamingMarkdown text={msg.text} isLatest={true} />
                    </div>
                  ) : (
                    <div className="message-content markdown-body">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Real-Time Live Thinking Process Card Stream */}
            {liveSteps && liveSteps.length > 0 && (
              <LiveThinkingCard
                steps={liveSteps}
                isFinished={!loading}
                activePersona={activePersona}
              />
            )}

            {/* Immediate Pulsing Loading Indicator Bubble if no steps yet */}
            {loading && (!liveSteps || liveSteps.length === 0) && (
              <div className="message-bubble ai-message">
                <div className="message-sender-header" style={{ marginBottom: '0.25rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Bot size={18} color="#38bdf8" />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Sabha<span style={{ color: '#818cf8' }}>.ai</span></span>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                  <Sparkles size={16} className="spin-icon" color="#38bdf8" />
                  Initializing multi-agent council...
                </div>
              </div>
            )}
          </>
        )}

        {/* Invisible Ref Anchor for Smooth Auto-Scroll */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
