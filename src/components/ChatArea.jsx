import React, { useContext, useState, useRef, useEffect } from 'react';
import { ChatContext } from '../contexts/ChatContext';
import { CallContext } from '../contexts/CallContext';
import { AuthContext } from '../contexts/AuthContext';
import signalrService from '../services/signalrService';

const parseMessageContent = (content) => {
  try {
    if (content && content.startsWith("{")) {
      const parsed = JSON.parse(content);
      return {
        isReply: !!parsed.replyTo,
        parentSenderName: parsed.replyTo?.sender || "",
        parentContent: parsed.replyTo?.text || "",
        actualContent: parsed.text || "",
        attachment: parsed.attachment || null
      };
    }
  } catch (e) {}
  return {
    isReply: false,
    actualContent: content,
    attachment: null
  };
};

const getAttachmentUrl = (data) => {
  if (!data) return "";
  if (data.startsWith("data:") || data.startsWith("http://") || data.startsWith("https://")) {
    return data;
  }
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5051";
  const sanitizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const sanitizedPath = data.startsWith("/") ? data : `/${data}`;
  return `${sanitizedBase}${sanitizedPath}`;
};

export default function ChatArea() {
  const { user } = useContext(AuthContext);
  const { activeChat, messages, sendMessage, onlineUsers = [] } = useContext(ChatContext);
  const { startCall } = useContext(CallContext);
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null); // { senderName: "...", content: "..." }
  const [selectedFile, setSelectedFile] = useState(null); // { name, type, size, data }
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const endOfMessagesRef = useRef(null);

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedFile({
        name: file.name,
        type: file.type,
        size: file.size,
        data: event.target.result
      });
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    const handleUserTyping = (userId, groupId) => {
      // Show typing if it matches our active chat
      if (activeChat?.type === 'user' && userId?.toLowerCase() === activeChat.id?.toLowerCase()) {
        showTypingIndicator();
      } else if (activeChat?.type === 'group' && groupId === activeChat.id) {
        showTypingIndicator();
      }
    };

    signalrService.on("UserTyping", handleUserTyping);
    return () => {
      signalrService.off("UserTyping", handleUserTyping);
    };
  }, [activeChat]);

  const showTypingIndicator = () => {
    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (activeChat) {
      if (activeChat.type === 'user') {
        signalrService.sendTyping(activeChat.id);
      } else {
        signalrService.sendGroupTyping(activeChat.id);
      }
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (text.trim() || selectedFile) {
      let finalContent = text;
      
      if (selectedFile) {
        finalContent = JSON.stringify({
          text: text,
          attachment: {
            name: selectedFile.name,
            type: selectedFile.type,
            size: selectedFile.size,
            data: selectedFile.data
          },
          replyTo: replyToMessage ? {
            sender: replyToMessage.senderName,
            text: replyToMessage.content
          } : null
        });
        setSelectedFile(null);
        setReplyToMessage(null);
      } else if (replyToMessage) {
        finalContent = JSON.stringify({
          replyTo: {
            sender: replyToMessage.senderName,
            text: replyToMessage.content
          },
          text: text
        });
        setReplyToMessage(null);
      }
      
      sendMessage(finalContent);
      setText("");
    }
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/30 relative">
         <div className="w-24 h-24 mb-6 rounded-full bg-slate-800 flex items-center justify-center">
            <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
         </div>
         <h3 className="text-xl font-medium text-slate-300">Select a chat to start messaging</h3>
         <p className="text-slate-500 mt-2 text-sm">Choose from your existing conversations or start a new one.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-900/30 relative">
      {/* Header */}
      <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md z-10 select-none">
        <div className="flex items-center space-x-3">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              {activeChat.name.charAt(0).toUpperCase()}
            </div>
            {activeChat.type === 'user' && (
              <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                onlineUsers.includes(activeChat.id?.toLowerCase()) ? 'bg-green-500 animate-pulse shadow-sm shadow-green-500/55' : 'bg-slate-650'
              }`} />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-white tracking-wide">{activeChat.name}</h3>
            {activeChat.type === 'group' ? (
              <p className="text-xs text-slate-400">Group Chat</p>
            ) : onlineUsers.includes(activeChat.id?.toLowerCase()) ? (
              <p className="text-xs text-green-400 font-semibold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping shrink-0" />
                <span>Active Now</span>
              </p>
            ) : (
              <p className="text-xs text-slate-400 font-medium mt-0.5">Offline</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            title="Audio Call"
            onClick={() => startCall(activeChat.id, false)}
            className="p-2.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-indigo-400 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-sm font-medium hidden md:block">Audio Call</span>
          </button>
          <button 
            title="Video Call"
            onClick={() => startCall(activeChat.id, true)}
            className="p-2.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-indigo-400 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium hidden md:block">Video Call</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((m, i) => {
          const myId = (user?.userId || user?.nameid || user?.sub || user?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || "").toLowerCase();
          const isMine = m.senderId?.toLowerCase() === myId || m.senderId?.toLowerCase() === user?.email?.toLowerCase(); 
          
          const isMissedCall = m.content?.toLowerCase()?.startsWith("missed ") && m.content?.toLowerCase()?.endsWith(" call");

          if (isMissedCall) {
            return (
              <div key={m.id || i} className="flex justify-center my-3 animate-in fade-in duration-300">
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-full px-4 py-1.5 text-xs flex items-center space-x-2 shadow-sm">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2.586-2.586a2 2 0 012.828 2.828l-2.586 2.586M8 16l-2.586 2.586a2 2 0 11-2.828-2.828l2.586-2.586M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-semibold">{m.content}</span>
                  <span className="text-[10px] text-red-400/60">
                    {new Date(m.sentAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div 
              key={m.id || i} 
              className={`flex items-center mb-4 group ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              {/* If Mine (right side), show Reply button on hover BEFORE the bubble card */}
              {isMine && (
                <button
                  type="button"
                  onClick={() => setReplyToMessage({ 
                    senderName: "You", 
                    content: parseMessageContent(m.content).actualContent 
                  })}
                  className="opacity-0 group-hover:opacity-100 mr-3 p-1.5 rounded-full bg-slate-800 border border-slate-750 text-slate-400 hover:text-indigo-400 hover:scale-105 transition-all shadow-md shrink-0"
                  title="Reply to this message"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </button>
              )}

              <div className={`max-w-[70%] rounded-2xl px-5 py-3 ${
                isMine 
                  ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/20' 
                  : 'bg-slate-800 text-slate-200 rounded-bl-none shadow-md shadow-slate-900/50'
              }`}>
                {!isMine && activeChat.type === 'group' && (
                  <p className="text-xs font-semibold text-indigo-300 mb-1">{m.senderName}</p>
                )}

                {/* Render Quoted Reply Box & Attachments */}
                {(() => {
                  const parsed = parseMessageContent(m.content);
                  return (
                    <>
                      {parsed.isReply && (
                        <div className="mb-2 p-2 bg-black/20 rounded-lg border-l-2 border-indigo-400 text-[11px] text-slate-300 select-none">
                          <p className="font-bold text-[9px] text-indigo-300">{parsed.parentSenderName}</p>
                          <p className="truncate opacity-80">{parsed.parentContent}</p>
                        </div>
                      )}
                      
                      {/* Premium Media/File Attachment Previews */}
                      {parsed.attachment && (
                        <div className="mb-2 space-y-2 select-text">
                          {parsed.attachment.type?.startsWith("image/") && (
                            <div className="max-w-sm rounded-lg overflow-hidden border border-slate-700/60 bg-slate-900/40 shadow-inner">
                              <img 
                                src={getAttachmentUrl(parsed.attachment.data)} 
                                alt={parsed.attachment.name} 
                                className="w-full max-h-60 object-contain hover:scale-[1.01] cursor-pointer transition-all duration-200" 
                                onClick={() => {
                                  const w = window.open();
                                  w.document.write(`<img src="${getAttachmentUrl(parsed.attachment.data)}" style="max-width:100%; max-height:100vh; display:block; margin:auto;"/>`);
                                }}
                              />
                            </div>
                          )}
                          {parsed.attachment.type?.startsWith("video/") && (
                            <div className="max-w-sm rounded-lg overflow-hidden border border-slate-700/60 bg-slate-900/40 shadow-inner">
                              <video 
                                src={getAttachmentUrl(parsed.attachment.data)} 
                                controls 
                                className="w-full max-h-60" 
                              />
                            </div>
                          )}
                          {parsed.attachment.type?.startsWith("audio/") && (
                            <div className="w-60 rounded-lg border border-slate-700/60 bg-slate-900/40 p-2 shadow-inner">
                              <audio 
                                src={getAttachmentUrl(parsed.attachment.data)} 
                                controls 
                                className="w-full h-8" 
                              />
                            </div>
                          )}
                          
                          {/* General/Downloadable Attachment Pill */}
                          <div className="flex items-center justify-between bg-black/25 hover:bg-black/35 border border-slate-700/60 p-2.5 rounded-xl transition-all">
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px] shrink-0 uppercase">
                                {parsed.attachment.name.split('.').pop() || 'FILE'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-100 truncate max-w-[140px]" title={parsed.attachment.name}>{parsed.attachment.name}</p>
                                <p className="text-[9px] text-slate-400 font-medium">
                                  {parsed.attachment.size ? `${(parsed.attachment.size / 1024).toFixed(1)} KB` : 'Attachment'}
                                </p>
                              </div>
                            </div>
                            <a 
                              href={getAttachmentUrl(parsed.attachment.data)} 
                              download={parsed.attachment.name}
                              className="ml-3 p-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-all text-xs font-semibold shrink-0 flex items-center gap-1 select-none"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              <span>Save</span>
                            </a>
                          </div>
                        </div>
                      )}
                      
                      {parsed.actualContent && (
                        <p className="text-sm whitespace-pre-wrap">{parsed.actualContent}</p>
                      )}
                    </>
                  );
                })()}

                <p className={`text-[10px] mt-1.5 text-right ${isMine ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {new Date(m.sentAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>

              {/* If Receiver (left side), show Reply button on hover AFTER the bubble card */}
              {!isMine && (
                <button
                  type="button"
                  onClick={() => setReplyToMessage({ 
                    senderName: m.senderName || activeChat.name, 
                    content: parseMessageContent(m.content).actualContent 
                  })}
                  className="opacity-0 group-hover:opacity-100 ml-3 p-1.5 rounded-full bg-slate-800 border border-slate-750 text-slate-400 hover:text-indigo-400 hover:scale-105 transition-all shadow-md shrink-0"
                  title="Reply to this message"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-bl-none px-4 py-3 text-xs italic flex items-center space-x-1">
              <span className="animate-bounce delay-75">•</span>
              <span className="animate-bounce delay-150">•</span>
              <span className="animate-bounce delay-300">•</span>
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Reply Preview Bar */}
      {replyToMessage && (
        <div className="px-6 py-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-150 relative">
          <div className="flex items-center space-x-3 border-l-2 border-indigo-500 pl-3 min-w-0">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Replying to {replyToMessage.senderName}</p>
              <p className="text-xs text-slate-300 truncate max-w-[500px]">{replyToMessage.content}</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setReplyToMessage(null)}
            className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
            title="Cancel reply"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Attachment Preview Bar */}
      {selectedFile && (
        <div className="px-6 py-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-150 select-none">
          <div className="flex items-center space-x-3 min-w-0">
            {selectedFile.type.startsWith("image/") ? (
              <img src={selectedFile.data} alt="Upload preview" className="w-12 h-12 object-cover rounded-lg border border-slate-700 shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                {selectedFile.name.split('.').pop() || 'FILE'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-indigo-400 truncate max-w-[300px]">{selectedFile.name}</p>
              <p className="text-[10px] text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setSelectedFile(null)}
            className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
            title="Remove file"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-slate-900/80 backdrop-blur-md border-t border-slate-800">
        <form onSubmit={handleSend} className="flex items-center space-x-3 bg-slate-800/80 rounded-full p-1.5 border border-slate-700 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />
          <button 
            type="button" 
            onClick={handleAttachmentClick}
            className="p-2 text-slate-400 hover:text-indigo-400 transition-colors rounded-full hover:bg-slate-700/50"
            title="Add attachment"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input
            type="text"
            value={text}
            onChange={handleTextChange}
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-none text-white focus:outline-none focus:ring-0 text-sm placeholder-slate-500"
          />
          <button 
            type="submit" 
            disabled={!text.trim() && !selectedFile}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white p-2.5 rounded-full transition-all shadow-md shadow-indigo-600/30"
          >
            <svg className="w-4 h-4 translate-x-0.5 -translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
