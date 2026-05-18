import React, { useContext, useEffect, useRef } from 'react';
import { CallContext } from '../contexts/CallContext';

export default function ActiveCall() {
  const { activeCall, localStream, remoteStreams, endCall, toggleMute, toggleVideo } = useContext(CallContext);
  const localVideoRef = useRef(null);
  
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  if (!activeCall) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col animate-in fade-in duration-200">
      <div className="absolute top-6 left-6 z-10 text-white drop-shadow-md">
        <h2 className="text-lg font-bold">Secure Call</h2>
        <p className="text-xs text-white/70">End-to-end encrypted</p>
      </div>

      <div className="flex-1 flex p-6 relative h-full w-full justify-center items-center gap-4">
        {/* Remote Streams */}
        {Object.entries(remoteStreams).map(([userId, stream]) => (
          <VideoPlayer key={userId} stream={stream} isLocal={false} />
        ))}
        {Object.keys(remoteStreams).length === 0 && (
          <div className="text-white/50 text-xl font-medium animate-pulse">Waiting for others to join...</div>
        )}

        {/* Local Stream (PiP or grid depending on call type) */}
        <div className="absolute bottom-24 right-6 w-48 aspect-video bg-slate-800 rounded-xl overflow-hidden shadow-2xl border border-white/10">
           <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover mirror" />
        </div>
      </div>

      {/* Controls */}
      <div className="h-24 bg-gradient-to-t from-black to-transparent flex justify-center items-center space-x-6 pb-6">
        <button onClick={toggleMute} className="w-12 h-12 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white flex items-center justify-center backdrop-blur transition-all border border-white/10">
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
        </button>
        <button onClick={endCall} className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/40 transition-all hover:scale-105">
           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2.586-2.586a2 2 0 012.828 2.828l-2.586 2.586M8 16l-2.586 2.586a2 2 0 11-2.828-2.828l2.586-2.586M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>
        <button onClick={toggleVideo} className="w-12 h-12 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white flex items-center justify-center backdrop-blur transition-all border border-white/10">
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
        </button>
      </div>
    </div>
  );
}

const VideoPlayer = ({ stream, isLocal }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="flex-1 h-full max-h-full rounded-2xl overflow-hidden bg-slate-900 border border-white/5 relative shadow-2xl">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        className={`w-full h-full object-cover ${isLocal ? 'mirror' : ''}`} 
      />
    </div>
  );
};
