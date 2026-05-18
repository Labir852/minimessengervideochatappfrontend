import React, { createContext, useState, useEffect, useContext } from 'react';
import signalrService from '../services/signalrService';
import axiosInstance from '../services/axios';
import { AuthContext } from './AuthContext';

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [activeChat, setActiveChat] = useState(null); // { id, type: 'user' | 'group', name }
  const [onlineUsers, setOnlineUsers] = useState([]); // Array of lowercase userIds

  useEffect(() => {
    if (!user) return;

    const handleReceiveMessage = (message) => {
      setMessages((prev) => [...prev, message]);
    };

    const handleReceiveGroupMessage = (message) => {
      setMessages((prev) => [...prev, message]);
    };

    const handleUserOnlineStatus = (userId, isOnline) => {
      setOnlineUsers(prev => {
        const uId = userId.toLowerCase();
        if (isOnline) {
          return prev.includes(uId) ? prev : [...prev, uId];
        } else {
          return prev.filter(id => id !== uId);
        }
      });
    };

    signalrService.on("ReceiveMessage", handleReceiveMessage);
    signalrService.on("ReceiveGroupMessage", handleReceiveGroupMessage);
    signalrService.on("UserOnlineStatus", handleUserOnlineStatus);

    // Fetch initial list of online users once connected
    const fetchOnlineUsers = async () => {
      try {
        setTimeout(async () => {
          if (signalrService.connection && signalrService.connection.state === "Connected") {
            const list = await signalrService.connection.invoke("GetOnlineUsers");
            if (list) {
              setOnlineUsers(list.map(id => id.toLowerCase()));
            }
          }
        }, 1000);
      } catch (err) {
        console.error("Failed to invoke GetOnlineUsers", err);
      }
    };

    fetchOnlineUsers();

    return () => {
      signalrService.off("ReceiveMessage", handleReceiveMessage);
      signalrService.off("ReceiveGroupMessage", handleReceiveGroupMessage);
      signalrService.off("UserOnlineStatus", handleUserOnlineStatus);
    };
  }, [user]);

  useEffect(() => {
    // Load history when activeChat changes
    if (activeChat) {
      loadHistory(activeChat);
      if (activeChat.type === 'group') {
        signalrService.joinGroup(activeChat.id);
      }
    } else {
      setMessages([]);
    }
  }, [activeChat]);

  const loadHistory = async (chat) => {
    try {
      let res;
      if (chat.type === 'user') {
        res = await axiosInstance.get(`/chat/history/user/${chat.id}`);
      } else {
        res = await axiosInstance.get(`/chat/history/group/${chat.id}`);
      }
      setMessages(res.data);
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const sendMessage = async (content) => {
    if (!activeChat) return;
    if (activeChat.type === 'user') {
      await signalrService.sendMessage(activeChat.id, content);
    } else {
      await signalrService.sendGroupMessage(activeChat.id, content);
    }
  };

  return (
    <ChatContext.Provider value={{ messages, activeChat, setActiveChat, sendMessage, onlineUsers }}>
      {children}
    </ChatContext.Provider>
  );
};
