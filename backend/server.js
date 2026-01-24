const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const categoryRoutes = require('./routes/category.routes');
const orderRoutes = require('./routes/order.routes');
const driverRoutes = require('./routes/driver.routes');
const locationRoutes = require('./routes/location.routes');
const paymentRoutes = require('./routes/payment.routes');
const notificationRoutes = require('./routes/notification.routes');
const adminRoutes = require('./routes/admin.routes');
const qrRoutes = require('./routes/qr.routes');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/qr', qrRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'E-Press Laundry API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            categories: '/api/categories',
            orders: '/api/orders',
            driver: '/api/driver',
            admin: '/api/admin'
        }
    });
});

// Make Socket.IO instance available globally
global.io = io;

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('🔌 New socket connection:', socket.id);

    // Join room for specific user role
    socket.on('join:role', (role) => {
        socket.join(`role:${role}`);
        console.log(`Socket ${socket.id} joined role:${role}`);
    });

    // Join room for specific order
    socket.on('join:order', (orderId) => {
        socket.join(`order:${orderId}`);
        console.log(`Socket ${socket.id} joined order:${orderId}`);
    });

    // Driver location updates
    socket.on('driver:location', async (data) => {
        const { driverId, latitude, longitude, heading, speed } = data;

        // Broadcast to all clients tracking this driver
        io.emit(`driver:location:${driverId}`, {
            latitude,
            longitude,
            heading,
            speed,
            timestamp: new Date()
        });
    });

    // Order status updates
    socket.on('order:status', (data) => {
        const { orderId, status } = data;
        io.to(`order:${orderId}`).emit('order:status_updated', {
            orderId,
            status,
            timestamp: new Date()
        });
    });

    socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected:', socket.id);
    });
});

// Helper functions to emit events (can be called from services)
global.emitNewPickupAvailable = (orderData) => {
    io.to('role:driver').emit('order:new_pickup_available', orderData);
};

global.emitNewDeliveryAvailable = (orderData) => {
    io.to('role:driver').emit('order:new_delivery_available', orderData);
};

global.emitOrderAccepted = (orderId, courierName) => {
    io.to(`order:${orderId}`).emit('order:accepted', {
        orderId,
        courierName,
        timestamp: new Date()
    });
};

global.emitOrderStatusUpdate = (orderId, status) => {
    io.to(`order:${orderId}`).emit('order:status_updated', {
        orderId,
        status,
        timestamp: new Date()
    });
};

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║   🧺 E-Press Laundry API Server          ║
║                                           ║
║   🚀 Server running on port ${PORT}         ║
║   🌍 Environment: ${process.env.NODE_ENV || 'development'}              ║
║   📡 Socket.io ready for real-time       ║
╚═══════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = { app, io };
