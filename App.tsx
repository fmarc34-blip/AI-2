
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { VoiceMode } from './components/VoiceMode';
import { MemoryEditor } from './components/MemoryEditor';
import { ChatSession, Message, ModelType, MemoryEntry } from './types';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState<ModelType>('AI-2');
  const [memories, setMemories] = useState<MemoryEntry[]>([]);

  // Load history and memories
  useEffect(() => {
    const savedSessions = localStorage.getItem('ai2_sessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
        if (parsed.length > 0) setCurrentSessionId(parsed[0].id);
      } catch (e) { console.error(e); }
    }

    const savedMemories = localStorage.getItem('ai2_memories');
    if (savedMemories) {
      try { setMemories(JSON.parse(savedMemories)); } catch (e) { console.error(e); }
    }
  }, []);

  // Save changes
  useEffect(() => {
    localStorage.setItem('ai2_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('ai2_memories', JSON.stringify(memories));
  }, [memories]);

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

  const handleUpdateMemory = (newMemories: MemoryEntry[]) => {
    setMemories(newMemories);
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
        onEditMemory={() => setIsMemoryOpen(true)}
      />
      
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <ChatInterface
          session={currentSession}
          onSendMessage={addMessage}
          isVoiceMode={isVoiceMode}
          setIsVoiceMode={setIsVoiceMode}
          model={currentModel}
          memories={memories}
          onAutoMemory={(content) => {
            const newEntry: MemoryEntry = { id: uuidv4(), content, timestamp: Date.now() };
            setMemories(prev => [newEntry, ...prev]);
          }}
        />
        
        {isVoiceMode && (
          <VoiceMode 
            onClose={() => setIsVoiceMode(false)}
            model={currentModel}
            onMessageResponse={addMessage}
          />
        )}

        {isMemoryOpen && (
          <MemoryEditor 
            memories={memories} 
            onUpdate={handleUpdateMemory} 
            onClose={() => setIsMemoryOpen(false)} 
          />
        )}
      </main>
    </div>
  );
};

export default App;
