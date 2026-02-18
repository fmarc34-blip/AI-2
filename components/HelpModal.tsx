
import React from 'react';
import { X, Mic, Monitor, BrainCircuit, Search, Zap, Image as ImageIcon, Plus, Terminal } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const sections = [
    {
      title: "Talk with me",
      icon: <Mic className="text-blue-500" />,
      description: "Click the 'Voice Mode' button or the mic icon in the chat to start a real-time conversation. I can hear you and talk back!"
    },
    {
      title: "Screen Review",
      icon: <Monitor className="text-indigo-500" />,
      description: "Use 'Screen Mode' to let me see your desktop. I can analyze what's on your screen and help you with whatever you're doing."
    },
    {
      title: "Long-term Memory",
      icon: <BrainCircuit className="text-pink-500" />,
      description: "I remember what we talk about! You can click 'Edit Memory' in the sidebar to see or change what I know about you."
    },
    {
      title: "Web Search",
      icon: <Search className="text-emerald-500" />,
      description: "I search the web extensively for everything we talk about to give you the most accurate and up-to-date answers."
    },
    {
      title: "Launch Apps",
      icon: <Terminal className="text-slate-700" />,
      description: "Upload a script or file using the '+' button, and I can simulate 'launching' it to tell you what it does!"
    },
    {
      title: "Generate Images",
      icon: <ImageIcon className="text-orange-500" />,
      description: "Ask me to 'generate an image' of anything you can imagine, and I'll create it for you right in our chat."
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-900 rounded-2xl">
              <Zap size={24} className="text-white" fill="currentColor" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI-2 Help & Tutorials</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Master your friendly AI companion</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-300 hover:text-slate-600 transition-all">
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
          <section className="space-y-6">
            <h3 className="text-xl font-extrabold text-slate-900">✨ Core Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sections.map((feature, idx) => (
                <div key={idx} className="p-6 bg-slate-50 border border-slate-100 rounded-[32px] flex gap-4 hover:shadow-lg hover:bg-white transition-all group">
                  <div className="p-3 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform h-fit">
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">{feature.title}</h4>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-xl font-extrabold text-slate-900">🚀 Quick Start Tutorial</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">1</div>
                <div>
                  <p className="font-bold text-slate-800">Say Hello!</p>
                  <p className="text-sm text-slate-500">Just type in the chat box. I'm AI-2, and I'm super friendly!</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">2</div>
                <div>
                  <p className="font-bold text-slate-800">Use the '+' Button</p>
                  <p className="text-sm text-slate-500">Upload photos of your day or videos you like. I can analyze them and we can talk about them together.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">3</div>
                <div>
                  <p className="font-bold text-slate-800">Try AI-3 Persona</p>
                  <p className="text-sm text-slate-500">Use the switch in the sidebar to talk to AI-3, a more calm and safety-focused version of me.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
        
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Press <span className="bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm text-slate-900">F1</span> anytime to open this guide
          </p>
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
};
