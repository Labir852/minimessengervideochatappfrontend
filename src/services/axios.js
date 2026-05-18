import axios from "axios";

const apiURL = import.meta.env.VITE_API_BASE_URL;

const axiosInstance = axios.create({
  baseURL: apiURL, 
  withCredentials: true,
});

// Request Interceptor
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Check if error is 401 Unauthorized
    if (error.response && error.response.status === 401) {
      console.warn("Unauthorized access detected. Logging out...");
      localStorage.removeItem('token');
      // Force redirect to login page
      window.location.href = '/login';
    }

    // Generic error formatting safely
    let errorMsg = "An unexpected error occurred";
    if (error.response?.data) {
        if (typeof error.response.data === 'string') {
            errorMsg = error.response.data;
        } else if (error.response.data.message) {
            errorMsg = typeof error.response.data.message === 'string' 
                ? error.response.data.message 
                : JSON.stringify(error.response.data.message);
        } else if (error.response.data.errors) {
            errorMsg = Object.values(error.response.data.errors).flat().join(" ");
        } else if (error.response.data.title) {
            errorMsg = error.response.data.title;
        }
    } else if (error.message) {
        errorMsg = error.message;
    }

    const customError = new Error(errorMsg);
    customError.response = error.response;
    
    return Promise.reject(customError);
  }
);

export default axiosInstance;
