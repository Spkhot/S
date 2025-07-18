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

// ✅ Upload route with custom link
router.post('/upload', upload.array('files'), async (req, res) => {
  try {
    console.log('✅ Upload endpoint hit');

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    let shortId = generateShortId();

    if (req.body.customId) {
      const customId = req.body.customId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (customId.length < 3 || customId.length > 30) {
        return res.status(400).json({ success: false, message: 'Custom link must be 3-30 letters/numbers only.' });
      }

      const exists = await File.findOne({ shortId: customId });
      if (exists) {
        return res.status(400).json({ success: false, message: 'This custom link is already taken.' });
      }

      shortId = customId;
    }

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

// Paste this entire block to replace the existing `router.get('/files/:shortId', ...)` route.

// ✅ Get files by shortId - REVAMPED FRONTEND
router.get('/files/:shortId', async (req, res) => {
    const { shortId } = req.params;

    const fileDoc = await File.findOne({ shortId });
    if (!fileDoc) {
        // A slightly nicer 404 page
        return res.status(404).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Not Found</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #f8f9fa; color: #343a40; text-align: center; }
                    .container { max-width: 400px; }
                    h1 { font-size: 3rem; margin: 0; }
                    p { font-size: 1.2rem; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>404</h1>
                    <p>Files not found or link has expired.</p>
                </div>
            </body>
            </html>
        `);
    }

    // Helper to generate file type icons
    const getFileIcon = (ext) => {
        const iconMap = {
            'pdf': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
            'png': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
            'jpg': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
            'jpeg': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
            'gif': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
            'webp': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
            'zip': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.2 15c.7-1.2 1-2.5.7-3.9-.6-2.4-2.4-4.2-4.8-4.8s-4.7-.2-6.1 1.2c-.4.4-.7.8-.9 1.2"></path><path d="M10 10.5V18l-3.5-3.5"></path><path d="M10 18h4"></path><path d="M10 10.5h4"></path><path d="M4.8 19.2c-1.6-.9-2.8-2.5-3.1-4.3-.3-1.8.3-3.6 1.5-5.1"></path></svg>',
        };
        return iconMap[ext] || '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>';
    };

    let previewsHtml = '';
    let hasPreviews = false;

    // Generate the list of files
    const fileListHtml = fileDoc.files.map(f => {
        const ext = path.extname(f).substring(1).toLowerCase();
        const fileUrl = `/uploads/${f}`; // In a real app, this would be a secure, temporary URL
        const fileName = f.substring(f.indexOf('-') + 1); // Get original filename

        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
            hasPreviews = true;
            previewsHtml += `<div class="preview-item"><h3>${fileName}</h3><img src="${fileUrl}" alt="${fileName}"/></div>`;
        } else if (ext === 'pdf') {
            hasPreviews = true;
            previewsHtml += `<div class="preview-item"><h3>${fileName}</h3><iframe src="${fileUrl}" title="${fileName}"></iframe></div>`;
        }
        
        return `
            <li class="file-item">
                <div class="file-icon">${getFileIcon(ext)}</div>
                <div class="file-info">
                    <span class="file-name">${fileName}</span>
                </div>
                <a href="${fileUrl}" class="download-btn" download>Download</a>
            </li>
        `;
    }).join('');

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Files • ShareFlow</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
      <style>
        :root {
            --primary-color: #6a11cb;
            --secondary-color: #2575fc;
            --bg-color: #f0f2f5;
            --card-color: #ffffff;
            --text-color: #333;
            --light-text-color: #666;
            --border-color: #e0e0e0;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Poppins', sans-serif;
            background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
            display: flex;
            justify-content: center;
            align-items: flex-start;
            min-height: 100vh;
            padding: 40px 20px;
            color: var(--text-color);
        }
        .container {
            background: var(--card-color);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 700px;
            text-align: center;
        }
        .header {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 15px;
            margin-bottom: 10px;
        }
        .header-icon { color: var(--primary-color); }
        h1 {
            font-size: 2.2rem;
            font-weight: 600;
        }
        .tagline {
            font-size: 1.1rem;
            color: var(--light-text-color);
            margin-bottom: 30px;
        }
        
        /* File List */
        .file-list {
            list-style: none;
            padding: 0;
            margin-bottom: 30px;
            text-align: left;
        }
        .file-item {
            display: flex;
            align-items: center;
            padding: 15px;
            border: 1px solid var(--border-color);
            border-radius: 10px;
            margin-bottom: 10px;
            transition: background-color 0.2s ease;
        }
        .file-item:hover { background-color: #f8f9fa; }
        .file-icon {
            color: var(--secondary-color);
            margin-right: 15px;
            flex-shrink: 0;
        }
        .file-info {
            flex-grow: 1;
            overflow: hidden;
        }
        .file-name {
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .download-btn {
            background-color: #f0f2f5;
            color: var(--text-color);
            padding: 8px 16px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 500;
            font-size: 0.9rem;
            transition: background-color 0.2s ease, color 0.2s ease;
            white-space: nowrap;
        }
        .download-btn:hover {
            background-color: var(--secondary-color);
            color: white;
        }

        /* Download All Button */
        .download-all-btn {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            max-width: 300px;
            justify-content: center;
            padding: 15px;
            font-size: 1.1rem;
            font-weight: 600;
            color: #fff;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            border: none;
            border-radius: 8px;
            cursor: pointer;
            text-decoration: none;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .download-all-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(37, 117, 252, 0.4);
        }

        /* Previews Section */
        .preview-section {
            margin-top: 30px;
            text-align: left;
            border-top: 1px solid var(--border-color);
            padding-top: 30px;
        }
        .preview-section h2 {
            text-align: center;
            font-size: 1.5rem;
            margin-bottom: 20px;
            color: var(--text-color);
        }
        .preview-item { margin-bottom: 30px; }
        .preview-item h3 { font-size: 1rem; font-weight: 500; margin-bottom: 10px; }
        .preview-item img {
            max-width: 100%;
            border-radius: 8px;
            border: 1px solid var(--border-color);
        }
        .preview-item iframe {
            width: 100%;
            height: 600px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
        }
        
        .footer-note {
            margin-top: 30px;
            font-size: 0.9rem;
            color: var(--light-text-color);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
          </div>
          <h1>Your Files Are Ready</h1>
        </div>
        <p class="tagline">Download individual files or get them all in a ZIP archive.</p>
        
        <ul class="file-list">${fileListHtml}</ul>

        <a class="download-all-btn" href="/api/zip/${shortId}">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            <span>Download All as ZIP</span>
        </a>

        ${hasPreviews ? `
            <div class="preview-section">
                <h2>File Previews</h2>
                ${previewsHtml}
            </div>` 
        : ''}
        
        <p class="footer-note">This link will expire automatically. Shared with ShareFlow.</p>
      </div>
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
