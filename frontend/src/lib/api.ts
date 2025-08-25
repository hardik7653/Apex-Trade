import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

const api = axios.create({ 
  baseURL, 
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any auth tokens here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Validate response data to prevent NaN values
    if (response.data && typeof response.data === 'object') {
      // Check if response contains NaN or invalid numeric values
      const checkForNaN = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        
        Object.keys(obj).forEach(key => {
          if (obj[key] !== null && typeof obj[key] === 'object') {
            checkForNaN(obj[key]);
          } else if (typeof obj[key] === 'number' && isNaN(obj[key])) {
            obj[key] = null; // Replace NaN with null
          }
        });
      };
      
      checkForNaN(response.data);
    }
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    // Create a standardized error response
    const errorResponse = {
      success: false,
      error: error.response?.data?.detail || error.response?.data?.message || error.message || 'Unknown error occurred',
      status: error.response?.status || 500
    };
    return Promise.reject(errorResponse);
  }
);

export default api;
