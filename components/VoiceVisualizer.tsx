
import React from 'react';
import { Volume2, Mic, Search, Loader2 } from 'lucide-react';
import { Expression } from '../types';

interface VoiceVisualizerProps {
  expression: Expression;
  size?: number;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ expression, size = 300 }) => {
  const isTalking = expression === 'happy';
  const isListening = expression === 'listening';
  const isThinking = expression === 'thinking';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer Pulse Rings */}
      {isTalking && (
        <>
          <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-ping" />
          <div className="absolute inset-4 bg-blue-400/20 rounded-full animate-ping [animation-delay:200ms]" />
        </>
      )}
      
      {/* Listening Glow */}
      {isListening && (
        <div className="absolute inset-0 bg-slate-100 rounded-full animate-pulse scale-110" />
      )}

      {/* Main Speaker Body */}
      <div className={`relative z-10 w-40 h-40 bg-white rounded-[40px] shadow-2xl border border-slate-50 flex items-center justify-center transition-all duration-500 transform ${
        isTalking ? 'scale-110 -translate-y-6 shadow-blue-100' : 'scale-100 translate-y-0'
      }`}>
        {isThinking ? (
          <Loader2 size={48} className="text-blue-500 animate-spin" />
        ) : isListening ? (
          <div className="relative">
            <Mic size={48} className="text-slate-900" strokeWidth={2.5} />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping" />
          </div>
        ) : (
          <Volume2 
            size={48} 
            className={`transition-colors duration-500 ${isTalking ? 'text-blue-600' : 'text-slate-400'}`} 
            strokeWidth={2.5} 
          />
        )}
      </div>

      {/* Decorative Floating Dots */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-2 h-2 rounded-full transition-all duration-1000 ${
              isTalking ? 'bg-blue-300 opacity-60' : 'bg-slate-200 opacity-0'
            }`}
            style={{
              top: `${50 + Math.sin(i * 60 * Math.PI / 180) * 45}%`,
              left: `${50 + Math.cos(i * 60 * Math.PI / 180) * 45}%`,
              transform: isTalking ? `translateY(${Math.sin(Date.now() / 1000 + i) * 10}px)` : 'scale(0)'
            }}
          />
        ))}
      </div>
    </div>
  );
};
