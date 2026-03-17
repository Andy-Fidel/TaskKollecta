const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'taskkollecta_uploads',
    allowed_formats: [
      'jpg', 'jpeg', 'png', 'gif', 'webp',
      'pdf',
      'doc', 'docx',
      'xls', 'xlsx',
      'ppt', 'pptx',
      'csv', 'txt', 'zip'
    ],
    resource_type: 'auto', // Auto-detect image vs raw file
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      // Documents
      'application/pdf',
      'application/msword',                                                          // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',      // .docx
      // Spreadsheets
      'application/vnd.ms-excel',                                                    // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',            // .xlsx
      // Presentations
      'application/vnd.ms-powerpoint',                                               // .ppt
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',   // .pptx
      // Other
      'text/csv',
      'text/plain',
      'application/zip',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Accepted: images, PDF, Word, Excel, PowerPoint, CSV, TXT, ZIP'), false);
    }
  }
});

module.exports = { upload };