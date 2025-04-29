import axios from "axios";
const apiURL = import.meta.env.VITE_API_BASE_URL;
const axiosInstance = axios.create({
  baseURL: apiURL, 
  withCredentials: true, // if you are using cookies
});

axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

export default axiosInstance;
