
import React, { useState, useRef, useEffect } from 'react';
import { Message, ChatSession, ModelType } from '../types';
import { 
  Plus, 
  Send, 
  Mic, 
  Image as ImageIcon, 
  Paperclip, 
  Monitor, 
  Play,
  Terminal,
  Cpu,
  ExternalLink
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface ChatInterfaceProps {
  session?: ChatSession;
  onSendMessage: (msg: Message) => void;
  isVoiceMode: boolean;
  setIsVoiceMode: (val: boolean) => void;
  model: ModelType;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  session,
  onSendMessage,
  isVoiceMode,
  setIsVoiceMode,
  model
}) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, type: string, data: string}[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [session?.messages, isTyping]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (rev) => {
        const base64 = rev.target?.result as string;
        setUploadedFiles(prev => [...prev, {
          name: file.name,
          type: file.type || 'application/octet-stream',
          data: base64
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput && uploadedFiles.length === 0) return;

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: trimmedInput,
      timestamp: Date.now(),
      mediaUrl: uploadedFiles.length > 0 ? uploadedFiles[0].data : undefined,
      type: uploadedFiles.length > 0 
        ? (uploadedFiles[0].type.startsWith('image') ? 'image' 
           : uploadedFiles[0].type.startsWith('video') ? 'video' : 'file') 
        : 'text'
    };

    onSendMessage(userMsg);
    const currentInput = trimmedInput;
    const currentMedia = [...uploadedFiles];
    setInput('');
    setUploadedFiles([]);

    setIsTyping(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const isImgGen = currentInput.toLowerCase().includes('generate') && (currentInput.toLowerCase().includes('image') || currentInput.toLowerCase().includes('picture') || currentInput.toLowerCase().includes('photo'));

      if (isImgGen) {
        const imgResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: currentInput }] },
          config: { imageConfig: { aspectRatio: "1:1" } }
        });

        let generatedImg = '';
        for (const part of imgResponse.candidates[0].content.parts) {
          if (part.inlineData) {
            generatedImg = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }

        onSendMessage({
          id: generateId(),
          role: 'assistant',
          content: "Here is the image I generated for you! ✨",
          mediaUrl: generatedImg,
          type: 'image',
          timestamp: Date.now()
        });
      } else {
        const geminiModel = model === 'AI-2' ? 'gemini-3-flash-preview' : 'gemini-3-pro-preview';
        const contents: any[] = [{ text: currentInput || "Analyze this for me please!" }];
        
        currentMedia.forEach(m => {
          const base64Data = m.data.split(',')[1];
          contents.push({
            inlineData: {
              data: base64Data,
              mimeType: m.type
            }
          });
        });

        const systemInstruction = model === 'AI-2' 
          ? `You are AI-2, a super friendly, fun, and energetic assistant. You use emojis and love helping. 
             If files are uploaded, simulate 'launching' them with excitement. Describe the 'output' of the program vividly.
             Use search for current events. Be purely conversational.`
          : `You are AI-3, a very safe, calm, and ultra-friendly assistant. You prioritize clarity and kindness.
             If files are uploaded, carefully 'review' and 'run' them in a safe virtual space and describe the results pleasantly.
             Use search for current events. Be purely conversational.`;

        const response = await ai.models.generateContent({
          model: geminiModel,
          contents: { parts: contents },
          config: {
            systemInstruction: systemInstruction + " IMPORTANT: Keep your personality alive! Be safe, fun, and friendly.",
            tools: [{ googleSearch: {} }]
          }
        });

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const sources = groundingChunks?.map((chunk: any) => ({
          title: chunk.web?.title || 'Source',
          url: chunk.web?.uri || '#'
        })).filter((s: any) => s.url !== '#');

        const aiMsg: Message = {
          id: generateId(),
          role: 'assistant',
          content: response.text || "I'm ready to help! What's on your mind?",
          timestamp: Date.now(),
          sources: sources && sources.length > 0 ? sources : undefined
        };

        onSendMessage(aiMsg);
      }
    } catch (error) {
      console.error(error);
      onSendMessage({
        id: generateId(),
        role: 'assistant',
        content: "Oh no! My circuits got a bit tangled. Can you try saying that again? I'm still here and excited to help!",
        timestamp: Date.now()
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleScreenReview = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert("Screen capture is not supported in this environment.");
        return;
      }
      
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        
        setUploadedFiles(prev => [...prev, {
          name: 'Screen Review',
          type: 'image/jpeg',
          data: dataUrl
        }]);
        
        setInput('What do you think of my screen right now?');
        stream.getTracks().forEach(t => t.stop());
      };
    } catch (err: any) {
      console.error("Screen capture failed", err);
      alert("I couldn't access your screen. Please make sure you granted permission!");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
      <header className="h-20 border-b border-slate-50 flex items-center justify-between px-8 bg-white/90 backdrop-blur-md sticky top-0 z-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-lg">{session?.title || "New Chat"}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tighter uppercase ${model === 'AI-2' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
              {model} Mode
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Active & Secure</span>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handleScreenReview}
            className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-900 transition-all font-semibold text-sm border border-transparent hover:border-slate-100 shadow-sm hover:shadow-md"
          >
            <Monitor size={18} />
            <span className="hidden md:inline">Screen Mode</span>
          </button>
          <button 
            onClick={() => setIsVoiceMode(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 font-bold text-sm"
          >
            <Mic size={18} strokeWidth={3} />
            <span>Voice Mode</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 custom-scrollbar bg-slate-50/20">
        {!session || session.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-20 space-y-8">
             <div className="relative">
                <div className="absolute inset-0 bg-blue-400 blur-3xl opacity-10 animate-pulse" />
                <div className="relative w-24 h-24 bg-white rounded-3xl shadow-xl border border-slate-50 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-12 h-12 text-slate-800" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="4" y="8" width="16" height="12" rx="3" />
                    <path d="M9 12h.01M15 12h.01" strokeLinecap="round" strokeWidth="2.5" />
                    <path d="M4 11c4-1 12-1 16 0v3c-4-1-12-1-16 0v-3z" fill="slate-800" fillOpacity="0.1" stroke="none" />
                  </svg>
                </div>
             </div>
             
             <div className="space-y-3">
               <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">How can I help you?</h2>
               <p className="text-slate-500 font-medium text-lg">I'm {model}, your friendly AI companion. I can see, talk, and even try out your files!</p>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {[
                  { icon: <ImageIcon size={20} className="text-pink-500" />, label: 'Generate a magical forest' },
                  { icon: <Cpu size={20} className="text-blue-500" />, label: 'Launch this script' },
                  { icon: <Monitor size={20} className="text-indigo-500" />, label: 'Tell me about my screen' },
                  { icon: <Terminal size={20} className="text-emerald-500" />, label: 'Let\'s run an app' }
                ].map((item, i) => (
                  <button 
                    key={i}
                    onClick={() => setInput(item.label)}
                    className="flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-3xl text-left hover:border-slate-300 transition-all shadow-sm hover:shadow-xl group"
                  >
                    <div className="p-3 bg-slate-50 rounded-2xl group-hover:scale-110 transition-transform">{item.icon}</div>
                    <span className="text-slate-700 font-semibold text-sm">{item.label}</span>
                  </button>
                ))}
             </div>
          </div>
        ) : (
          session.messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-[75%] space-y-3`}>
                {msg.mediaUrl && (
                  <div className="rounded-[32px] overflow-hidden border border-slate-100 shadow-xl group relative">
                    {msg.type === 'video' ? (
                      <video src={msg.mediaUrl} controls className="w-full max-h-[400px] object-contain bg-black" />
                    ) : msg.type === 'image' ? (
                      <img src={msg.mediaUrl} alt="Upload" className="w-full max-h-[500px] object-cover" />
                    ) : (
                      <div className="p-8 bg-slate-900 flex flex-col items-center justify-center gap-4 text-white">
                         <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center animate-pulse">
                            <Cpu size={32} className="text-blue-400" />
                         </div>
                         <div className="text-center">
                            <p className="font-bold text-lg">App Environment</p>
                            <p className="text-xs text-white/50 uppercase tracking-widest font-bold">Virtual Instance Ready</p>
                         </div>
                         <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-full text-xs font-bold hover:bg-blue-500 transition-colors">
                            <Play size={12} fill="currentColor" />
                            Launch Remotely
                         </button>
                      </div>
                    )}
                  </div>
                )}
                
                <div className={`p-6 rounded-[32px] shadow-sm relative ${
                  msg.role === 'user' 
                  ? 'bg-slate-900 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                }`}>
                  <div className="whitespace-pre-wrap leading-relaxed font-medium text-base">
                    {msg.content}
                  </div>
                  
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-slate-50 space-y-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sources</p>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((source, i) => (
                          <a
                            key={i}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg text-xs font-semibold text-slate-600 transition-all"
                          >
                            <span className="truncate max-w-[150px]">{source.title}</span>
                            <ExternalLink size={12} className="shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className={`flex items-center gap-2 px-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
        {isTyping && (
          <div className="flex justify-start">
             <div className="bg-white border border-slate-100 p-6 rounded-[32px] rounded-tl-none shadow-sm flex items-center gap-1.5">
               <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
               <div className="w-2.5 h-2.5 bg-blue-300 rounded-full animate-bounce" style={{animationDelay: '200ms'}} />
               <div className="w-2.5 h-2.5 bg-blue-200 rounded-full animate-bounce" style={{animationDelay: '400ms'}} />
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-8 bg-white/80 backdrop-blur-xl border-t border-slate-50">
        <div className="max-w-4xl mx-auto relative">
          {uploadedFiles.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-6 flex gap-3 overflow-x-auto pb-2 scroll-smooth no-scrollbar">
              {uploadedFiles.map((f, i) => (
                <div key={i} className="relative group shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="w-24 h-24 bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xl p-1">
                    {f.type.startsWith('image') ? (
                      <img src={f.data} className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl gap-1">
                        <Paperclip size={24} />
                        <span className="text-[8px] font-bold uppercase truncate w-full px-2 text-center">{f.name}</span>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-3 -right-3 bg-slate-900 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform z-10"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-end gap-4 bg-white border border-slate-100 rounded-[40px] p-3 pl-6 focus-within:ring-8 focus-within:ring-slate-50 shadow-2xl transition-all group">
            <div className="flex items-center mb-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                multiple 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
              >
                <Plus size={24} strokeWidth={2.5} />
              </button>
            </div>
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Talk to ${model}...`}
              className="flex-1 max-h-48 py-4 bg-transparent border-none focus:ring-0 resize-none text-slate-800 placeholder:text-slate-300 font-medium text-base leading-relaxed"
              rows={1}
            />

            <button
              onClick={handleSend}
              disabled={!input.trim() && uploadedFiles.length === 0}
              className={`mb-1 p-4 rounded-full transition-all shadow-xl ${
                input.trim() || uploadedFiles.length > 0
                ? 'bg-slate-900 text-white hover:scale-105 active:scale-95'
                : 'bg-slate-50 text-slate-200 cursor-not-allowed shadow-none'
              }`}
            >
              <Send size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
