import React, { useState, useEffect } from 'react';

// Line-by-line Typewriter Text component (Types out text line by line from left to right smoothly)
function LineByLineTypewriterText({ text, lineDelay = 60, charSpeed = 8 }) {
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

export default function LiveThinkingCard({ steps = [], isFinished = false }) {
  // If debate is finished, hide the thinking block completely so only original output shows!
  if (isFinished || !steps || steps.length === 0) return null;

  return (
    <div className="live-thinking-container my-2 p-2 rounded-md bg-transparent text-slate-400/80 font-mono text-[9px] sm:text-[10px] font-thin leading-normal tracking-tight space-y-2 opacity-85 transition-all">
      {steps.map((step, idx) => (
        <div key={idx} className="thinking-step-item">
          <div className="flex items-center justify-between text-slate-400/90 font-extralight text-[9px] uppercase tracking-wider">
            <span>{step.title}</span>
            {step.timestamp && <span className="text-[8px] text-slate-600 font-extralight">{step.timestamp}</span>}
          </div>
          {step.detail && (
            <div className="thinking-step-detail mt-0.5 pl-2 border-l border-slate-800/60 text-slate-500/90 font-thin text-[9px] sm:text-[10px] leading-relaxed whitespace-pre-wrap">
              <LineByLineTypewriterText text={step.detail} charSpeed={6} lineDelay={40} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
