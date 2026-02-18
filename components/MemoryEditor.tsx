
import React, { useState } from 'react';
import { X, Plus, Trash2, BrainCircuit, Save } from 'lucide-react';
import { MemoryEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface MemoryEditorProps {
  memories: MemoryEntry[];
  onUpdate: (newMemories: MemoryEntry[]) => void;
  onClose: () => void;
}

export const MemoryEditor: React.FC<MemoryEditorProps> = ({ memories, onUpdate, onClose }) => {
  const [newMemory, setNewMemory] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (!newMemory.trim()) return;
    const entry: MemoryEntry = {
      id: uuidv4(),
      content: newMemory.trim(),
      timestamp: Date.now()
    };
    onUpdate([entry, ...memories]);
    setNewMemory('');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    onUpdate(memories.filter(m => m.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-2xl">
              <BrainCircuit size={24} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI Memory</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Everything I know about you</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-300 hover:text-slate-600 transition-all">
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar bg-slate-50/20">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{memories.length} Memories Stored</span>
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
              <Plus size={16} strokeWidth={3} />
              Add Memory
            </button>
          </div>

          {isAdding && (
            <div className="bg-white p-6 rounded-[32px] border-2 border-blue-100 shadow-xl space-y-4 animate-in slide-in-from-top-4">
              <textarea 
                autoFocus
                value={newMemory}
                onChange={(e) => setNewMemory(e.target.value)}
                placeholder="Type something for the AI to remember..."
                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-blue-100 min-h-[100px] resize-none"
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsAdding(false)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={handleAdd}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-100"
                >
                  <Save size={16} />
                  Save Memory
                </button>
              </div>
            </div>
          )}

          {memories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-300">
                <BrainCircuit size={32} />
              </div>
              <p className="text-slate-400 font-bold text-sm">No memories yet. Talk to the AI to start building its knowledge!</p>
            </div>
          ) : (
            memories.map((m) => (
              <div key={m.id} className="group bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-start gap-4">
                <div className="flex-1 space-y-1">
                  <p className="text-slate-800 font-semibold text-sm leading-relaxed">{m.content}</p>
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    Stored {new Date(m.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <button 
                  onClick={() => handleDelete(m.id)}
                  className="p-2.5 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
        
        <div className="p-8 bg-slate-50/50 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
            Memory is encrypted and stored locally on your device. <br/> The AI uses this context to personalize its responses and searches.
          </p>
        </div>
      </div>
    </div>
  );
};
