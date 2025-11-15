import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Создаем директорию для загрузок, если её нет
const uploadsDir = path.join(process.cwd(), 'uploads', 'screenshots');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Настройка хранилища для multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Генерируем уникальное имя файла: timestamp-userId-originalname
    const userId = (req as any).user?.id || 'anonymous';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const filename = `${timestamp}-${userId}-${name}${ext}`;
    cb(null, filename);
  },
});

// Фильтр файлов - только изображения
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Разрешены только изображения (JPEG, PNG, GIF, WebP)'));
  }
};

// Настройка multer
export const uploadScreenshot = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB максимум
  },
});

// Middleware для получения URL загруженного файла
export function getFileUrl(filename: string): string {
  // В production это должен быть публичный URL (например, через CDN или статический сервер)
  // Для разработки используем относительный путь
  return `/uploads/screenshots/${filename}`;
}

