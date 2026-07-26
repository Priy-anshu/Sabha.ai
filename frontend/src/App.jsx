import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar.jsx';
import ChatHeader from './components/ChatHeader.jsx';
import ChatMessages from './components/ChatMessages.jsx';
import ChatInput from './components/ChatInput.jsx';
import AuthModal from './components/AuthModal.jsx';
import InspectionModal from './components/InspectionModal.jsx';
import { getSessions, getSessionById, saveSession, deleteSession } from './api/sessionApi.js';
import { sendDebatePrompt } from './api/chatApi.js';
import { useAuth } from './context/AuthContext.jsx';

export default function App() {
  const { user, token } = useAuth();
  const [sessionId, setSessionId] = useState(() => 'sess_' + Date.now());
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activePersonas, setActivePersonas] = useState([]);
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [modalData, setModalData] = useState(null);

  const abortControllerRef = useRef(null);

  const fetchSessionsList = async () => {
    if (!user) return;
    try {
      const data = await getSessions();
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.warn('Failed to load sessions:', err.message);
    }
  };

  useEffect(() => {
    fetchSessionsList();
  }, [user, token]);

  const handleNewChat = () => {
    if (loading && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const newId = 'sess_' + Date.now();
    setSessionId(newId);
    setMessages([]);
    setActivePersonas([]);
    setAttachedFile(null);
    setLoading(false);
  };

  const handleSelectSession = async (sId) => {
    try {
      const data = await getSessionById(sId);
      if (data.success && data.session) {
        setSessionId(data.session.sessionId);
        setMessages(data.session.messages || []);
        setActivePersonas(data.session.activePersonas || []);
      }
    } catch (err) {
      console.error('Error loading session:', err.message);
    }
  };

  const handleDeleteSession = async (e, sId) => {
    e.stopPropagation();
    try {
      await deleteSession(sId);
      if (sId === sessionId) {
        handleNewChat();
      }
      fetchSessionsList();
    } catch (err) {
      console.error('Failed to delete session:', err.message);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setMessages(prev => [
      ...prev,
      { id: String(Date.now() + 1), sender: 'ai', text: '⏹️ Generation stopped by user.', personas: activePersonas }
    ]);
  };

  const handleSend = async (customPrompt) => {
    const promptToSend = customPrompt || input;
    if ((!promptToSend.trim() && !attachedFile) || loading) return;

    const userText = attachedFile
      ? `📎 [Attached: ${attachedFile.name}] ${promptToSend}`
      : promptToSend;

    const userMsg = { id: String(Date.now()), sender: 'user', text: userText };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    const currentInput = promptToSend;
    const currentFile = attachedFile;
    setInput('');
    setAttachedFile(null);
    setLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const debateData = await sendDebatePrompt({
        prompt: currentInput,
        file: currentFile,
        existingPersonas: activePersonas,
        sessionId,
        signal: controller.signal
      });

      if (debateData.success) {
        setActivePersonas(debateData.personas);
        const aiMsg = {
          id: String(Date.now() + 1),
          sender: 'ai',
          text: debateData.response,
          personas: debateData.personas,
          transcript: debateData.transcript,
          verification: debateData.verification
        };
        const finalMessages = [...updatedMessages, aiMsg];
        setMessages(finalMessages);

        if (user) {
          await saveSession({
            sessionId,
            activePersonas: debateData.personas,
            messages: finalMessages
          });
          fetchSessionsList();
        }
      } else {
        setMessages(prev => [
          ...prev,
          { id: String(Date.now() + 1), sender: 'ai', text: `Error: ${debateData.error}`, personas: activePersonas }
        ]);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Generation request cleanly aborted by user.');
      } else {
        setMessages(prev => [
          ...prev,
          { id: String(Date.now() + 1), sender: 'ai', text: 'Failed to connect to Sabha.ai backend debate service.' }
        ]);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const isNewChat = messages.length === 0;

  return (
    <div className="app-container">
      {/* Sidebar Component */}
      {user && (
        <Sidebar
          sessions={sessions}
          sessionId={sessionId}
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
          onOpenAuthModal={() => setShowAuthModal(true)}
        />
      )}

      {/* Main Chat Content Area */}
      <div className={`main-chat-area ${isNewChat ? 'new-chat-mode' : ''}`}>
        <ChatHeader onOpenAuthModal={() => setShowAuthModal(true)} />

        <ChatMessages
          messages={messages}
          loading={loading}
          onInspectModal={setModalData}
          onSelectSuggestion={(suggestionText) => {
            setInput(suggestionText);
          }}
        />

        <div className={`input-wrapper-container ${isNewChat ? 'centered-input-wrapper' : ''}`}>
          <ChatInput
            input={input}
            setInput={setInput}
            attachedFile={attachedFile}
            setAttachedFile={setAttachedFile}
            loading={loading}
            onSend={() => handleSend()}
            onStop={handleStop}
            onOpenAuthModal={() => setShowAuthModal(true)}
          />
        </div>
      </div>

      {/* Auth Pop-Up Modal */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {/* Persona Inspection & Debate Transcript Pop-Up Modal */}
      {modalData && <InspectionModal modalData={modalData} onClose={() => setModalData(null)} />}
    </div>
  );
}
