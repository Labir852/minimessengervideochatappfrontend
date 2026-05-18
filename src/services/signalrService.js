import * as signalR from "@microsoft/signalr";

class SignalRService {
  constructor() {
    this.connection = null;
    this.callbacks = {};
  }

  startConnection(token) {
    if (this.connection) return;

    const apiURL = import.meta.env.VITE_API_BASE_URL.replace('/api/', ''); // get base url
    
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${apiURL}/callHub`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    this.connection.start().then(() => {
      console.log("SignalR Connected!");
    }).catch(err => console.error("SignalR Connection Error: ", err));

    // Register all callbacks
    this.connection.on("ReceiveMessage", (message) => this.invoke("ReceiveMessage", message));
    this.connection.on("ReceiveGroupMessage", (message) => this.invoke("ReceiveGroupMessage", message));
    this.connection.on("ReceiveOffer", (from, offer) => this.invoke("ReceiveOffer", from, offer));
    this.connection.on("ReceiveAnswer", (from, answer) => this.invoke("ReceiveAnswer", from, answer));
    this.connection.on("ReceiveIceCandidate", (from, candidate) => this.invoke("ReceiveIceCandidate", from, candidate));
    this.connection.on("ReceiveEndCall", (fromUserId) => this.invoke("ReceiveEndCall", fromUserId));
    this.connection.on("UserJoinedMeeting", (userId) => this.invoke("UserJoinedMeeting", userId));
    this.connection.on("UserLeftMeeting", (userId) => this.invoke("UserLeftMeeting", userId));
    this.connection.on("UserTyping", (userId, groupId) => this.invoke("UserTyping", userId, groupId));
    this.connection.on("UserOnlineStatus", (userId, isOnline) => this.invoke("UserOnlineStatus", userId, isOnline));
  }

  stopConnection() {
    if (this.connection) {
      this.connection.stop();
      this.connection = null;
    }
  }

  on(eventName, callback) {
    if (!this.callbacks[eventName]) {
      this.callbacks[eventName] = [];
    }
    this.callbacks[eventName].push(callback);
  }

  off(eventName, callback) {
    if (this.callbacks[eventName]) {
      this.callbacks[eventName] = this.callbacks[eventName].filter(cb => cb !== callback);
    }
  }

  invoke(eventName, ...args) {
    if (this.callbacks[eventName]) {
      this.callbacks[eventName].forEach(cb => cb(...args));
    }
  }

  async sendMessage(receiverId, content) {
    if (this.connection) await this.connection.invoke("SendMessage", receiverId, content);
  }

  async sendGroupMessage(groupId, content) {
    if (this.connection) await this.connection.invoke("SendGroupMessage", groupId, content);
  }

  async sendTyping(receiverId) {
    if (this.connection) await this.connection.invoke("SendTyping", receiverId);
  }

  async sendGroupTyping(groupId) {
    if (this.connection) await this.connection.invoke("SendGroupTyping", groupId);
  }

  async sendOffer(receiverId, offer) {
    if (this.connection) await this.connection.invoke("SendOffer", receiverId, offer);
  }

  async sendAnswer(receiverId, answer) {
    if (this.connection) await this.connection.invoke("SendAnswer", receiverId, answer);
  }

  async sendIceCandidate(receiverId, candidate) {
    if (this.connection) await this.connection.invoke("SendIceCandidate", receiverId, candidate);
  }

  async sendEndCall(receiverId) {
    if (this.connection) await this.connection.invoke("SendEndCall", receiverId);
  }

  async joinMeeting(meetingId) {
    if (this.connection) await this.connection.invoke("JoinMeeting", meetingId);
  }

  async joinGroup(groupId) {
    if (this.connection) await this.connection.invoke("JoinGroup", groupId);
  }
}

export default new SignalRService();
