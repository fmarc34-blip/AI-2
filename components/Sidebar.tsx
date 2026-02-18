
import React from 'react';
import { ChatSession, ModelType } from '../types';
import { 
  Plus, 
  MessageSquare, 
  PanelLeftClose, 
  PanelLeft, 
  Settings,
  ShieldCheck,
  Zap,
  BrainCircuit
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  currentModel: ModelType;
  onModelChange: (model: ModelType) => void;
  onEditMemory: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  setIsOpen,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  currentModel,
  onModelChange,
  onEditMemory
}) => {
  const Logo = () => (
    <div className="flex items-center gap-3 p-2 mb-6">
      <div className="relative w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm overflow-hidden group">
        <div className="absolute inset-0 bg-blue-50/50 group-hover:bg-blue-100/50 transition-colors" />
        <svg viewBox="0 0 24 24" className="w-8 h-8 relative z-10 text-slate-800" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="4" y="8" width="16" height="12" rx="3" />
          <path d="M9 12h.01M15 12h.01" strokeLinecap="round" strokeWidth="2.5" />
          <path d="M4 11c4-1 12-1 16 0v3c-4-1-12-1-16 0v-3z" fill="slate-800" fillOpacity="0.15" stroke="none" />
          <path d="M2 13c1 0 2 0 3-1m14 0c1 1 2 1 3 1" />
        </svg>
      </div>
      <div>
        <h1 className="font-bold text-xl tracking-tight text-slate-900 leading-none">AI-2</h1>
        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-1">Assistant</p>
      </div>
    </div>
  );

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 p-2.5 hover:bg-slate-50 rounded-xl transition-all border bg-white border-slate-100 shadow-sm text-slate-400 hover:text-slate-600"
      >
        <PanelLeft size={20} />
      </button>
    );
  }

  return (
    <div className="w-72 border-r border-slate-100 bg-white flex flex-col h-full z-40 transition-all">
      <div className="p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <Logo />
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-300 hover:text-slate-500 transition-colors">
            <PanelLeftClose size={20} />
          </button>
        </div>

        <button 
          onClick={onNewChat}
          className="flex items-center gap-3 w-full p-3.5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 mb-8 font-semibold text-sm"
        >
          <Plus size={20} strokeWidth={2.5} />
          <span>New Conversation</span>
        </button>

        <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2">
          <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-widest mb-4 px-2">History</h3>
          <div className="space-y-1">
            {sessions.length === 0 ? (
              <p className="px-3 text-xs text-slate-400 italic">No chats yet...</p>
            ) : (
              sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => onSelectSession(s.id)}
                  className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all text-sm group ${
                    currentSessionId === s.id ? 'bg-slate-50 text-slate-900 font-semibold' : 'hover:bg-slate-50 text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <MessageSquare size={16} className={`shrink-0 ${currentSessionId === s.id ? 'text-blue-500' : 'text-slate-300 group-hover:text-slate-400'}`} />
                  <span className="truncate">{s.title}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="mt-auto pt-6 space-y-3 border-t border-slate-50">
          <button 
            onClick={onEditMemory}
            className="flex items-center gap-3 w-full p-3 text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl transition-all text-sm font-bold shadow-sm"
          >
            <BrainCircuit size={18} className="text-blue-500" />
            <span>Edit Memory</span>
          </button>

          <div className="bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">Switch AI Persona</p>
            <div className="flex p-1 bg-white border border-slate-100 rounded-xl gap-1">
              <button 
                onClick={() => onModelChange('AI-2')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  currentModel === 'AI-2' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Zap size={13} fill={currentModel === 'AI-2' ? 'currentColor' : 'none'} />
                AI-2
              </button>
              <button 
                onClick={() => onModelChange('AI-3')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  currentModel === 'AI-3' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <ShieldCheck size={13} fill={currentModel === 'AI-3' ? 'currentColor' : 'none'} />
                AI-3
              </button>
            </div>
          </div>
          
          <button className="flex items-center gap-3 w-full p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all text-sm font-medium">
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
