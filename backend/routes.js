// backend/routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const File = require('./models/File');
const archiver = require('archiver');

// ✅ Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

const generateShortId = () => Math.random().toString(36).substring(2, 8);

// ✅ Upload route
router.post('/upload', upload.array('files'), async (req, res) => {
  try {
    console.log('✅ Upload endpoint hit');

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const shortId = generateShortId();

    await File.create({
      shortId,
      files: req.files.map(f => f.filename),
      createdAt: new Date(),
    });

    const link = `${req.protocol}://${req.get('host')}/api/files/${shortId}`;
    res.json({ success: true, url: link });

  } catch (err) {
    console.error('❌ Upload failed:', err);
    res.status(500).json({ success: false, message: 'Server error during upload' });
  }
});

// ✅ Get files by shortId
router.get('/files/:shortId', async (req, res) => {
  const { shortId } = req.params;

  const fileDoc = await File.findOne({ shortId });
  if (!fileDoc) {
    return res.status(404).send('<h2>❌ Files not found or expired.</h2>');
  }

  const filesHtml = fileDoc.files.map(f => {
    const ext = f.split('.').pop().toLowerCase();
    const fileUrl = `/uploads/${f}`;
    let preview = '';

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      preview = `<img src="${fileUrl}" alt="${f}" style="max-width: 400px; display: block; margin: 20px auto;" />`;
    } else if (ext === 'pdf') {
      preview = `<iframe src="${fileUrl}" style="width:100%; max-width:800px; height:500px; border: none; margin: 20px 0;"></iframe>`;
    } else {
      preview = `📄 ${f} — <a href="${fileUrl}" target="_blank">Download</a>`;
    }

    return `<li>${preview}</li>`;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Your Files • PrintBridge</title>
      <style>
        body {
          font-family: 'Segoe UI', sans-serif;
          background: #f4f6f8;
          padding: 50px;
          text-align: center;
        }
        h1 {
          font-size: 32px;
          margin-bottom: 10px;
          color: #333;
        }
        p {
          color: #666;
          margin-bottom: 30px;
        }
        ul {
          list-style: none;
          padding: 0;
        }
        li {
          margin: 30px 0;
        }
        a {
          color: #007bff;
          text-decoration: none;
          font-weight: bold;
        }
        a:hover {
          text-decoration: underline;
        }
        .zip {
          display: inline-block;
          margin-top: 40px;
          background: #007bff;
          color: white;
          padding: 12px 20px;
          border-radius: 5px;
          text-decoration: none;
        }
        .zip:hover {
          background: #0056b3;
        }
        .note {
          margin-top: 50px;
          font-size: 13px;
          color: #888;
        }
      </style>
    </head>
    <body>
      <h1>📂 Your Uploaded Files</h1>
      <p>Preview & download below</p>
      <ul>${filesHtml}</ul>
      <a class="zip" href="/api/zip/${shortId}">⬇️ Download All as ZIP</a>
      <p class="note">Auto-deletes after 24 hours. Stay private & simple.</p>
    </body>
    </html>
  `;

  res.send(html);
});

// ✅ Download all as ZIP
router.get('/zip/:shortId', async (req, res) => {
  const { shortId } = req.params;

  const fileDoc = await File.findOne({ shortId });
  if (!fileDoc) {
    return res.status(404).send('Files not found.');
  }

  const zipPath = path.join(__dirname, `../zips/${shortId}.zip`);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip');

  output.on('close', () => {
    res.download(zipPath, `${shortId}.zip`, () => {
      fs.unlinkSync(zipPath); // Delete zip after sending
    });
  });

  archive.on('error', err => {
    console.error('❌ Archiver error:', err);
    res.status(500).send('ZIP creation failed.');
  });

  archive.pipe(output);

  fileDoc.files.forEach(f => {
    archive.file(path.join(__dirname, '../uploads', f), { name: f });
  });

  archive.finalize();
});

module.exports = router;
