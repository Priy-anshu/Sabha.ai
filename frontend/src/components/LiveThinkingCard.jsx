import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

// Line-by-line Typewriter Text component (Types out text line by line from left to right smoothly)
function LineByLineTypewriterText({ text, lineDelay = 40, charSpeed = 6 }) {
  const lines = React.useMemo(() => (text || '').split('\n'), [text]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);

  useEffect(() => {
    if (lines.length === 0) return;

    if (currentLineIndex < lines.length) {
      const targetLine = lines[currentLineIndex];
      if (currentCharIndex < targetLine.length) {
        const timer = setTimeout(() => {
          setCurrentCharIndex(prev => prev + 1);
        }, charSpeed);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setCurrentLineIndex(prev => prev + 1);
          setCurrentCharIndex(0);
        }, lineDelay);
        return () => clearTimeout(timer);
      }
    }
  }, [lines, currentLineIndex, currentCharIndex, charSpeed, lineDelay]);

  const renderedText = lines
    .slice(0, currentLineIndex + 1)
    .map((line, idx) => {
      if (idx < currentLineIndex) return line;
      return line.slice(0, currentCharIndex);
    })
    .join('\n');

  return <span>{renderedText}</span>;
}

// Clean title string of any emojis or string artifacts
function cleanTitle(title) {
  if (!title) return '';
  return title
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .trim();
}

export default function LiveThinkingCard({ steps = [], isFinished = false }) {
  // Hide thinking block completely when finished so only original response shows!
  if (isFinished || !steps || steps.length === 0) return null;

  return (
    <div className="live-thinking-container my-2.5 py-1.5 pl-3 border-l-2 border-sky-500/40 font-mono text-[11px] text-slate-500 space-y-2 transition-all">
      {steps.map((step, idx) => {
        const isLatestStep = idx === steps.length - 1;
        const formattedTitle = cleanTitle(step.title);

        return (
          <div key={idx} className="thinking-step-item leading-normal">
            {/* Header: Title on left, Timestamp on far right with clean spacing */}
            <div className="flex items-center justify-between gap-4 text-slate-400 font-normal">
              <span className="flex items-center gap-1.5 truncate">
                {isLatestStep && !isFinished && (
                  <Sparkles size={12} className="spin-icon text-sky-400 flex-shrink-0" />
                )}
                <span className="truncate">{formattedTitle}</span>
              </span>
              {step.timestamp && (
                <span className="text-[10px] text-slate-500 flex-shrink-0 font-normal ml-auto">
                  {step.timestamp}
                </span>
              )}
            </div>

            {/* Thinking detail with line-by-line typewriter */}
            {step.detail && (
              <div className="thinking-step-detail mt-1 pl-2 border-l border-slate-800/80 text-slate-500 font-normal text-[11px] leading-relaxed whitespace-pre-wrap">
                <LineByLineTypewriterText text={step.detail} charSpeed={6} lineDelay={40} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
