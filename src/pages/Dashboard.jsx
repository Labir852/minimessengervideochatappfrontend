import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
import ActiveCall from '../components/ActiveCall';
import CallModal from '../components/CallModal';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="h-screen w-full flex bg-slate-900 text-slate-100 overflow-hidden font-sans">
      <Sidebar />
      <ChatArea />
      <ActiveCall />
      <CallModal />
    </div>
  )
}

export default Dashboard;