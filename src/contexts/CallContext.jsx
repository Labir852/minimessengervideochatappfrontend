import React, { createContext, useState, useEffect, useContext } from 'react';
import signalrService from '../services/signalrService';
import webrtcService from '../services/webrtcService';
import ringtoneService from '../services/ringtoneService';
import { AuthContext } from './AuthContext';

export const CallContext = createContext();

export const CallProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [incomingCall, setIncomingCall] = useState(null); // { fromUserId }
  const [activeCall, setActiveCall] = useState(null); // { targetUserId, type: 'video' | 'audio', isGroup }
  const [remoteStreams, setRemoteStreams] = useState({}); // { userId: stream }
  const [localStream, setLocalStream] = useState(null);

  useEffect(() => {
    if (incomingCall) {
      ringtoneService.startIncoming();
    } else if (activeCall && Object.keys(remoteStreams).length === 0) {
      ringtoneService.startOutgoing();
    } else {
      ringtoneService.stop();
    }
    return () => ringtoneService.stop();
  }, [incomingCall, activeCall, remoteStreams]);

  useEffect(() => {
    if (!user) return;

    webrtcService.onRemoteTrack = (userId, stream) => {
      setRemoteStreams(prev => ({ ...prev, [userId]: stream }));
    };

    const handleReceiveOffer = (fromUserId, offer) => {
      if (!activeCall) {
        setIncomingCall({ fromUserId, offer });
      } else {
        // If already in call, automatically answer (useful for mesh group calls)
        webrtcService.handleOffer(fromUserId, offer);
      }
    };

    const handleReceiveAnswer = (fromUserId, answer) => {
      webrtcService.handleAnswer(fromUserId, answer);
    };

    const handleReceiveIceCandidate = (fromUserId, candidate) => {
      webrtcService.handleIceCandidate(fromUserId, candidate);
    };

    const handleReceiveEndCall = (fromUserId) => {
      endCall(false);
      setIncomingCall(null);
    };

    signalrService.on("ReceiveOffer", handleReceiveOffer);
    signalrService.on("ReceiveAnswer", handleReceiveAnswer);
    signalrService.on("ReceiveIceCandidate", handleReceiveIceCandidate);
    signalrService.on("ReceiveEndCall", handleReceiveEndCall);

    return () => {
      signalrService.off("ReceiveOffer", handleReceiveOffer);
      signalrService.off("ReceiveAnswer", handleReceiveAnswer);
      signalrService.off("ReceiveIceCandidate", handleReceiveIceCandidate);
      signalrService.off("ReceiveEndCall", handleReceiveEndCall);
    };
  }, [user, activeCall]);

  const initLocalStream = async (video = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio: true });
      setLocalStream(stream);
      webrtcService.setLocalStream(stream);
      return stream;
    } catch (e) {
      console.warn("Failed to get local stream with requested constraints, trying fallback", e);
      if (video) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          setLocalStream(stream);
          webrtcService.setLocalStream(stream);
          return stream;
        } catch (err) {
          console.error("Failed to get audio-only stream", err);
        }
      }
      return null;
    }
  };

  const startCall = async (targetUserId, video = true) => {
    await initLocalStream(video);
    setActiveCall({ targetUserId, type: video ? 'video' : 'audio', isGroup: false, isCaller: true });
    await webrtcService.createOffer(targetUserId);
  };

  const acceptCall = async (video = true) => {
    if (!incomingCall) return;
    await initLocalStream(video);
    setActiveCall({ targetUserId: incomingCall.fromUserId, type: video ? 'video' : 'audio', isGroup: false, isCaller: false });
    await webrtcService.handleOffer(incomingCall.fromUserId, incomingCall.offer);
    setIncomingCall(null);
  };

  const declineCall = () => {
    if (incomingCall) {
      signalrService.sendEndCall(incomingCall.fromUserId);
      // Missed call message logged by the caller upon receiving end call signal.
    }
    setIncomingCall(null);
  };

  const endCall = (notify = true) => {
    if (notify && activeCall) {
      signalrService.sendEndCall(activeCall.targetUserId);
    }
    if (activeCall && Object.keys(remoteStreams).length === 0 && activeCall.isCaller) {
      const missedMsg = `Missed ${activeCall.type} call`;
      signalrService.sendMessage(activeCall.targetUserId, missedMsg);
    }
    webrtcService.endAllCalls();
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
    setActiveCall(null);
    setRemoteStreams({});
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
    }
  };

  return (
    <CallContext.Provider value={{
      incomingCall, activeCall, remoteStreams, localStream,
      startCall, acceptCall, declineCall, endCall, toggleMute, toggleVideo
    }}>
      {children}
    </CallContext.Provider>
  );
};
