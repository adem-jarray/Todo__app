const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Ajout pour le monitoring
const client = require('prom-client');

const app = express();

// ======================= MONITORING SETUP =======================
// Créer un Registry pour les métriques
const register = new client.Registry();

// Collecter les métriques par défaut (CPU, mémoire, etc.)
client.collectDefaultMetrics({ 
  register,
  prefix: 'todo_app_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

// Métriques personnalisées
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Durée des requêtes HTTP en secondes',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const activeRequests = new client.Gauge({
  name: 'active_requests',
  help: 'Nombre de requêtes actives en cours'
});

const todoOperationsCounter = new client.Counter({
  name: 'todo_operations_total',
  help: 'Nombre total d\'opérations sur les todos',
  labelNames: ['operation'] // create, read, update, delete
});

const memoryUsageGauge = new client.Gauge({
  name: 'memory_usage_bytes',
  help: 'Utilisation mémoire en bytes',
  labelNames: ['type'] // rss, heapTotal, heapUsed, external
});

const responseTimeGauge = new client.Gauge({
  name: 'response_time_ms',
  help: 'Temps de réponse des requêtes en millisecondes'
});

// Enregistrer les métriques
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(activeRequests);
register.registerMetric(todoOperationsCounter);
register.registerMetric(memoryUsageGauge);
register.registerMetric(responseTimeGauge);

// Endpoint pour les métriques Prometheus
app.get('/metrics', async (req, res) => {
  try {
    // Mettre à jour les métriques mémoire
    const mem = process.memoryUsage();
    memoryUsageGauge.labels('rss').set(mem.rss);
    memoryUsageGauge.labels('heapTotal').set(mem.heapTotal);
    memoryUsageGauge.labels('heapUsed').set(mem.heapUsed);
    memoryUsageGauge.labels('external').set(mem.external);
    
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (err) {
    res.status(500).end(err.message);
  }
});

// Middleware pour mesurer les requêtes
app.use((req, res, next) => {
  const start = process.hrtime();
  activeRequests.inc();
  
  // Enregistrer la fin de la requête
  res.on('finish', () => {
    activeRequests.dec();
    
    // Calculer la durée
    const diff = process.hrtime(start);
    const duration = diff[0] + diff[1] / 1e9; // en secondes
    
    httpRequestDurationMicroseconds
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .observe(duration);
    
    responseTimeGauge.set(duration * 1000); // en millisecondes
  });
  
  next();
});

// Endpoint de santé avec métriques
app.get('/health', (req, res) => {
  const health = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    metrics: {
      active_requests: activeRequests.hashMap['']?.value || 0
    }
  };
  res.json(health);
});
// ======================= FIN MONITORING =======================

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

let isTest = process.env.NODE_ENV === 'test';
if (!isTest) {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/todo_db';
  mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));
}
const Todo = require('./models/Todo');

// Routes avec tracking des métriques
app.get('/todos', async (req, res) => {
  try {
    todoOperationsCounter.inc({ operation: 'read' });
    const todos = await Todo.find().sort({ createdAt: -1 });
    res.json(todos);
  } catch (err) {
    todoOperationsCounter.inc({ operation: 'read_error' });
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/todos', async (req, res) => {
  try {
    todoOperationsCounter.inc({ operation: 'create' });
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }
    const todo = new Todo({ text: text.trim() });
    const saved = await todo.save();
    res.json(saved);
  } catch (err) {
    todoOperationsCounter.inc({ operation: 'create_error' });
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/todos/:id', async (req, res) => {
  try {
    todoOperationsCounter.inc({ operation: 'update' });
    const updated = await Todo.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Todo not found' });
    res.json(updated);
  } catch (err) {
    todoOperationsCounter.inc({ operation: 'update_error' });
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/todos/:id', async (req, res) => {
  try {
    todoOperationsCounter.inc({ operation: 'delete' });
    await Todo.findByIdAndDelete(req.params.id);
    res.json({ message: 'Todo deleted' });
  } catch (err) {
    todoOperationsCounter.inc({ operation: 'delete_error' });
    res.status(500).json({ error: 'Server error' });
  }
});

// Endpoint pour obtenir les stats de monitoring
app.get('/monitoring/stats', (req, res) => {
  const stats = {
    timestamp: new Date().toISOString(),
    process: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    },
    metrics: {
      active_requests: activeRequests.hashMap['']?.value || 0,
      todo_operations: Object.fromEntries(
        Object.entries(todoOperationsCounter.hashMap).map(([key, value]) => [
          key.replace('operation:', ''), 
          value.value
        ])
      )
    }
  };
  res.json(stats);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Metrics available at http://localhost:${PORT}/metrics`);
  console.log(`Health check at http://localhost:${PORT}/health`);
  console.log(`Monitoring stats at http://localhost:${PORT}/monitoring/stats`);
});