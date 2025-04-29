import React, { useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext';
import CallPage from '../components/CallPage';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const token = localStorage.getItem("token")
  console.log(user)
  return (
    <div>
      <h1>Welcome, {user?.email}</h1>
      <CallPage token={token} />
      <button onClick={logout}>Logout</button>
    </div>
  )
}

export default Dashboard