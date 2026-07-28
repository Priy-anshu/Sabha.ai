import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Brain, ChevronDown, ChevronUp } from 'lucide-react';

// Sanitize text by stripping markdown symbols (*, #, **, ###, etc.) and emojis, while preserving clean newlines
function sanitizeText(text) {
  if (!text) return '';
  return text
    .replace(/[\#\*\_~`]/g, '') // remove markdown symbols *, #, _, ~, `
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .trim();
}

// Line-by-Line Typewriter Text component with smooth character reveal and scroll sync
function LineByLineTypewriterText({ text, onUpdate }) {
  const lines = React.useMemo(() => {
    const sanitized = sanitizeText(text);
    return sanitized.split('\n').map(l => l.trim()).filter(Boolean);
  }, [text]);

  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);

  useEffect(() => {
    if (lines.length === 0) return;

    if (currentLineIndex < lines.length) {
      const targetLine = lines[currentLineIndex];
      if (currentCharIndex < targetLine.length) {
        const timer = setTimeout(() => {
          setCurrentCharIndex(prev => prev + 1);
          if (onUpdate) onUpdate();
        }, 8);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setCurrentLineIndex(prev => prev + 1);
          setCurrentCharIndex(0);
          if (onUpdate) onUpdate();
        }, 30);
        return () => clearTimeout(timer);
      }
    }
  }, [lines, currentLineIndex, currentCharIndex, onUpdate]);

  const renderedLines = lines.slice(0, currentLineIndex + 1).map((line, idx) => {
    if (idx < currentLineIndex) return line;
    return line.slice(0, currentCharIndex);
  });

  return (
    <div className="line-typewriter-wrapper">
      {renderedLines.map((l, i) => (
        <div key={i} className="typewriter-line">
          {l}
        </div>
      ))}
    </div>
  );
}

export default function LiveThinkingCard({ steps = [], isFinished = false }) {
  const [collapsed, setCollapsed] = useState(false);
  const scrollBoxRef = useRef(null);

  const handleSmoothScroll = useCallback(() => {
    if (scrollBoxRef.current) {
      scrollBoxRef.current.scrollTo({
        top: scrollBoxRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  // Auto-scroll to bottom of thinking box as new steps arrive
  useEffect(() => {
    handleSmoothScroll();
  }, [steps, handleSmoothScroll]);

  if (isFinished || !steps || steps.length === 0) return null;

  return (
    <div className="live-thinking-box-card">
      {/* Box Header Bar */}
      <div 
        className="thinking-box-header"
        onClick={() => setCollapsed(!collapsed)}
        title="Click to toggle reasoning log view"
      >
        <div className="thinking-box-title">
          <Brain size={14} className="text-sky-400 animate-pulse" />
          <span>Live Multi-Agent Reasoning</span>
          <span className="thinking-step-count">({steps.length} steps)</span>
        </div>

        <div className="thinking-box-actions">
          {!isFinished && <Sparkles size={13} className="spin-icon text-sky-400" />}
          <button className="thinking-toggle-btn">
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Expandable Scrollable Content Box */}
      {!collapsed && (
        <div className="thinking-box-body" ref={scrollBoxRef}>
          {steps.map((step, idx) => {
            const isLatestStep = idx === steps.length - 1;
            const cleanTitleText = sanitizeText(step.title);

            return (
              <div key={idx} className={`thinking-log-item ${isLatestStep ? 'active-step' : ''}`}>
                <div className="thinking-log-title-row">
                  <span className="thinking-dot"></span>
                  <span className="thinking-log-title">{cleanTitleText}</span>
                  {step.timestamp && <span className="thinking-log-time">{step.timestamp}</span>}
                </div>

                {step.detail && (
                  <div className="thinking-log-detail">
                    {isLatestStep ? (
                      <LineByLineTypewriterText text={step.detail} onUpdate={handleSmoothScroll} />
                    ) : (
                      <div className="line-typewriter-wrapper">
                        {sanitizeText(step.detail)
                          .split('\n')
                          .map(l => l.trim())
                          .filter(Boolean)
                          .map((l, i) => (
                            <div key={i} className="typewriter-line">{l}</div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
