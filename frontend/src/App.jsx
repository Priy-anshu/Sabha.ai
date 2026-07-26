import React, { useState, useEffect } from 'react';
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
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Har Har Mahadev! Welcome to Sabha.ai — your Multi-Agent Consensus & Verification Platform. Ask any question to launch an AI debate!',
      personas: [],
      transcript: [],
      verification: null
    }
  ]);
  const [activePersonas, setActivePersonas] = useState([]);
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [modalData, setModalData] = useState(null);

  // Fetch sidebar sessions list (only for authenticated users)
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
    const newId = 'sess_' + Date.now();
    setSessionId(newId);
    setMessages([]);
    setActivePersonas([]);
    setAttachedFile(null);
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

  const handleSend = async () => {
    if ((!input.trim() && !attachedFile) || loading) return;

    const userText = attachedFile
      ? `📎 [Attached: ${attachedFile.name}] ${input}`
      : input;

    const userMsg = { id: String(Date.now()), sender: 'user', text: userText };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    const currentInput = input;
    const currentFile = attachedFile;
    setInput('');
    setAttachedFile(null);
    setLoading(true);

    try {
      const debateData = await sendDebatePrompt({
        prompt: currentInput,
        file: currentFile,
        existingPersonas: activePersonas,
        sessionId
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

        // Save session history to MongoDB Atlas if user is authenticated
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
      setMessages(prev => [
        ...prev,
        { id: String(Date.now() + 1), sender: 'ai', text: 'Failed to connect to Sabha.ai backend debate service.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Component (Only rendered for logged-in users) */}
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
      <div className="main-chat-area">
        <ChatHeader onOpenAuthModal={() => setShowAuthModal(true)} />

        <ChatMessages
          messages={messages}
          loading={loading}
          onInspectModal={setModalData}
        />

        <ChatInput
          input={input}
          setInput={setInput}
          attachedFile={attachedFile}
          setAttachedFile={setAttachedFile}
          loading={loading}
          onSend={handleSend}
          onOpenAuthModal={() => setShowAuthModal(true)}
        />
      </div>

      {/* Auth Pop-Up Modal */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {/* Persona Inspection & Debate Transcript Pop-Up Modal */}
      {modalData && <InspectionModal modalData={modalData} onClose={() => setModalData(null)} />}
    </div>
  );
}
