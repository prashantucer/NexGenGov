// Configuration for NGIS Backend API
// Defaults to Render / cloud URL when deployed, or localhost for local testing
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  'http://127.0.0.1:8000'
).replace(/\/+$/, ''); // Remove trailing slash if present

