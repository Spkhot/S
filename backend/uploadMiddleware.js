// backend/uploadMiddleware.js

const multer = require('multer');
const path = require('path');

// ✅ Where to store files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});

// ✅ Add file size limit: e.g. 100 MB per file (adjust as needed)
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100 MB per file
  }
});

module.exports = upload;
