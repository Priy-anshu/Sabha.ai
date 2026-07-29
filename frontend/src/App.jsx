import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import Sidebar from './components/Sidebar.jsx';
import ChatHeader from './components/ChatHeader.jsx';
import ChatMessages from './components/ChatMessages.jsx';
import ChatInput from './components/ChatInput.jsx';
import AuthModal from './components/AuthModal.jsx';
import InspectionModal from './components/InspectionModal.jsx';
import { getSessions, getSessionById, saveSession, deleteSession } from './api/sessionApi.js';
import { sendDebatePrompt, sendDebatePromptStream } from './api/chatApi.js';
import { useAuth } from './context/AuthContext.jsx';

export default function App() {
  const { user, token } = useAuth();
  const [sessionId, setSessionId] = useState(() => 'sess_' + Date.now());
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activePersonas, setActivePersonas] = useState([]);
  const [liveSteps, setLiveSteps] = useState([]);
  const [activePersona, setActivePersona] = useState(null);
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [modalData, setModalData] = useState(null);

  // Instant Loading & Pagination States
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [totalMessageCount, setTotalMessageCount] = useState(0);
  const [messageOffset, setMessageOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);

  const messagesEndRef = useRef(null);

  // Agent Behaviors State
  const [selectedBehaviors, setSelectedBehaviors] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedBehaviors');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleUpdateBehaviors = (newBehaviors) => {
    setSelectedBehaviors(newBehaviors);
    localStorage.setItem('selectedBehaviors', JSON.stringify(newBehaviors));
  };

  // Collapsible Sidebar State (defaults to true for desktop, false for mobile)
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);

  // Theme State
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleToggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

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
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      }
    };
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!user) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setSessions([]);
      setMessages([]);
      setActivePersonas([]);
      setAttachedFile(null);
      setInput('');
      setSelectedBehaviors([]);
      setModalData(null);
      setLoading(false);
      setSessionId('sess_' + Date.now());
      setSidebarOpen(false);
    } else {
      fetchSessionsList();
      if (window.innerWidth > 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    }
  }, [user, token]);

  const handleNewChat = () => {
    if (loading && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const newId = 'sess_' + Date.now();
    setSessionId(newId);
    setMessages([]);
    setActivePersonas([]);
    setLiveSteps([]);
    setActivePersona(null);
    setAttachedFile(null);
    setLoading(false);
    setIsSessionLoading(false);
    setHasMoreMessages(false);
    setMessageOffset(0);
    setUserHasScrolledUp(false);
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  const handleSelectSession = async (sId) => {
    if (loading && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
    // Instant 0ms UI Feedback: Immediately highlight session and display Skeleton Loader
    setSessionId(sId);
    setMessages([]);
    setActivePersonas([]);
    setLiveSteps([]);
    setActivePersona(null);
    setIsSessionLoading(true);
    setHasMoreMessages(false);
    setMessageOffset(0);
    setUserHasScrolledUp(false);

    try {
      const data = await getSessionById(sId, 15, 0);
      if (data.success && data.session) {
        setMessages(data.session.messages || []);
        setActivePersonas(data.session.activePersonas || []);
        setHasMoreMessages(data.session.hasMore || false);
        setTotalMessageCount(data.session.totalCount || 0);
      }
    } catch (err) {
      console.error('Error loading session:', err.message);
    } finally {
      setIsSessionLoading(false);
    }
  };

  const handleLoadMoreMessages = async () => {
    if (isLoadingMore || !hasMoreMessages) return;
    const nextOffset = messageOffset + 15;
    setIsLoadingMore(true);
    try {
      const data = await getSessionById(sessionId, 15, nextOffset);
      if (data.success && data.session) {
        const olderMessages = data.session.messages || [];
        setMessages(prev => {
          const combined = [...olderMessages, ...prev];
          const seen = new Set();
          return combined.filter(m => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
          });
        });
        const currentTotalCount = data.session.totalCount || totalMessageCount;
        const newTotalFetched = nextOffset + olderMessages.length;
        setHasMoreMessages(data.session.hasMore && newTotalFetched < currentTotalCount);
        setMessageOffset(nextOffset);
      }
    } catch (err) {
      console.error('Error loading earlier messages:', err.message);
    } finally {
      setIsLoadingMore(false);
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
    setLiveSteps([]);
    setActivePersona(null);
    setLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let isStreamFinished = false;

      await sendDebatePromptStream({
        prompt: currentInput,
        file: currentFile,
        existingPersonas: activePersonas,
        behaviors: selectedBehaviors,
        sessionId,
        signal: controller.signal,
        onEvent: async (event) => {
          if (event.type === 'status' || event.type === 'debate_step' || event.type === 'personas_allocated') {
            setLiveSteps(prev => [
              ...prev,
              {
                title: event.title,
                detail: event.detail,
                status: event.status || 'in_progress',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);
            if (event.activePersona) setActivePersona(event.activePersona);
          }

          if (event.type === 'personas_allocated' && event.personas) {
            setActivePersonas(event.personas);
          }

          if (event.type === 'done') {
            isStreamFinished = true;
            setActivePersonas(event.personas);
            const aiMsg = {
              id: String(Date.now() + 1),
              sender: 'ai',
              text: event.response,
              personas: event.personas,
              transcript: event.transcript,
              verification: event.verification,
              isNew: true
            };
            const finalMessages = [...updatedMessages, aiMsg];
            setMessages(finalMessages);

            if (user) {
              await saveSession({
                sessionId,
                activePersonas: event.personas,
                messages: finalMessages
              });
              fetchSessionsList();
            }
          }
        }
      });

      if (!isStreamFinished) {
        // Fallback to standard request if stream didn't receive done event
        const debateData = await sendDebatePrompt({
          prompt: currentInput,
          file: currentFile,
          existingPersonas: activePersonas,
          behaviors: selectedBehaviors,
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
        }
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
      {/* Sidebar Component with Mobile Backdrop Overlay */}
      {user && (
        <>
          {sidebarOpen && (
            <div className="mobile-sidebar-backdrop" onClick={handleToggleSidebar} />
          )}
          {sidebarOpen && (
            <Sidebar
              sessions={sessions}
              sessionId={sessionId}
              sidebarOpen={sidebarOpen}
              onToggleSidebar={handleToggleSidebar}
              onNewChat={handleNewChat}
              onSelectSession={handleSelectSession}
              onDeleteSession={handleDeleteSession}
              onOpenAuthModal={() => setShowAuthModal(true)}
            />
          )}
        </>
      )}

      {/* Main Chat Content Area */}
      <div className={`main-chat-area ${isNewChat ? 'new-chat-mode' : ''}`}>
        <ChatHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={handleToggleSidebar}
          onOpenAuthModal={() => setShowAuthModal(true)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          selectedBehaviors={selectedBehaviors}
          onUpdateBehaviors={handleUpdateBehaviors}
        />

        <ChatMessages
          messages={messages}
          loading={loading}
          isSessionLoading={isSessionLoading}
          hasMore={hasMoreMessages}
          totalCount={totalMessageCount}
          onLoadMore={handleLoadMoreMessages}
          isLoadingMore={isLoadingMore}
          liveSteps={liveSteps}
          activePersona={activePersona}
          onInspectModal={setModalData}
          onSelectSuggestion={(suggestionText) => {
            setInput(suggestionText);
          }}
          userHasScrolledUp={userHasScrolledUp}
          setUserHasScrolledUp={setUserHasScrolledUp}
          messagesEndRef={messagesEndRef}
        />

        <div className={`input-wrapper-container ${isNewChat ? 'centered-input-wrapper' : ''}`}>
          {userHasScrolledUp && !isNewChat && !isSessionLoading && (
            <button
              className="scroll-bottom-btn-centered"
              title="Scroll to latest output"
              onClick={() => {
                setUserHasScrolledUp(false);
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <ChevronDown size={15} />
              <span>Scroll to latest</span>
            </button>
          )}

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
