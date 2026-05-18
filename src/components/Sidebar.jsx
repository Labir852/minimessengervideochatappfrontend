import React, { useContext, useEffect, useState } from 'react';
import { ChatContext } from '../contexts/ChatContext';
import { AuthContext } from '../contexts/AuthContext';
import axios from '../services/axios';
import signalrService from '../services/signalrService';

const formatPreviewText = (content) => {
  try {
    if (content && content.startsWith("{")) {
      const parsed = JSON.parse(content);
      if (parsed.attachment) {
        return `📎 File: ${parsed.attachment.name}`;
      }
      return parsed.text || "";
    }
  } catch (e) {}
  return content;
};

export default function Sidebar() {
  const { setActiveChat, activeChat, onlineUsers = [] } = useContext(ChatContext);
  const { user, logout } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [tab, setTab] = useState('users'); // 'users' or 'groups'
  const [previews, setPreviews] = useState({}); // { id: "preview text" }
  const [typingStates, setTypingStates] = useState({}); // { key: boolean }
  const [typingTimeouts, setTypingTimeouts] = useState({});
  const [unreadChats, setUnreadChats] = useState({}); // { chatId: boolean }
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  useEffect(() => {
    loadData();
  }, [tab]);

  useEffect(() => {
    if (activeChat) {
      const idKey = activeChat.type === 'user' ? activeChat.id.toLowerCase() : activeChat.id;
      setUnreadChats(prev => ({ ...prev, [idKey]: false }));
    }
  }, [activeChat]);

  useEffect(() => {
    const handleReceiveMessage = (msg) => {
      const myId = (user?.userId || user?.nameid || user?.sub || "").toLowerCase();
      const sender = (msg.senderId || "").toLowerCase();
      const receiver = (msg.receiverId || "").toLowerCase();
      const otherId = sender === myId ? receiver : sender;
      setPreviews(prev => ({ ...prev, [otherId]: formatPreviewText(msg.content) }));

      // Bold / unread logic
      if (!activeChat || activeChat.id?.toLowerCase() !== otherId.toLowerCase()) {
        setUnreadChats(prev => ({ ...prev, [otherId]: true }));
      }
    };
    
    const handleReceiveGroupMessage = (msg) => {
      setPreviews(prev => ({ ...prev, [msg.groupId]: formatPreviewText(msg.content) }));

      // Bold / unread logic
      if (!activeChat || activeChat.id !== msg.groupId) {
        setUnreadChats(prev => ({ ...prev, [msg.groupId]: true }));
      }
    };

    const handleUserTyping = (userId, groupId) => {
      const idKey = groupId > 0 ? String(groupId) : userId.toLowerCase();
      setTypingStates(prev => ({ ...prev, [idKey]: true }));

      if (typingTimeouts[idKey]) clearTimeout(typingTimeouts[idKey]);
      const timeout = setTimeout(() => {
        setTypingStates(prev => ({ ...prev, [idKey]: false }));
      }, 3000);
      setTypingTimeouts(prev => ({ ...prev, [idKey]: timeout }));
    };

    signalrService.on("ReceiveMessage", handleReceiveMessage);
    signalrService.on("ReceiveGroupMessage", handleReceiveGroupMessage);
    signalrService.on("UserTyping", handleUserTyping);

    return () => {
      signalrService.off("ReceiveMessage", handleReceiveMessage);
      signalrService.off("ReceiveGroupMessage", handleReceiveGroupMessage);
      signalrService.off("UserTyping", handleUserTyping);
    };
  }, [user, activeChat, typingTimeouts]);

  const loadData = async () => {
    try {
      if (tab === 'users') {
        const res = await axios.get('/users');
        setUsers(res.data || []);
        const newPreviews = {};
        res.data.forEach(u => {
          if (u.lastMessage) {
            newPreviews[u.id.toLowerCase()] = formatPreviewText(u.lastMessage);
          }
        });
        setPreviews(prev => ({ ...prev, ...newPreviews }));
      } else {
        const res = await axios.get('/group');
        setGroups(res.data || []);
        const newPreviews = {};
        res.data.forEach(g => {
          if (g.lastMessage) {
            newPreviews[g.id] = formatPreviewText(g.lastMessage);
          }
        });
        setPreviews(prev => ({ ...prev, ...newPreviews }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      const res = await axios.post('/group', { Name: newGroupName });
      if (res.data) {
        setNewGroupName("");
        setShowCreateModal(false);
        await loadData();
        selectChat(res.data.id, res.data.name, 'group');
      }
    } catch (err) {
      console.error("Failed to create group", err);
    }
  };

  const selectChat = (id, name, type) => {
    setActiveChat({ id, name, type });
    const idKey = type === 'user' ? id.toLowerCase() : id;
    setUnreadChats(prev => ({ ...prev, [idKey]: false }));
  };

  return (
    <div className="w-80 h-full border-r border-slate-800 bg-slate-900/50 flex flex-col">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white mb-4 tracking-tight">Messages</h2>
        <div className="flex space-x-2 bg-slate-800 p-1 rounded-lg">
          <button 
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${tab === 'users' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setTab('users')}
          >
            Direct
          </button>
          <button 
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${tab === 'groups' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setTab('groups')}
          >
            Groups
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {tab === 'users' ? (
          users.map(u => (
            <div 
              key={u.id}
              onClick={() => selectChat(u.id, u.userName, 'user')}
              className={`p-3 rounded-xl cursor-pointer transition-all flex items-center space-x-3 ${activeChat?.id === u.id ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-slate-800 border border-transparent'}`}
            >
              <div className="relative shrink-0 select-none">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shrink-0">
                  {u.userName.charAt(0).toUpperCase()}
                </div>
                <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                  onlineUsers.includes(u.id.toLowerCase()) ? 'bg-green-500 animate-pulse shadow-sm shadow-green-500/55' : 'bg-rose-500 animate-pulse shadow-sm shadow-rose-500/55'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate flex justify-between items-center">
                  <span>{u.userName}</span>
                  {unreadChats[u.id.toLowerCase()] && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 shadow-sm animate-pulse" />
                  )}
                </p>
                {typingStates[u.id.toLowerCase()] ? (
                  <p className="text-xs text-indigo-400 italic font-semibold animate-pulse">typing...</p>
                ) : (
                  <p className={`text-xs truncate ${unreadChats[u.id.toLowerCase()] ? 'text-slate-100 font-semibold' : 'text-slate-400 font-normal'}`}>
                    {previews[u.id.toLowerCase()] || "Tap to chat"}
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-2">
            {!showCreateModal ? (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="w-full p-2.5 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500/50 hover:bg-indigo-600/5 text-slate-400 hover:text-indigo-400 transition-all text-xs font-semibold flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Create New Group</span>
              </button>
            ) : (
              <form 
                onSubmit={handleCreateGroup}
                className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-xl space-y-3 animate-in slide-in-from-top-2 duration-200"
              >
                <p className="text-xs font-bold text-slate-200 uppercase tracking-wider">New Group Name</p>
                <input 
                  type="text" 
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Project Alpha"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-all"
                />
                <div className="flex space-x-2">
                  <button 
                    type="submit"
                    className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
                  >
                    Create
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setShowCreateModal(false); setNewGroupName(""); }}
                    className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600 rounded-lg text-xs font-semibold transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {groups.length === 0 ? <p className="text-slate-500 text-center mt-4 text-xs font-normal">No groups found.</p> :
            groups.map(g => (
              <div 
                key={g.id}
                onClick={() => selectChat(g.id, g.name, 'group')}
                className={`p-3 rounded-xl cursor-pointer transition-all flex items-center space-x-3 ${activeChat?.id === g.id ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-slate-800 border border-transparent'}`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-white font-bold shrink-0">
                  #
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate flex justify-between items-center">
                    <span>{g.name}</span>
                    {unreadChats[g.id] && (
                      <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0 shadow-sm animate-pulse" />
                    )}
                  </p>
                  {typingStates[g.id] ? (
                    <p className="text-xs text-indigo-400 italic font-semibold animate-pulse">typing...</p>
                  ) : (
                    <p className={`text-xs truncate ${unreadChats[g.id] ? 'text-slate-100 font-semibold' : 'text-slate-400 font-normal'}`}>
                      {previews[g.id] || "Group"}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Menu / Logout at bottom of sidebar */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/80 space-y-3 shrink-0">
        <div className="flex items-center space-x-3 bg-slate-900/50 border border-slate-800/80 p-3 rounded-xl">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20">
              {(user?.unique_name || user?.name || user?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-slate-950 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1.5">
              <p className="text-xs font-semibold text-white truncate">
                {user?.unique_name || user?.name || user?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || user?.email?.split('@')[0]}
              </p>
              <span className="bg-indigo-500/20 text-[9px] font-bold text-indigo-300 px-1.5 py-0.5 rounded uppercase tracking-wider select-none shrink-0 border border-indigo-500/30">Active</span>
            </div>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">{user?.email}</p>
          </div>
        </div>
        <button 
          onClick={logout} 
          className="w-full py-2 text-xs text-center text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/20 rounded-xl transition-all font-semibold bg-slate-900/60 hover:bg-red-500/5"
        >
          Logout Session
        </button>
      </div>
    </div>
  );
}
