const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const client = require('prom-client');
const winston = require('winston');
const { combine, timestamp, json, errors, printf } = winston.format; // Destructure necessary formats

const app = express();

/* ======================= LOGGER (LOKI) ======================= */
// Ensure logs are structured JSON for Loki.
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: combine(
        errors({ stack: true }), // Log stack trace for errors
        timestamp(),
        json() // CRITICAL: Output structured JSON for Loki
    ),
    transports: [
        new winston.transports.Console()
    ]
});

// We replace morgan with a simple custom middleware for Request Logging.
// This ensures the log entry is a structured JSON object, not a plain string.
app.use((req, res, next) => {
    // Log the start of the request
    logger.info(`Incoming request: ${req.method} ${req.originalUrl}`, {
        method: req.method,
        url: req.originalUrl,
        clientIp: req.ip,
        type: 'http_in'
    });

    res.on('finish', () => {
        // Log the end of the request
        logger.info(`Completed request: ${req.method} ${req.originalUrl}`, {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            contentLength: res.get('Content-Length'),
            type: 'http_out'
        });
    });
    next();
});


/* ======================= MONITORING SETUP ======================= */
const register = new client.Registry();
// Register default metrics (CPU, RAM, GC, etc.) with the prefix
client.collectDefaultMetrics({
    register,
    prefix: 'todo_app_',
    gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

// Histogram for HTTP request duration (Temps d'exécution)
const httpRequestDurationSeconds = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Durée des requêtes HTTP en secondes',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [register]
});

// Gauge for active requests
const activeRequests = new client.Gauge({
    name: 'active_requests',
    help: 'Nombre de requêtes actives',
    registers: [register]
});

// Counter for application operations
const todoOperationsCounter = new client.Counter({
    name: 'todo_operations_total',
    help: "Nombre total d'opérations sur les todos",
    labelNames: ['operation'],
    registers: [register]
});

// NOTE: Redundant: memoryUsageGauge and responseTimeGauge removed, as default metrics cover them.


/* ======================= REQUEST TRACKING MIDDLEWARE ======================= */
let activeRequestCount = 0;

app.use((req, res, next) => {
    // Use the express router path (req.route) for Prometheus labels when available, 
    // otherwise fallback to the raw path (req.path).
    const routePath = req.route ? req.route.path : req.path;
    const start = process.hrtime();
    
    // Increment active request count
    activeRequestCount++;
    activeRequests.set(activeRequestCount);

    res.on('finish', () => {
        // Decrement active request count
        activeRequestCount--;
        activeRequests.set(activeRequestCount);

        const diff = process.hrtime(start);
        const duration = diff[0] + diff[1] / 1e9; // Convert to seconds

        // Observe the duration
        httpRequestDurationSeconds
            .labels(req.method, routePath, res.statusCode.toString())
            .observe(duration);
    });

    next();
});

/* ======================= METRICS ENDPOINT ======================= */
// Prometheus will scrape this endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

/* ======================= HEALTH CHECK ======================= */
app.get('/health', (req, res) => {
    res.json({
        status: 'UP',
        uptime: process.uptime(),
        active_requests: activeRequestCount,
        timestamp: new Date().toISOString()
    });
});

/* ======================= APP SETUP ======================= */
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true
}));

app.use(express.json());

if (process.env.NODE_ENV !== 'test') {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/todo_db';
    mongoose
        .connect(MONGO_URI)
        .then(() => logger.info('MongoDB connected'))
        .catch(err => logger.error('MongoDB connection error', { error: err.message, stack: err.stack })); // Log error details
}

const Todo = require('./models/Todo');

/* ======================= ROOT ======================= */
app.get('/', (req, res) => {
    res.json({
        message: 'Todo App API - DevOps Project',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

/* ======================= TODOS ENDPOINTS ======================= */
// All routes must be defined AFTER the Prometheus middleware (`app.use(..)`), 
// but BEFORE the metrics endpoint (`app.get('/metrics')`).

app.get('/todos', async (req, res) => {
    try {
        todoOperationsCounter.inc({ operation: 'read' });
        const todos = await Todo.find().sort({ createdAt: -1 });
        res.json(todos);
    } catch (err) {
        todoOperationsCounter.inc({ operation: 'read_error' });
        logger.error('Error reading todos', { error: err.message, stack: err.stack, endpoint: '/todos' }); // Log error
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/todos', async (req, res) => {
    try {
        todoOperationsCounter.inc({ operation: 'create' });
        const todo = new Todo({ text: req.body.text });
        res.json(await todo.save());
    } catch (err) {
        todoOperationsCounter.inc({ operation: 'create_error' });
        logger.error('Error creating todo', { error: err.message, stack: err.stack, endpoint: '/todos' }); // Log error
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/todos/:id', async (req, res) => {
    try {
        todoOperationsCounter.inc({ operation: 'update' });
        const updated = await Todo.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) {
            logger.warn(`Todo not found for update: ${req.params.id}`);
            return res.status(404).json({ error: 'Not found' });
        }
        res.json(updated);
    } catch (err) {
        todoOperationsCounter.inc({ operation: 'update_error' });
        logger.error(`Error updating todo ${req.params.id}`, { error: err.message, stack: err.stack, endpoint: `/todos/${req.params.id}` }); // Log error
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/todos/:id', async (req, res) => {
    try {
        todoOperationsCounter.inc({ operation: 'delete' });
        const deleted = await Todo.findByIdAndDelete(req.params.id);
        if (!deleted) {
            logger.warn(`Todo not found for deletion: ${req.params.id}`);
            return res.status(404).json({ error: 'Not found' });
        }
        res.json({ message: 'Todo deleted' });
    } catch (err) {
        todoOperationsCounter.inc({ operation: 'delete_error' });
        logger.error(`Error deleting todo ${req.params.id}`, { error: err.message, stack: err.stack, endpoint: `/todos/${req.params.id}` }); // Log error
        res.status(500).json({ error: 'Server error' });
    }
});

/* ======================= START ======================= */
/* INTERNAL PORT = 5000 (Docker: 5001:5000) */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});