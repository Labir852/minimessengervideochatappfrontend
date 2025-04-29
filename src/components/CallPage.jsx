// CallPage.jsx
import React, { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";

const CallPage = ({ token, targetUserId }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const connectionRef = useRef(null);
  const peerConnectionRef = useRef(null);

  const [hubConnection, setHubConnection] = useState(null);

  const ICE_SERVERS = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      // You can add TURN servers here if needed
    ],
  };

  useEffect(() => {
    const start = async () => {
      // Initialize SignalR connection
      const connection = new signalR.HubConnectionBuilder()
        .withUrl("https://localhost:5173/callHub", {
          accessTokenFactory: () => token,
        })
        .withAutomaticReconnect()
        .build();

      connection.on("ReceiveOffer", async (fromUserId, offer) => {
        await handleReceiveOffer(fromUserId, offer);
      });

      connection.on("ReceiveAnswer", async (fromUserId, answer) => {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(JSON.parse(answer))
        );
      });

      connection.on("ReceiveIceCandidate", async (fromUserId, candidate) => {
        try {
          await peerConnectionRef.current.addIceCandidate(JSON.parse(candidate));
        } catch (error) {
          console.error("Error adding ICE candidate", error);
        }
      });

      await connection.start();
      setHubConnection(connection);

      // Get local media
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideoRef.current.srcObject = stream;

      // Store stream
      connectionRef.current = stream;
    };

    start();
  }, []);

  const createPeerConnection = (isInitiator) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && hubConnection) {
        hubConnection.invoke(
          "SendIceCandidate",
          targetUserId,
          JSON.stringify(event.candidate)
        );
      }
    };

    pc.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    connectionRef.current.getTracks().forEach((track) => {
      pc.addTrack(track, connectionRef.current);
    });

    peerConnectionRef.current = pc;

    return pc;
  };

  const callUser = async () => {
    const pc = createPeerConnection(true);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await hubConnection.invoke("SendOffer", targetUserId, JSON.stringify(offer));
  };

  const handleReceiveOffer = async (fromUserId, offer) => {
    const pc = createPeerConnection(false);

    await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offer)));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await hubConnection.invoke("SendAnswer", fromUserId, JSON.stringify(answer));
  };

  return (
    <div>
      <h2>Video Call</h2>
      <div style={{ display: "flex", gap: "20px" }}>
        <video ref={localVideoRef} autoPlay muted width="300" />
        <video ref={remoteVideoRef} autoPlay width="300" />
      </div>
      <button onClick={callUser}>Call</button>
    </div>
  );
};

export default CallPage;
