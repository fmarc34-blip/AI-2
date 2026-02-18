
import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { VoiceMode } from './components/VoiceMode';
import { ChatSession, Message, ModelType } from './types';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [currentModel, setCurrentModel] = useState<ModelType>('AI-2');

  // Load history
  useEffect(() => {
    const saved = localStorage.getItem('ai2_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0) setCurrentSessionId(parsed[0].id);
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history
  useEffect(() => {
    localStorage.setItem('ai2_sessions', JSON.stringify(sessions));
  }, [sessions]);

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: uuidv4(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const addMessage = (msg: Message) => {
    if (!currentSessionId) {
      const newSession: ChatSession = {
        id: uuidv4(),
        title: msg.content.substring(0, 30) || 'New Chat',
        messages: [msg],
        createdAt: Date.now(),
      };
      setSessions([newSession, ...sessions]);
      setCurrentSessionId(newSession.id);
      return;
    }

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        const updatedMessages = [...s.messages, msg];
        let newTitle = s.title;
        if (s.messages.length === 0) {
          newTitle = msg.content.substring(0, 30) || 'New Conversation';
        }
        return { ...s, messages: updatedMessages, title: newTitle };
      }
      return s;
    }));
  };

  return (
    <div className="flex h-screen bg-white text-slate-800">
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onNewChat={createNewChat}
        currentModel={currentModel}
        onModelChange={setCurrentModel}
      />
      
      <main className={`flex-1 flex flex-col relative transition-all duration-300 ${isSidebarOpen ? 'ml-0' : 'ml-0'}`}>
        <ChatInterface
          session={currentSession}
          onSendMessage={addMessage}
          isVoiceMode={isVoiceMode}
          setIsVoiceMode={setIsVoiceMode}
          model={currentModel}
        />
        
        {isVoiceMode && (
          <VoiceMode 
            onClose={() => setIsVoiceMode(false)}
            model={currentModel}
            onMessageResponse={addMessage}
          />
        )}
      </main>
    </div>
  );
};

export default App;
