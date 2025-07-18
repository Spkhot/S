// backend/models/File.js

const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  shortId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  files: {
    type: [String], // Stored file names in /uploads
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '7d', // Auto-remove after 7 days (MongoDB TTL index)
  },
});

module.exports = mongoose.model('File', FileSchema);
