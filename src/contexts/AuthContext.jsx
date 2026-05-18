import { createContext, useState, useEffect } from "react";
import {jwtDecode} from "jwt-decode";
import signalRService from "../services/signalrService";

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('token');
          setUser(null);
        } else {
          setUser(decoded);
          signalRService.startConnection(token);
        }
      } catch (error) {
        console.error("Invalid token:", error);
        localStorage.removeItem("token");
        setUser(null);
      }
    }
    setLoading(false);
  }, []);
  
  const login = (token) => {
    localStorage.setItem('token', token);
    const decoded = jwtDecode(token);
    setUser(decoded);
    signalRService.startConnection(token);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    signalRService.stopConnection();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {loading ? <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white animate-pulse">Loading app...</div> : children}
    </AuthContext.Provider>
  );
}
export default AuthProvider;