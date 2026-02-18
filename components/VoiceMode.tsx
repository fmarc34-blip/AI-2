import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mic, MicOff, Maximize2, Minimize2, Monitor, Camera } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { BlobFace } from './BlobFace';
import { Expression, ModelType, Message } from '../types';
import { encode, decode, decodeAudioData, createAudioBlob } from '../utils/audio';

interface VoiceModeProps {
  onClose: () => void;
  model: ModelType;
  onMessageResponse: (msg: Message) => void;
}

const FRAME_RATE = 1; // 1 FPS for screen updates to keep context
const JPEG_QUALITY = 0.5;

export const VoiceMode: React.FC<VoiceModeProps> = ({ onClose, model, onMessageResponse }) => {
  const [expression, setExpression] = useState<Expression>('neutral');
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const screenStreamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);

  const startScreenSharing = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = stream;
      setIsScreenSharing(true);
      
      const videoEl = document.createElement('video');
      videoEl.srcObject = stream;
      videoEl.play();

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      frameIntervalRef.current = window.setInterval(() => {
        if (!ctx || !videoEl.videoWidth) return;
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        ctx.drawImage(videoEl, 0, 0);
        canvas.toBlob(async (blob) => {
          if (blob && sessionRef.current) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              sessionRef.current.sendRealtimeInput({
                media: { data: base64, mimeType: 'image/jpeg' }
              });
            };
            reader.readAsDataURL(blob);
          }
        }, 'image/jpeg', JPEG_QUALITY);
      }, 1000 / FRAME_RATE);

      stream.getVideoTracks()[0].onended = () => stopScreenSharing();
    } catch (err) {
      console.error("Screen sharing failed", err);
    }
  };

  const stopScreenSharing = () => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(t => t.stop());
    setIsScreenSharing(false);
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
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setExpression('happy');
              const nextStartTime = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setExpression('neutral');
              });
              source.start(nextStartTime);
              nextStartTimeRef.current = nextStartTime + audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setExpression('listening');
            }
          },
          onerror: (e) => {
            console.error("Live Error", e);
            setExpression('thinking');
          },
          onclose: () => setIsListening(false)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are ${model}, a fun and friendly AI. You are talking to the user.
          If they share their screen, you can see it and comment on it. 
          Be cheerful, use short conversational phrases. Your face is a colorful blob.
          IMPORTANT: Never speak URLs, links, or mention where you got your information from. Stay conversational and friendly without mentioning search sources or citations.`,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Voice setup failed", err);
    }
  }, [isMuted, model]);

  useEffect(() => {
    setupLiveSession();
    return () => {
      sessionRef.current?.close();
      audioContextRef.current?.close();
      outputAudioContextRef.current?.close();
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
              <span className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">{model} Real-Time Mode</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Live Voice & Vision Active</span>
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

        <div className="flex-1 flex flex-col items-center justify-center gap-16 relative">
           {isScreenSharing && (
              <div className="absolute top-0 right-0 p-2 bg-blue-50 rounded-xl flex items-center gap-2 border border-blue-100 animate-bounce">
                <Monitor size={12} className="text-blue-500" />
                <span className="text-[10px] font-bold text-blue-600 uppercase">Streaming Desktop</span>
              </div>
           )}
           <BlobFace expression={expression} size={isFullscreen ? 500 : 320} />
           
           <div className="text-center space-y-4 max-w-lg">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                {expression === 'listening' ? "I'm all ears!" : expression === 'happy' ? "Let's chat!" : expression === 'thinking' ? "Processing..." : "Ready to Talk"}
              </h2>
              <p className="text-slate-400 font-semibold text-lg leading-relaxed">
                {isScreenSharing ? "I can see your screen now! Tell me what to look at." : "Talk to me naturally. I can help with anything!"}
              </p>
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
