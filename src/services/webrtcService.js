import signalRService from "./signalrService";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
  ],
};

class WebRTCService {
  constructor() {
    this.peerConnections = {}; // targetUserId -> RTCPeerConnection
    this.iceCandidateQueue = {}; // targetUserId -> []
    this.localStream = null;
    this.onRemoteTrack = null; // Callback: (userId, stream) => void
  }

  setLocalStream(stream) {
    this.localStream = stream;
  }

  createPeerConnection(targetUserId) {
    const id = targetUserId.toLowerCase();
    if (this.peerConnections[id]) {
      return this.peerConnections[id];
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    if (!this.iceCandidateQueue[id]) {
      this.iceCandidateQueue[id] = [];
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        signalRService.sendIceCandidate(id, JSON.stringify(event.candidate));
      }
    };

    pc.ontrack = (event) => {
      if (this.onRemoteTrack) {
        this.onRemoteTrack(id, event.streams[0]);
      }
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream);
      });
    }

    this.peerConnections[id] = pc;
    return pc;
  }

  async processQueuedCandidates(targetUserId) {
    const id = targetUserId.toLowerCase();
    const pc = this.peerConnections[id];
    const queue = this.iceCandidateQueue[id];
    if (pc && pc.remoteDescription && queue && queue.length > 0) {
      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (e) {
          console.error("Failed to add queued ice candidate", e);
        }
      }
      this.iceCandidateQueue[id] = [];
    }
  }

  async createOffer(targetUserId) {
    const id = targetUserId.toLowerCase();
    const pc = this.createPeerConnection(id);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await signalRService.sendOffer(id, JSON.stringify(offer));
  }

  async handleOffer(fromUserId, offerStr) {
    const id = fromUserId.toLowerCase();
    const pc = this.createPeerConnection(id);
    await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerStr)));
    await this.processQueuedCandidates(id);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await signalRService.sendAnswer(id, JSON.stringify(answer));
  }

  async handleAnswer(fromUserId, answerStr) {
    const id = fromUserId.toLowerCase();
    const pc = this.peerConnections[id];
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(answerStr)));
      await this.processQueuedCandidates(id);
    }
  }

  async handleIceCandidate(fromUserId, candidateStr) {
    const id = fromUserId.toLowerCase();
    const pc = this.peerConnections[id];
    const candidate = new RTCIceCandidate(JSON.parse(candidateStr));
    
    if (pc && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (e) {
        console.error("Error adding ice candidate", e);
      }
    } else {
      // Queue until peer connection is created and remote description is set
      if (!this.iceCandidateQueue[id]) this.iceCandidateQueue[id] = [];
      this.iceCandidateQueue[id].push(candidate);
    }
  }

  endCall(targetUserId) {
    const id = targetUserId.toLowerCase();
    if (this.peerConnections[id]) {
      this.peerConnections[id].close();
      delete this.peerConnections[id];
    }
  }

  endAllCalls() {
    Object.values(this.peerConnections).forEach(pc => pc.close());
    this.peerConnections = {};
    this.iceCandidateQueue = {};
  }
}

export default new WebRTCService();
