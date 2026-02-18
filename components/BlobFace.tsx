
import React from 'react';
import { Expression } from '../types';

interface BlobFaceProps {
  expression: Expression;
  isTalking?: boolean;
  size?: number;
}

export const BlobFace: React.FC<BlobFaceProps> = ({ expression, isTalking = false, size = 300 }) => {
  const getBlobColor = () => {
    switch (expression) {
      case 'happy': return 'from-blue-400 to-emerald-400 shadow-blue-200';
      case 'thinking': return 'from-purple-500 to-indigo-500 shadow-purple-200';
      case 'listening': return 'from-teal-400 to-cyan-400 shadow-teal-100';
      case 'excited': return 'from-orange-400 to-pink-500 shadow-orange-200';
      default: return 'from-slate-400 to-slate-600 shadow-slate-200';
    }
  };

  return (
    <div className="relative flex items-center justify-center transition-all duration-700" style={{ width: size, height: size }}>
      {/* Dynamic Background Glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getBlobColor()} opacity-20 blur-[80px] rounded-full animate-pulse`} />
      
      {/* The Blob Body */}
      <div className={`relative w-3/4 h-3/4 bg-gradient-to-br ${getBlobColor()} rounded-[45%] shadow-2xl floating-blob animate-blob-float border-8 border-white/30 backdrop-blur-sm flex items-center justify-center`}>
        
        {/* Face Container */}
        <div className="flex flex-col items-center gap-6 mt-2">
          {/* Eyes */}
          <div className="flex gap-10">
            <div className={`w-4 h-4 bg-slate-900 rounded-full transition-all duration-300 ${expression === 'thinking' ? 'animate-bounce h-1' : ''}`}>
               {expression === 'happy' && <div className="w-full h-1/2 bg-white/20 rounded-full mt-1 ml-1" />}
            </div>
            <div className={`w-4 h-4 bg-slate-900 rounded-full transition-all duration-300 ${expression === 'thinking' ? 'animate-bounce h-1' : ''}`}>
               {expression === 'happy' && <div className="w-full h-1/2 bg-white/20 rounded-full mt-1 ml-1" />}
            </div>
          </div>

          {/* Mouth */}
          <div className={`h-3 bg-slate-900 rounded-full transition-all duration-500 ${
            isTalking ? 'w-10 h-8 rounded-[50%]' : 
            expression === 'happy' ? 'w-12 h-4 rounded-b-full rounded-t-none' :
            expression === 'listening' ? 'w-4 h-4 rounded-full' :
            'w-6 h-1'
          }`} />
        </div>

        {/* Shine */}
        <div className="absolute top-8 left-12 w-12 h-6 bg-white/20 rounded-full blur-sm -rotate-45" />
      </div>

      <style>{`
        .floating-blob {
          animation: blob-morph 8s infinite ease-in-out;
        }
        @keyframes blob-morph {
          0%, 100% { border-radius: 45% 55% 50% 50% / 50% 50% 45% 55%; transform: translateY(0); }
          33% { border-radius: 55% 45% 55% 45% / 45% 55% 45% 55%; transform: translateY(-15px); }
          66% { border-radius: 45% 55% 45% 55% / 55% 45% 55% 45%; transform: translateY(10px); }
        }
      `}</style>
    </div>
  );
};
