// backend/models/File.js
const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  shortId: { type: String, required: true, unique: true },
  files: [String], // Array of uploaded file names
  createdAt: { type: Date, default: Date.now }, // For auto-cleanup logic
});

module.exports = mongoose.model('File', FileSchema);
