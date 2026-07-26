import React from 'react';
import { Users, X, ShieldCheck, ShieldAlert, MessageCircle } from 'lucide-react';

export default function InspectionModal({ modalData, onClose }) {
  if (!modalData) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="#38bdf8" />
            <h3 style={{ margin: 0 }}>Sabha.ai Council & Verification Audit</h3>
          </div>
          <button className="close-modal-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Dual Verifier Audit Section */}
          {modalData.verification && modalData.verification.verifiers && modalData.verification.verifiers.length > 0 && (
            <div style={{ marginBottom: '1rem', background: 'rgba(74, 222, 128, 0.1)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4ade80', fontWeight: 700, marginBottom: '0.5rem' }}>
                <ShieldCheck size={18} />
                <span>Step C: Dual-Persona Verification Audit Passed</span>
              </div>
              {modalData.verification.verifiers.map((v, idx) => (
                <div key={idx} style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: '0.4rem' }}>
                  <strong>{v.name}:</strong> <span style={{ color: '#4ade80' }}>{v.status}</span>
                </div>
              ))}
            </div>
          )}

          {/* Allocated Personas Section */}
          <h4 style={{ color: '#38bdf8', marginTop: 0 }}>👥 Allocated Personas ({modalData.personas.length})</h4>
          {modalData.personas.map((p, idx) => (
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

          {/* Debate Transcript Highlights */}
          {modalData.transcript && modalData.transcript.length > 0 && (
            <>
              <h4 style={{ color: '#818cf8', marginTop: '1.5rem' }}>💬 Step B Debate Transcript Highlights</h4>
              {modalData.transcript.map((t, idx) => (
                <div key={idx} className="persona-card" style={{ borderLeft: '4px solid #818cf8' }}>
                  <div className="persona-card-header">
                    <MessageCircle size={16} color="#818cf8" />
                    <span className="persona-name">{t.personaName}</span>
                  </div>
                  <div className="persona-detail" style={{ whiteSpace: 'pre-wrap', marginTop: '0.4rem' }}>
                    {t.output}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
