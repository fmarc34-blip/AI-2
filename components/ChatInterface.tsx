
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, ChatSession, ModelType, MemoryEntry } from '../types';
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
  ExternalLink,
  Search,
  Volume2,
  Copy,
  Check,
  X,
  Zap,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { decode, decodeAudioData } from '../utils/audio';

interface ChatInterfaceProps {
  session?: ChatSession;
  onSendMessage: (msg: Message) => void;
  isVoiceMode: boolean;
  setIsVoiceMode: (val: boolean) => void;
  model: ModelType;
  memories: MemoryEntry[];
  onAutoMemory: (content: string) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  session,
  onSendMessage,
  isVoiceMode,
  setIsVoiceMode,
  model,
  memories,
  onAutoMemory
}) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isReading, setIsReading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, type: string, data: string}[]>([]);
  
  // Screen streaming states
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isVisionExpanded, setIsVisionExpanded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [session?.messages, isTyping, screenStream]);

  // Effect to attach stream to video element when it mounts
  useEffect(() => {
    if (videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const stopScreenStream = useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
  }, [screenStream]);

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

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = async (messageId: string, text: string) => {
    if (isReading === messageId) {
      setIsReading(null);
      return;
    }
    
    setIsReading(messageId);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: model === 'AI-2' ? 'Kore' : 'Puck' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        }
        const ctx = audioContextRef.current;
        const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => setIsReading(null);
        source.start();
      }
    } catch (err) {
      console.error("TTS failed", err);
      setIsReading(null);
    }
  };

  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current || !screenStream) return null;
    const video = videoRef.current;
    
    // Ensure video is ready for capture (4 = HAVE_ENOUGH_DATA)
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return null;

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.6);
  };

  const handleSend = async () => {
    const trimmedInput = input.trim();
    const currentFrame = captureFrame();
    
    if (!trimmedInput && uploadedFiles.length === 0 && !currentFrame) return;

    let displayMedia = uploadedFiles.length > 0 ? uploadedFiles[0].data : (currentFrame || undefined);
    let displayType: Message['type'] = uploadedFiles.length > 0 
        ? (uploadedFiles[0].type.startsWith('image') ? 'image' 
           : uploadedFiles[0].type.startsWith('video') ? 'video' : 'file') 
        : (currentFrame ? 'image' : 'text');

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: trimmedInput,
      timestamp: Date.now(),
      mediaUrl: displayMedia,
      type: displayType
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
          content: "I've created this image for you! 🎨",
          mediaUrl: generatedImg,
          type: 'image',
          timestamp: Date.now()
        });
      } else {
        const geminiModel = model === 'AI-2' ? 'gemini-3-flash-preview' : 'gemini-3-pro-preview';
        const parts: any[] = [{ text: currentInput || "Please check this out for me!" }];
        
        currentMedia.forEach(m => {
          const splitData = m.data.split(',');
          if (splitData.length > 1) {
            parts.push({ inlineData: { data: splitData[1], mimeType: m.type } });
          }
        });

        if (currentFrame) {
          const splitFrame = currentFrame.split(',');
          if (splitFrame.length > 1) {
            parts.push({ inlineData: { data: splitFrame[1], mimeType: 'image/jpeg' } });
          }
        }

        const memoryContext = memories.map(m => `- ${m.content}`).join('\n');
        const systemInstruction = model === 'AI-2' 
          ? `You are AI-2, a super friendly and energetic assistant. User context: ${memoryContext || "None"}.
             If a screen frame is provided, it's a REAL capture of the user's desktop. Analyze it accurately as if you're looking over their shoulder. 
             If the user uploads a file/script, you can "launch" it by explaining its function and mentally simulating its execution. 
             SEARCH THE WEB EXTENSIVELY for information.`
          : `You are AI-3, a very safe and friendly assistant. User context: ${memoryContext || "None"}.
             Carefully analyze REAL screen captures or files provided. SEARCH THE WEB EXTENSIVELY.` ;

        const response = await ai.models.generateContent({
          model: geminiModel,
          contents: { parts },
          config: {
            systemInstruction: systemInstruction + " Be conversational. Don't mention memory tags.",
            tools: [{ googleSearch: {} }]
          }
        });

        let text = response.text || "I'm here to help!";
        const memoryMatch = text.match(/\[MEMORY:\s*(.*?)\]/);
        if (memoryMatch && memoryMatch[1]) {
          onAutoMemory(memoryMatch[1]);
          text = text.replace(/\[MEMORY:.*?\]/g, '').trim();
        }

        const aiMsg: Message = {
          id: generateId(),
          role: 'assistant',
          content: text,
          timestamp: Date.now(),
          sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
            title: chunk.web?.title || 'Source',
            url: chunk.web?.uri || '#'
          })).filter((s: any) => s.url !== '#')
        };
        onSendMessage(aiMsg);
      }
    } catch (error: any) {
      console.error(error);
      const errorMessage = error?.message?.includes('Unable to process input image') 
        ? "I had a tiny issue seeing your screen clearly. Could you share it again? 🧐"
        : "My brain hit a little bump! Let's try that again. 🚀";
      
      onSendMessage({ id: generateId(), role: 'assistant', content: errorMessage, timestamp: Date.now() });
    } finally {
      setIsTyping(false);
    }
  };

  const handleScreenToggle = async () => {
    if (screenStream) {
      stopScreenStream();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { cursor: 'always' } as any, 
        audio: false 
      });
      setScreenStream(stream);
      stream.getTracks()[0].onended = () => setScreenStream(null);
    } catch (err) {
      console.error("Screen stream failed", err);
      alert("I couldn't access your screen. Please grant permissions!");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
      <header className="h-20 border-b border-slate-50 flex items-center justify-between px-8 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-lg">{session?.title || "New Chat"}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tighter uppercase ${model === 'AI-2' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
              {model} Mode
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">REAL VISION ACTIVE</span>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handleScreenToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-semibold text-sm border shadow-sm ${
              screenStream 
                ? 'bg-blue-600 text-white border-blue-500' 
                : 'bg-white text-slate-500 hover:text-slate-900 border-slate-100 hover:border-slate-300'
            }`}
          >
            <Monitor size={18} />
            <span className="hidden md:inline">{screenStream ? 'Sharing Active' : 'Screen Mode'}</span>
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

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/20 relative flex flex-col">
        {/* Docked Vision Panel */}
        {screenStream && (
          <div className={`sticky top-0 z-40 p-6 transition-all duration-500 ease-in-out ${isVisionExpanded ? 'h-[400px]' : 'h-[200px]'}`}>
             <div className="relative h-full w-full bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl border-4 border-white group">
               <video 
                 ref={videoRef} 
                 autoPlay 
                 muted 
                 playsInline 
                 className="w-full h-full object-cover"
               />
               
               {/* Vision Status Badge */}
               <div className="absolute top-4 left-4 flex items-center gap-3 bg-red-500 text-white px-3 py-1.5 rounded-2xl shadow-xl">
                 <div className="relative flex h-2 w-2">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                 </div>
                 <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Screen</span>
               </div>

               {/* Vision Controls */}
               <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button 
                   onClick={() => setIsVisionExpanded(!isVisionExpanded)}
                   className="p-2 bg-white/20 backdrop-blur-md text-white rounded-xl hover:bg-white/40 transition-all"
                 >
                   {isVisionExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                 </button>
                 <button 
                   onClick={stopScreenStream}
                   className="p-2 bg-white/20 backdrop-blur-md text-white rounded-xl hover:bg-red-500 transition-all"
                 >
                   <X size={16} strokeWidth={3} />
                 </button>
               </div>

               <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                 <span className="text-[9px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap">Sharing REAL desktop view</span>
               </div>
             </div>
             <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        <div className="flex-1 p-6 md:p-12 space-y-8">
          {!session || session.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-10 space-y-8">
               <div className="relative">
                  <div className="absolute inset-0 bg-blue-400 blur-3xl opacity-10 animate-pulse" />
                  <div className="relative w-24 h-24 bg-white rounded-3xl shadow-xl border border-slate-50 flex items-center justify-center">
                    <Zap size={40} className="text-slate-800" fill="currentColor" />
                  </div>
               </div>
               
               <div className="space-y-3">
                 <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Ready to help!</h2>
                 <p className="text-slate-500 font-medium text-lg leading-relaxed">I'm AI-2! Toggle <b>Screen Mode</b> above to let me see your REAL desktop in real-time!</p>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  {[
                    { icon: <Monitor size={20} className="text-indigo-500" />, label: 'Review my screen' },
                    { icon: <Terminal size={20} className="text-slate-700" />, label: 'Launch this script' },
                    { icon: <Search size={20} className="text-emerald-500" />, label: 'Web search latest news' },
                    { icon: <ImageIcon size={20} className="text-pink-500" />, label: 'Generate a fun image' }
                  ].map((item, i) => (
                    <button 
                      key={i}
                      onClick={() => {
                        if (item.label.includes('screen')) handleScreenToggle();
                        else if (item.label.includes('script')) fileInputRef.current?.click();
                        else setInput(item.label);
                      }}
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
                <div className="max-w-[85%] sm:max-w-[75%] space-y-3">
                  {msg.mediaUrl && (
                    <div className="rounded-[32px] overflow-hidden border border-slate-100 shadow-xl group relative">
                      {msg.type === 'video' ? (
                        <video src={msg.mediaUrl} controls className="w-full max-h-[400px] object-contain bg-black" />
                      ) : (
                        <img src={msg.mediaUrl} alt="Visual Context" className="w-full max-h-[500px] object-cover" />
                      )}
                    </div>
                  )}
                  
                  <div className={`p-6 pb-4 rounded-[32px] shadow-sm relative group ${
                    msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                  }`}>
                    <div className="whitespace-pre-wrap leading-relaxed font-medium text-base">{msg.content}</div>
                    
                    <div className="mt-4 pt-3 border-t border-slate-50/10 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                          msg.role === 'user' ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-50 text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        {copiedId === msg.id ? <><Check size={12} /><span>Copied</span></> : <><Copy size={12} /><span>Copy</span></>}
                      </button>
                      
                      {msg.role === 'assistant' && (
                        <button 
                          onClick={() => handleSpeak(msg.id, msg.content)}
                          className={`p-2 rounded-full transition-all ${isReading === msg.id ? 'bg-blue-500 text-white animate-pulse' : 'text-slate-300 hover:text-slate-600'}`}
                        >
                          <Volume2 size={14} />
                        </button>
                      )}
                    </div>
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
      </div>

      <div className="p-8 bg-white/80 backdrop-blur-xl border-t border-slate-50">
        <div className="max-w-4xl mx-auto relative">
          {uploadedFiles.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-6 flex gap-3 overflow-x-auto pb-2 no-scrollbar">
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
          
          <div className="flex items-end gap-3 bg-white border border-slate-100 rounded-[40px] p-2 pl-6 shadow-2xl transition-all group focus-within:ring-8 focus-within:ring-slate-50">
            <div className="flex items-center mb-2">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
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
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={screenStream ? "What's on your screen?" : `Say hi to ${model}...`}
              className="flex-1 max-h-48 py-4 bg-transparent border-none focus:ring-0 resize-none text-slate-800 placeholder:text-slate-300 font-medium text-base"
              rows={1}
            />

            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={handleSend}
                disabled={!input.trim() && uploadedFiles.length === 0 && !screenStream}
                className={`p-4 rounded-full transition-all shadow-xl ${
                  input.trim() || uploadedFiles.length > 0 || screenStream
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
    </div>
  );
};
