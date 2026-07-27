import React, { useState } from 'react';
import { Users, X, ShieldCheck, ShieldAlert, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function InspectionModal({ modalData, onClose }) {
  const [showDiscussion, setShowDiscussion] = useState(false);

  if (!modalData) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content inspection-modal" onClick={e => e.stopPropagation()}>
        {/* Fixed Header Bar with Sticky Close X Button */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="#38bdf8" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
              Sabha<span style={{ color: '#818cf8' }}>.ai</span> Council & Verification Audit
            </h3>
          </div>
          <button className="close-modal-btn" onClick={onClose} title="Close window">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Dual Verifier Audit Section */}
          {modalData.verification && modalData.verification.verifiers && modalData.verification.verifiers.length > 0 && (
            <div style={{ marginBottom: '1.25rem', background: 'rgba(74, 222, 128, 0.1)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4ade80', fontWeight: 700, marginBottom: '0.5rem' }}>
                <ShieldCheck size={18} />
                <span>Dual Verification Audit Passed</span>
              </div>
              {modalData.verification.verifiers.map((v, idx) => (
                <div key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '0.4rem' }}>
                  <strong>{v.name}:</strong> <span style={{ color: '#4ade80', fontWeight: 600 }}>{v.status}</span>
                </div>
              ))}
            </div>
          )}

          {/* Allocated Personas Section */}
          <h4 style={{ color: '#38bdf8', marginTop: 0, marginBottom: '0.75rem' }}>
            👥 Allocated Personas ({modalData.personas ? modalData.personas.length : 0})
          </h4>
          {modalData.personas && modalData.personas.map((p, idx) => (
            <div key={p.id || idx} className="persona-card">
              <div className="persona-card-header">
                <span className="persona-badge">Persona {idx + 1}</span>
                <span className="persona-name">{p.name}</span>
              </div>
              <div className="persona-detail">
                <strong>Role:</strong> {p.role}
              </div>
              <div className="persona-detail mindset">
                <ShieldAlert size={14} color="#f43f5e" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span><strong>Critical Mindset:</strong> {p.mindset}</span>
              </div>
            </div>
          ))}

          {/* Toggle View Discussion Button & Transcript Section */}
          {modalData.transcript && modalData.transcript.length > 0 && (
            <>
              <button
                className="view-discussion-btn"
                onClick={() => setShowDiscussion(!showDiscussion)}
              >
                <MessageCircle size={16} />
                <span>{showDiscussion ? 'Hide Persona Discussion' : 'View Full Persona Discussion'}</span>
                {showDiscussion ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showDiscussion && (
                <div className="transcript-discussion-container" style={{ marginTop: '1rem' }}>
                  <h4 style={{ color: '#818cf8', marginBottom: '0.75rem' }}>💬 Full Persona Debate Discussion</h4>
                  {modalData.transcript.map((t, idx) => (
                    <div key={idx} className="persona-card" style={{ borderLeft: '4px solid #818cf8' }}>
                      <div className="persona-card-header">
                        <MessageCircle size={16} color="#818cf8" />
                        <span className="persona-name">{t.personaName}</span>
                      </div>
                      <div className="persona-detail markdown-body" style={{ marginTop: '0.4rem' }}>
                        <ReactMarkdown>{t.output}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
