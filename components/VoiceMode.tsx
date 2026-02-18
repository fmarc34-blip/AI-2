
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mic, MicOff, Maximize2, Minimize2, Monitor, Camera, ShieldAlert } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { BlobFace } from './BlobFace';
import { Expression, ModelType, Message } from '../types';
import { encode, decode, decodeAudioData, createAudioBlob } from '../utils/audio';

interface VoiceModeProps {
  onClose: () => void;
  model: ModelType;
  onMessageResponse: (msg: Message) => void;
}

const FRAME_RATE = 2;
const JPEG_QUALITY = 0.5;

export const VoiceMode: React.FC<VoiceModeProps> = ({ onClose, model, onMessageResponse }) => {
  const [expression, setExpression] = useState<Expression>('neutral');
  const [isTalking, setIsTalking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const screenStreamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Reliable stream attachment
  useEffect(() => {
    if (videoPreviewRef.current && isScreenSharing && screenStreamRef.current) {
      videoPreviewRef.current.srcObject = screenStreamRef.current;
    }
  }, [isScreenSharing]);

  const startScreenSharing = async () => {
    setShareError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { cursor: 'always' } as any,
        audio: false 
      });

      screenStreamRef.current = stream;
      setIsScreenSharing(true);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      frameIntervalRef.current = window.setInterval(() => {
        if (!ctx || !videoPreviewRef.current || videoPreviewRef.current.readyState < 2 || !sessionRef.current) return;
        const video = videoPreviewRef.current;
        
        if (video.videoWidth === 0 || video.videoHeight === 0) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        canvas.toBlob(async (blob) => {
          if (blob && sessionRef.current) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              if (result && result.includes(',')) {
                const base64 = result.split(',')[1];
                sessionRef.current.sendRealtimeInput({
                  media: { data: base64, mimeType: 'image/jpeg' }
                });
              }
            };
            reader.readAsDataURL(blob);
          }
        }, 'image/jpeg', JPEG_QUALITY);
      }, 1000 / FRAME_RATE);

      stream.getVideoTracks()[0].onended = () => stopScreenSharing();
    } catch (err: any) {
      console.error("Screen sharing failed:", err);
      setShareError(err.name === 'NotAllowedError' ? "Permission denied. Check browser settings." : "Screen sharing unavailable.");
      setIsScreenSharing(false);
    }
  };

  const stopScreenSharing = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
    setShareError(null);
  };

  const setupLiveSession = useCallback(async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsListening(true);
            setExpression('listening');
            const source = inputCtx.createMediaStreamSource(micStream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (isMuted) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createAudioBlob(inputData);
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setExpression('happy');
              setIsTalking(true);
              const nextStartTime = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) {
                  setExpression('neutral');
                  setIsTalking(false);
                }
              });
              source.start(nextStartTime);
              nextStartTimeRef.current = nextStartTime + audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.outputTranscription) {
              currentOutputTranscription.current += message.serverContent.outputTranscription.text;
            } else if (message.serverContent?.inputTranscription) {
              currentInputTranscription.current += message.serverContent.inputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
              if (currentInputTranscription.current.trim()) {
                onMessageResponse({ id: generateId(), role: 'user', content: currentInputTranscription.current.trim(), timestamp: Date.now() });
              }
              if (currentOutputTranscription.current.trim()) {
                onMessageResponse({ id: generateId(), role: 'assistant', content: currentOutputTranscription.current.trim(), timestamp: Date.now() });
              }
              currentInputTranscription.current = '';
              currentOutputTranscription.current = '';
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setExpression('listening');
              setIsTalking(false);
              currentOutputTranscription.current = '';
            }
          },
          onerror: (e) => { 
            console.error("Live Error", e); 
            setExpression('thinking'); 
          },
          onclose: () => {
            setIsListening(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `You are ${model}, a fun and friendly AI. You have a floating blob body with eyes and a mouth. 
          You are looking at the user's REAL desktop in real-time. Describe what you see vividly as if you are watching a movie of their life.
          Be proactive and engaging. If they haven't spoken, you can start the conversation about what you see on their screen.
          SEARCH THE WEB EXTENSIVELY for information. IMPORTANT: Never speak URLs or mention citations.`,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: model === 'AI-2' ? 'Kore' : 'Puck' } }
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Voice setup failed", err);
    }
  }, [isMuted, model, onMessageResponse]);

  useEffect(() => {
    setupLiveSession();
    return () => {
      sessionRef.current?.close?.();
      audioContextRef.current?.close?.();
      outputAudioContextRef.current?.close?.();
      stopScreenSharing();
    };
  }, []);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-all duration-700 ${isFullscreen ? 'bg-white' : 'bg-white/95 backdrop-blur-3xl'}`}>
      <div className={`relative w-full max-w-5xl h-full flex flex-col items-center justify-between p-12`}>
        
        <div className="w-full flex justify-between items-center">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-blue-500 animate-pulse' : 'bg-slate-200'}`} />
              <span className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">{model} Live Vision</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time desktop streaming active</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-4 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all">
              {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
            </button>
            <button onClick={onClose} className="p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition-all">
              <X size={24} strokeWidth={3} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-16 relative w-full">
           {isScreenSharing ? (
             <div className="relative w-full max-w-2xl aspect-video rounded-[40px] overflow-hidden shadow-2xl border-4 border-white animate-in zoom-in-95 duration-500 group">
                <video 
                  ref={videoPreviewRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-6 left-6 flex items-center gap-3">
                   <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white">
                      <Monitor size={20} />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Desktop Review</span>
                      <span className="text-white/70 text-[10px] font-bold">AI is looking at your REAL screen</span>
                   </div>
                </div>
                {/* Overlay Face Mini */}
                <div className="absolute bottom-6 right-6 w-20 h-20">
                   <BlobFace expression={expression} isTalking={isTalking} size={80} />
                </div>
             </div>
           ) : (
             <BlobFace expression={expression} isTalking={isTalking} size={isFullscreen ? 500 : 320} />
           )}
           
           <div className="text-center space-y-4 max-w-lg">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                {expression === 'listening' ? "I'm listening!" : isTalking ? "Speaking..." : expression === 'happy' ? "Let's chat!" : "Ready"}
              </h2>
              {shareError ? (
                <div className="flex items-center gap-2 justify-center text-red-500 font-bold bg-red-50 px-4 py-2 rounded-xl animate-in shake">
                  <ShieldAlert size={18} />
                  <span>{shareError}</span>
                </div>
              ) : (
                <p className="text-slate-400 font-semibold text-lg leading-relaxed">
                  {isScreenSharing ? "I can see your REAL desktop. Tell me what we should check out!" : "Ready to talk. Show me your screen to get my help!"}
                </p>
              )}
           </div>
        </div>

        <div className="w-full flex flex-col items-center gap-10">
          <div className="flex items-center gap-8">
            <button 
               onClick={() => setIsMuted(!isMuted)}
               className={`p-10 rounded-[40px] shadow-2xl transition-all transform hover:scale-105 active:scale-95 ${isMuted ? 'bg-red-50 text-red-500 ring-4 ring-red-100' : 'bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-white'}`}
            >
              {isMuted ? <MicOff size={40} strokeWidth={2.5} /> : <Mic size={40} strokeWidth={2.5} />}
            </button>
            
            <button 
               onClick={isScreenSharing ? stopScreenSharing : startScreenSharing}
               className={`p-10 rounded-[40px] shadow-2xl transition-all transform hover:scale-105 active:scale-95 ${isScreenSharing ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-slate-900 text-white shadow-slate-200'}`}
               title="Toggle Screen Review"
            >
              {isScreenSharing ? <Monitor size={40} strokeWidth={2.5} /> : <Camera size={40} strokeWidth={2.5} />}
            </button>
          </div>
          
          <div className="h-2.5 w-full max-w-md bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5">
             <div 
               className="h-full bg-slate-900 rounded-full transition-all duration-300 shadow-sm"
               style={{ width: isListening && !isMuted ? '100%' : '5%' }}
             />
          </div>
        </div>
      </div>
    </div>
  );
};
