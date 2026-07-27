import React, { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, Search, Check, X, ChevronDown } from 'lucide-react';

export const BEHAVIOR_OPTIONS = [
  { id: 'no_sugarcoating', label: 'No Sugarcoating', desc: 'Blunt, direct & unfiltered' },
  { id: 'strict', label: 'Strict & Rigorous', desc: 'High standards, calls out fallacies' },
  { id: 'analytical', label: 'Analytical', desc: 'Clinical, data-driven & objective' },
  { id: 'first_principles', label: 'First Principles', desc: 'Deconstructs down to fundamental truths' },
  { id: 'devils_advocate', label: "Devil's Advocate", desc: 'Challenges ideas & finds hidden risks' },
  { id: 'skeptical', label: 'Skeptical', desc: 'Questions assumptions & demands proof' },
  { id: 'edge_case_obsessed', label: 'Edge-Case Obsessed', desc: 'Focuses on failure modes & vulnerabilities' },
  { id: 'security_focused', label: 'Security & Privacy First', desc: 'Prioritizes safety, encryption & zero trust' },
  { id: 'pragmatic', label: 'Pragmatic & Minimalist', desc: 'Focuses on clean, simple real-world execution' },
  { id: 'code_purist', label: 'Code Purist', desc: 'Strict software design patterns & clean code' },
  { id: 'concise', label: 'Ultra-Concise', desc: 'Short bullet points with zero fluff' },
  { id: 'system_architect', label: 'System Architect', desc: 'Focuses on high-level scale & infrastructure' },
  { id: 'friendly', label: 'Friendly & Warm', desc: 'Encouraging, polite & reassuring' },
  { id: 'mentor', label: 'Mentor / Teacher', desc: 'Educational with clear real-world analogies' },
  { id: 'socratic', label: 'Socratic Method', desc: 'Asks guiding questions to provoke deep thought' },
  { id: 'creative', label: 'Creative & Visionary', desc: 'Out-of-the-box brainstorming & ideas' },
  { id: 'serious', label: 'Serious & Professional', desc: 'Formal, executive corporate tone' },
  { id: 'sarcastic', label: 'Witty & Sarcastic', desc: 'Dry humor paired with accurate answers' }
];

export default function AgentBehaviorDropdown({ selectedBehaviors = [], onChangeBehaviors }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleBehavior = (id) => {
    if (selectedBehaviors.includes(id)) {
      onChangeBehaviors(selectedBehaviors.filter(b => b !== id));
    } else {
      onChangeBehaviors([...selectedBehaviors, id]);
    }
  };

  const handleClearAll = () => {
    onChangeBehaviors([]);
  };

  const filteredOptions = BEHAVIOR_OPTIONS.filter(opt =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opt.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = selectedBehaviors.length;

  return (
    <div className="behavior-dropdown-wrapper" ref={dropdownRef}>
      {/* Header Trigger Pill */}
      <button
        type="button"
        className={`behavior-trigger-btn ${activeCount > 0 ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Customize Agent Behaviors & Tone"
      >
        <SlidersHorizontal size={15} color={activeCount > 0 ? '#38bdf8' : 'currentColor'} />
        <span className="trigger-label">
          {activeCount > 0 ? `Agent Behavior (${activeCount})` : 'Agent Behavior'}
        </span>
        <ChevronDown size={14} className={`chevron-icon ${isOpen ? 'open' : ''}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="behavior-popover-menu">
          <div className="popover-header">
            <div className="popover-title">
              <span>Agent Behaviors</span>
              {activeCount > 0 && (
                <button type="button" className="clear-behaviors-btn" onClick={handleClearAll}>
                  Clear ({activeCount})
                </button>
              )}
            </div>

            {/* Search Input Bar */}
            <div className="behavior-search-wrapper">
              <Search size={14} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search behavior or tone..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button type="button" className="clear-search-btn" onClick={() => setSearchQuery('')}>
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Behavior List */}
          <div className="behavior-options-list">
            {filteredOptions.length === 0 ? (
              <div className="no-behavior-found">No behaviors match "{searchQuery}"</div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = selectedBehaviors.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    className={`behavior-item-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleBehavior(opt.id)}
                  >
                    <div className={`checkbox-box ${isSelected ? 'checked' : ''}`}>
                      {isSelected && <Check size={12} color="#ffffff" />}
                    </div>
                    <div className="behavior-item-text">
                      <span className="behavior-label">{opt.label}</span>
                      <span className="behavior-desc">{opt.desc}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
