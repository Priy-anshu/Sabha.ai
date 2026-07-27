import React, { useState, useEffect } from 'react';

// Smooth Typewriter Text component that types out streaming text smoothly
function SmoothTypewriterText({ text, speed = 15 }) {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      return;
    }

    // If text is short or already rendered, update directly
    if (text.length <= displayedText.length) {
      setDisplayedText(text);
      return;
    }

    let i = displayedText.length;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(prev => text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return <span>{displayedText}</span>;
}

export default function LiveThinkingCard({ steps = [], isFinished = false }) {
  // If debate is finished, hide the thinking block completely so only original output shows!
  if (isFinished || !steps || steps.length === 0) return null;

  return (
    <div className="live-thinking-container my-3 p-3 rounded-lg border border-slate-800/80 bg-slate-950/40 font-mono text-[11px] sm:text-xs text-slate-400 space-y-2.5 transition-all">
      {steps.map((step, idx) => (
        <div key={idx} className="thinking-step-item leading-relaxed">
          <div className="flex items-center justify-between text-slate-400 font-normal">
            <span>{step.title}</span>
            {step.timestamp && <span className="text-[9px] text-slate-600 font-normal">{step.timestamp}</span>}
          </div>
          {step.detail && (
            <div className="thinking-step-detail mt-1 pl-2 border-l border-slate-800 text-slate-500 font-normal text-[11px] leading-normal whitespace-pre-wrap">
              <SmoothTypewriterText text={step.detail} speed={12} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
