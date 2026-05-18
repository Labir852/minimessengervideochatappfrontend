import React, { useContext } from 'react';
import { CallContext } from '../contexts/CallContext';

export default function CallModal() {
  const { incomingCall, acceptCall, declineCall } = useContext(CallContext);

  if (!incomingCall) return null;

  return (
    <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-right-8 duration-300">
      <div className="glass-panel p-5 rounded-2xl shadow-2xl flex flex-col items-center min-w-[280px]">
        <div className="w-16 h-16 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-2xl mb-4 animate-pulse-slow">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </div>
        <h3 className="text-white font-medium mb-1">Incoming Call</h3>
        <p className="text-slate-400 text-sm mb-6">{incomingCall.fromUserId}</p>

        <div className="flex space-x-4 w-full">
          <button 
            onClick={declineCall}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors text-sm font-medium"
          >
            Decline
          </button>
          <button 
            onClick={() => acceptCall(true)}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors shadow-lg shadow-indigo-500/30 text-sm font-medium flex items-center justify-center gap-2"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
