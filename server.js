require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const rateLimit = require('./middleware/rateLimit');
const security = require('./middleware/security');
const chatRoutes = require('./routes/chat');
const historyRoutes = require('./routes/history');
const settingsRoutes = require('./routes/settings');
const supportRoutes = require('./routes/support');
const { initDatabase, isDbReady } = require('./database');

const app = express();

// WAJIB di Railway/Heroku/dsb: request masuk lewat reverse proxy yang menyetel
// header X-Forwarded-For. Tanpa ini, express-rate-limit v7 melempar
// ValidationError (ERR_ERL_UNEXPECTED_X_FORWARDED_FOR) di SETIAP request dan
// bikin proses crash berulang (crash-loop) — inilah penyebab MongoDB kelihatan
// "belum terkoneksi" terus: server-nya restart terus sebelum sempat konek.
app.set('trust proxy', 1);

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(compression());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(rateLimit);
app.use(security);
app.use(express.static(path.join(__dirname, 'public')));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'DIKZ AI Server is running',
    database: isDbReady() ? 'connected' : 'disconnected'
  });
});

// Guard: kalau MongoDB belum/tidak terkoneksi, jangan biarkan request nge-hang
// atau lempar stack trace mentah — balikin error JSON yang jelas.
function requireDb(req, res, next) {
  if (!isDbReady()) {
    return res.status(503).json({
      success: false,
      error: 'Database belum terkoneksi. Coba lagi sebentar atau cek konfigurasi MONGODB_URI di server.'
    });
  }
  next();
}

// Routes
app.use('/api/chat', requireDb, chatRoutes);
app.use('/api/history', requireDb, historyRoutes);
app.use('/api/settings', requireDb, settingsRoutes);
app.use('/api/support', requireDb, supportRoutes);

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.get('/history', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'history.html'));
});

app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get('/support', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'support.html'));
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    status: err.status || 500
  });
});

// Init database and start server
const PORT = process.env.PORT || 3000;

if (process.env.HF_API_KEY) {
  console.log('✅ HuggingFace API Loaded');
} else {
  console.log('⚠️  HuggingFace API Missing — set HF_API_KEY in your .env file (see .env.example). Chat will not work until this is set.');
}

function startServer() {
  server.listen(PORT, () => {
    console.log(`🚀 DIKZ AI ASSISTANT running on http://localhost:${PORT}`);
    console.log(`📡 Status: ONLINE`);
    console.log(`🤖 Model: ${process.env.MODEL || 'Qwen/Qwen2.5-7B-Instruct'}`);
  });
}

initDatabase()
  .then(() => {
    startServer();
  })
  .catch((err) => {
    // JANGAN process.exit(1) di sini — kalau MongoDB gagal connect (Atlas down,
    // IP belum di-whitelist, URI salah, dll), server tetap harus hidup supaya
    // Railway tidak menganggap deploy crash / blank, dan supaya pesan error ini
    // kelihatan jelas di log alih-alih proses langsung mati.
    console.error('❌ Gagal konek ke database saat startup:', err.message);
    console.error('⚠️  Server tetap dijalankan tanpa database. Fitur chat/history/settings yang butuh MongoDB akan mengembalikan error 503 sampai koneksi berhasil.');
    startServer();
  });