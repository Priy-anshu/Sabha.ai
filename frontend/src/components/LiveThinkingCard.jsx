import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Brain, CheckCircle2, Loader2, Users, ShieldCheck, Sparkles } from 'lucide-react';

export default function LiveThinkingCard({ steps = [], isFinished = false, activePersona = null }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-collapse when finished
  useEffect(() => {
    if (isFinished) {
      const timer = setTimeout(() => setIsCollapsed(true), 800);
      return () => clearTimeout(timer);
    } else {
      setIsCollapsed(false);
    }
  }, [isFinished]);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="live-thinking-card glass-panel my-4 overflow-hidden border border-indigo-500/30 rounded-xl transition-all duration-300">
      {/* Header Banner */}
      <div 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between px-4 py-3 bg-slate-900/60 backdrop-blur-md cursor-pointer hover:bg-slate-800/60 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Brain className={`w-5 h-5 ${isFinished ? 'text-emerald-400' : 'text-indigo-400 animate-pulse'}`} />
            {!isFinished && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
              </span>
            )}
          </div>
          <span className="text-sm font-semibold tracking-wide text-slate-200">
            {isFinished ? 'Council Decision Process (Completed)' : 'Sabha AI Council Deliberating...'}
          </span>
          {activePersona && !isFinished && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Active: {activePersona}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isFinished ? (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Consensus Reached
            </span>
          ) : (
            <span className="text-xs text-indigo-300 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin text-indigo-400" /> Live Stream
            </span>
          )}
          <button className="text-slate-400 hover:text-white p-1">
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Collapsible Steps List */}
      {!isCollapsed && (
        <div className="p-4 bg-slate-950/40 space-y-3 text-xs sm:text-sm">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3 animate-fadeIn">
              <div className="mt-0.5">
                {step.status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : step.status === 'in_progress' ? (
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-600 flex-shrink-0" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${step.status === 'completed' ? 'text-slate-200' : 'text-indigo-300'}`}>
                    {step.title}
                  </span>
                  {step.timestamp && <span className="text-[10px] text-slate-500">{step.timestamp}</span>}
                </div>
                {step.detail && (
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed whitespace-pre-line font-mono bg-slate-900/40 p-2 rounded border border-slate-800/60">
                    {step.detail}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
