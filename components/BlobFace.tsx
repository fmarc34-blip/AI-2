
import React from 'react';
import { Expression } from '../types';

interface BlobFaceProps {
  expression: Expression;
  size?: number;
}

export const BlobFace: React.FC<BlobFaceProps> = ({ expression, size = 250 }) => {
  const getColors = () => {
    switch (expression) {
      case 'happy': return 'from-yellow-400 to-orange-400';
      case 'listening': return 'from-blue-400 to-indigo-500';
      case 'excited': return 'from-pink-400 to-purple-500';
      case 'thinking': return 'from-emerald-400 to-teal-500';
      default: return 'from-slate-200 to-slate-300';
    }
  };

  const getEyeStyle = () => {
    switch (expression) {
      case 'happy': return 'scale-y-75 translate-y-1';
      case 'excited': return 'scale-125';
      case 'thinking': return 'translate-x-1 -translate-y-1';
      case 'listening': return 'scale-110 animate-pulse';
      default: return '';
    }
  };

  const getMouthStyle = () => {
    switch (expression) {
      case 'happy': return 'h-6 w-12 rounded-full border-b-4 border-slate-800 translate-y-2';
      case 'excited': return 'h-8 w-14 rounded-full bg-slate-800 translate-y-2';
      case 'listening': return 'h-2 w-8 rounded-full bg-slate-800 animate-bounce';
      case 'thinking': return 'h-1 w-6 rounded-full bg-slate-800';
      default: return 'h-1 w-8 rounded-full bg-slate-800 opacity-40';
    }
  };

  return (
    <div 
      className={`relative rounded-full bg-gradient-to-br ${getColors()} floating-blob animate-blob-float shadow-2xl flex items-center justify-center overflow-hidden`}
      style={{ width: size, height: size }}
    >
      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-white/20 blur-xl translate-x-1/4 -translate-y-1/4 rounded-full w-1/2 h-1/2" />
      
      {/* Eyes & Mouth */}
      <div className="relative flex flex-col items-center gap-6">
        <div className="flex gap-10">
          <div className={`w-4 h-4 bg-slate-800 rounded-full transition-all duration-500 ${getEyeStyle()}`} />
          <div className={`w-4 h-4 bg-slate-800 rounded-full transition-all duration-500 ${getEyeStyle()}`} />
        </div>
        <div className={`transition-all duration-500 ${getMouthStyle()}`} />
      </div>

      {/* Pulsing glow based on speech intensity (simulated) */}
      {expression === 'happy' && (
        <div className="absolute inset-0 bg-white/10 animate-ping rounded-full pointer-events-none" />
      )}
    </div>
  );
};
