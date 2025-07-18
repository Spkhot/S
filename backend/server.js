// backend/server.js

const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fileRoutes = require('./routes');
const cleanup = require('./cleanup');
const cors = require('cors');
const path = require('path');

dotenv.config();

console.log('✅ Using MONGO_URI:', process.env.MONGO_URI);

const app = express();

// ✅ CORS if needed
app.use(cors());

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// ✅ Serve favicon & other public static files
app.use(express.static(path.join(__dirname, '../public')));

// ✅ Other static folders
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/zips', express.static(path.join(__dirname, '../zips')));

// ✅ Routes
app.use('/api', fileRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ✅ Listen
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

// ✅ Cleanup every hour
setInterval(cleanup, 1000 * 60 * 60);
