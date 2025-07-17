// backend/cleanup.js

const fs = require('fs');
const path = require('path');
const File = require('./models/File');

module.exports = async () => {
  console.log('🧹 Running cleanup job...');

  try {
    // Calculate cutoff time (24 hours ago)
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find all files older than cutoff
    const oldFiles = await File.find({ createdAt: { $lt: cutoff } });

    for (const fileDoc of oldFiles) {
      for (const fileName of fileDoc.files) {
        const filePath = path.join(__dirname, '../uploads', fileName);

        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Deleted file: ${filePath}`);
          } catch (err) {
            console.error(`❌ Error deleting file ${filePath}:`, err);
          }
        }
      }

      // Remove the DB record too
      await File.deleteOne({ _id: fileDoc._id });
      console.log(`✅ Removed DB record for: ${fileDoc.shortId}`);
    }

    console.log(`🧹 Cleanup complete. Removed ${oldFiles.length} expired uploads.`);

  } catch (err) {
    console.error('❌ Cleanup job failed:', err);
  }
};
