import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CallContext } from '../contexts/CallContext';
import { AuthContext } from '../contexts/AuthContext';
import signalrService from '../services/signalrService';
import ActiveCall from '../components/ActiveCall';
import axios from '../services/axios';

export default function MeetingRoom() {
  const { meetingLink } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { startCall, activeCall } = useContext(CallContext);
  const [meeting, setMeeting] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Verify meeting link
    const verify = async () => {
      try {
        const res = await axios.get(`/meeting/verify/${meetingLink}`);
        setMeeting(res.data);
      } catch (err) {
        setError('Invalid or expired meeting link.');
      }
    };
    verify();
  }, [meetingLink]);

  const joinMeeting = async () => {
    if (!user) {
      // Need to be logged in
      navigate('/login');
      return;
    }
    await signalrService.joinMeeting(meetingLink);
    // startCall with video, isGroup = true
    await startCall(meetingLink, true);
  };

  if (error) {
    return <div className="h-screen flex items-center justify-center bg-slate-900 text-red-400">{error}</div>;
  }

  if (!meeting) {
    return <div className="h-screen flex items-center justify-center bg-slate-900 text-white animate-pulse">Loading meeting details...</div>;
  }

  return (
    <div className="h-screen w-full bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none"></div>
      
      {!activeCall ? (
        <div className="glass-panel p-10 rounded-3xl w-full max-w-md text-center z-10">
          <div className="w-20 h-20 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-400">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{meeting.title}</h2>
          <p className="text-slate-400 mb-8">Hosted by {meeting.userName}</p>
          
          <button 
            onClick={joinMeeting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/30"
          >
            Join Meeting
          </button>
        </div>
      ) : (
        <ActiveCall />
      )}
    </div>
  );
}
