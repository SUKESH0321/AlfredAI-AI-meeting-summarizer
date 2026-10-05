import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Calculate the path to server/uploads relative to this middleware file (server/src/middleware/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const supportedExtensions = ['.mp3', '.wav', '.m4a', '.webm', '.mpeg', '.mp4', '.mov', '.mkv'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/') || supportedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('UNSUPPORTED_MEDIA'));
  }
};

export const upload = multer({ storage, fileFilter });
