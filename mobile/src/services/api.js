import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Android Emulator/Device needs your machine's local IP, not "localhost"
// TIP: Run 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux) to get your current IP
const DEFAULT_DEV_API_URL = 'http://172.31.30.207:5000/api';
const DEFAULT_PROD_API_URL = 'http://161.97.66.69/api';
const API_URL = __DEV__
    ? (process.env.EXPO_PUBLIC_DEV_API_URL || DEFAULT_DEV_API_URL)
    : (process.env.EXPO_PUBLIC_API_URL || DEFAULT_PROD_API_URL);

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    timeout: 15000, // Increased timeout for slower networks
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('auth_token'); // Changed from 'token' to 'auth_token'
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log(`[API] Request to ${config.url} with auth token`);
        } else {
            console.log(`[API] Request to ${config.url} WITHOUT auth token`);
        }
        return config;
    },
    (error) => {
        console.error('[API] Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            await AsyncStorage.removeItem('auth_token'); // Changed from 'token' to 'auth_token'
            await AsyncStorage.removeItem('user');
            // You can navigate to login screen here if needed
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    register: (data) => api.post('/auth/register', data),
    getMe: () => api.get('/auth/me'),
    verifyToken: (token) => api.post('/auth/verify', { token }),
};

// Cache helper functions
const CACHE_KEYS = {
    CATEGORIES: 'cached_categories',
    CATEGORIES_TIMESTAMP: 'cached_categories_timestamp',
};

const CACHE_EXPIRY = 1000 * 60 * 60; // 1 hour

const cacheCategories = async (categories) => {
    try {
        await AsyncStorage.setItem(CACHE_KEYS.CATEGORIES, JSON.stringify(categories));
        await AsyncStorage.setItem(CACHE_KEYS.CATEGORIES_TIMESTAMP, Date.now().toString());
    } catch (error) {
        console.warn('Failed to cache categories:', error);
    }
};

const getCachedCategories = async () => {
    try {
        const cached = await AsyncStorage.getItem(CACHE_KEYS.CATEGORIES);
        const timestamp = await AsyncStorage.getItem(CACHE_KEYS.CATEGORIES_TIMESTAMP);

        if (cached && timestamp) {
            const age = Date.now() - parseInt(timestamp);
            if (age < CACHE_EXPIRY) {
                return JSON.parse(cached);
            }
        }
        return null;
    } catch (error) {
        console.warn('Failed to get cached categories:', error);
        return null;
    }
};

// Categories API
export const categoriesAPI = {
    getAll: async () => {
        try {
            const response = await api.get('/categories');
            // Cache successful response
            if (response.data) {
                await cacheCategories(response.data);
            }
            return response;
        } catch (error) {
            // Try to return cached data on network error
            if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
                const cached = await getCachedCategories();
                if (cached) {
                    console.log('Using cached categories due to network error');
                    return { data: cached, fromCache: true };
                }
            }
            throw error;
        }
    },
    getById: (id) => api.get(`/categories/${id}`),
    clearCache: async () => {
        try {
            await AsyncStorage.removeItem(CACHE_KEYS.CATEGORIES);
            await AsyncStorage.removeItem(CACHE_KEYS.CATEGORIES_TIMESTAMP);
        } catch (error) {
            console.warn('Failed to clear cache:', error);
        }
    },
};

// Orders API
export const ordersAPI = {
    create: (data) => api.post('/orders', data),
    getMyOrders: (status = null) => api.get('/orders/my-orders', { params: { status } }),
    getFacilityOrders: (status = null) => api.get('/orders/facility', { params: { status } }),
    getById: (id) => api.get(`/orders/${id}`),
    updateStatus: (id, status, notes) => api.patch(`/orders/${id}/status`, { status, notes }),
    cancel: (id) => api.post(`/orders/${id}/cancel`),
    addPhoto: (id, data) => api.post(`/orders/${id}/photos`, data),
    // QR Tracking V1
    getAvailableForCourier: (type) => api.get('/qr/courier/available', { params: { type } }),
    acceptOrder: (orderId, data) => api.post(`/qr/courier/accept/${orderId}`, data),
    scanOrder: (orderId, data) => api.post(`/qr/scan/${orderId}`, data),
    validateQR: (qrData) => api.post('/qr/validate', { qr_data: qrData }),
};

// Locations API
export const locationsAPI = {
    getAll: () => api.get('/locations'),
    create: (data) => api.post('/locations', data),
    update: (id, data) => api.patch(`/locations/${id}`, data),
    delete: (id) => api.delete(`/locations/${id}`),
};

// Driver API
export const driverAPI = {
    getOrders: (status = null) => api.get('/driver/orders', { params: { status } }),
    updateLocation: (data) => api.post('/driver/location', data),
    acceptOrder: (orderId) => api.post(`/driver/orders/${orderId}/accept`),
    updateOrderStatus: (orderId, status) => api.patch(`/driver/orders/${orderId}/status`, { status }),
};

// Admin API
export const adminAPI = {
    // Dashboard stats
    getStats: () => api.get('/admin/stats'),

    // Courier availability
    getActiveCouriers: () => api.get('/admin/active-couriers'),

    // Category management
    getAllCategories: () => api.get('/admin/categories'),
    createCategory: (data) => api.post('/admin/categories', data),
    updateCategory: (id, data) => api.put(`/admin/categories/${id}`, data),
    deleteCategory: (id) => api.delete(`/admin/categories/${id}`),

    // User management
    getUsers: (role = null) => api.get('/admin/users', { params: { role } }),
    updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
    deleteUser: (id) => api.delete(`/admin/users/${id}`),

    // Orders
    getAllOrders: (filters) => api.get('/admin/orders', { params: filters }),
};

// Payments API
export const paymentsAPI = {
    processPayment: (data) => api.post('/payments/process', data),
    getPaymentMethods: () => api.get('/payments/methods'),
};

export default api;
