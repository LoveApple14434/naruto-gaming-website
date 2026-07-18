import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, requireAdmin } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const UPLOADS_PREFIX = process.env.UPLOADS_URL_PREFIX || '';

const router = Router();

const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ─── 魔数（Magic Number）检测 ───
const MAGIC_NUMBERS: Record<string, [number[], number][]> = {
  '.png':  [[[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], 8]],
  '.jpg':  [[[0xFF, 0xD8, 0xFF], 3]],
  '.jpeg': [[[0xFF, 0xD8, 0xFF], 3]],
  '.gif':  [[[0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 6], [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], 6]],
  '.webp': [[[0x52, 0x49, 0x46, 0x46], 4]],
  '.svg':  [[[0x3C, 0x3F, 0x78, 0x6D, 0x6C], 5], [[0x3C, 0x73, 0x76, 0x67], 4], [[0x3C, 0x21, 0x44, 0x4F], 4]],
};

function validateMagicNumber(filePath: string, ext: string): boolean {
  const signatures = MAGIC_NUMBERS[ext];
  if (!signatures) return false;
  const buf = Buffer.alloc(12);
  try {
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);
  } catch {
    return false;
  }
  return signatures.some(([magic, len]) =>
    magic.every((byte, i) => buf[i] === byte),
  );
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = Object.keys(MAGIC_NUMBERS);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// 上传单张图片（含魔数校验）
router.post('/image', authenticate, requireAdmin, upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) throw new AppError('未选择文件');

    const ext = path.extname(req.file.filename).toLowerCase();
    if (!validateMagicNumber(req.file.path, ext)) {
      // 魔数不匹配 → 删除文件并拒绝
      fs.unlink(req.file.path, () => {});
      throw new AppError('文件类型校验失败，请上传有效的图片文件');
    }

    const url = `${UPLOADS_PREFIX}/uploads/${req.file.filename}`;
    res.json({ url });
  } catch (error) {
    next(error);
  }
});

// 用户上传头像（任意登录用户）
router.post('/avatar', authenticate, upload.single('avatar'), (req, res, next) => {
  try {
    if (!req.file) throw new AppError('未选择文件');

    const ext = path.extname(req.file.filename).toLowerCase();
    if (!validateMagicNumber(req.file.path, ext)) {
      fs.unlink(req.file.path, () => {});
      throw new AppError('文件类型校验失败，请上传有效的图片文件');
    }

    const url = `${UPLOADS_PREFIX}/uploads/${req.file.filename}`;
    res.json({ url });
  } catch (error) {
    next(error);
  }
});

export default router;
