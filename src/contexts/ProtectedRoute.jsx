import { useContext,} from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "./AuthContext"; // Adjust the path if needed


const ProtectedRoute = ({ children }) => {
  const { user,loading } = useContext(AuthContext);
  console.log("ProtectedRoute - user:", user, "loading:", loading);

  if (loading) {
    return <div>Loading...</div>; // or a spinner
  }
  if (!user) {
    return <Navigate to="/login"  />;
  }
    return children
  

};

export default ProtectedRoute;
