export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

if (!import.meta.env.VITE_API_URL && import.meta.env.MODE === 'production') {
    // eslint-disable-next-line no-console
    console.warn('VITE_API_URL is not set; falling back to localhost.');
}
