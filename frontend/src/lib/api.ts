import axios from 'axios';
import { getInitData, getTelegramUser } from './telegram';

// Определяем API URL в зависимости от окружения
const getApiUrl = () => {
  // Приоритет 1: Переменная окружения (самый надежный способ)
  const env = import.meta.env as any;
  if (env.VITE_API_URL) {
    return env.VITE_API_URL;
  }
  
  // Приоритет 2: Если запущено в Telegram через cloudflare/ngrok
  const currentHost = window.location.hostname;
  
  // Если это cloudflare домен, пытаемся использовать публичный backend URL
  if (currentHost.includes('trycloudflare.com') || currentHost.includes('ngrok')) {
    // Пробуем загрузить backend URL из localStorage (сохраняется скриптом)
    const savedBackendUrl = localStorage.getItem('backend_api_url');
    if (savedBackendUrl) {
      console.log('Using saved backend URL:', savedBackendUrl);
      return savedBackendUrl;
    }
    
    // Используем текущий backend URL по умолчанию для Cloudflare туннеля
    // Backend URL обновляется автоматически при перезапуске туннеля
    // Текущий URL: https://organizing-venture-containers-oliver.trycloudflare.com
    if (currentHost.includes('trycloudflare.com')) {
      // Пробуем получить из переменной окружения (самый актуальный)
      const env = import.meta.env as any;
      if (env.VITE_API_URL) {
        console.log('Using backend URL from VITE_API_URL:', env.VITE_API_URL);
        return env.VITE_API_URL;
      }
      // Fallback на последний известный URL (будет обновлен автоматически)
      // Если VITE_API_URL не установлен, используем значение из localStorage или последний известный URL
      const savedBackendUrl = localStorage.getItem('backend_api_url');
      if (savedBackendUrl) {
        console.log('Using saved backend URL from localStorage:', savedBackendUrl);
        return savedBackendUrl;
      }
      // Последний известный URL (обновляется при перезапуске туннеля)
      const backendUrl = 'https://celebrities-lopez-got-left.trycloudflare.com';
      console.warn('Using fallback backend URL. Consider setting VITE_API_URL or localStorage.backend_api_url');
      return backendUrl;
    }
    
    // Если нет сохраненного URL, показываем предупреждение
    console.warn('Backend URL не настроен! Создайте туннель для backend и установите VITE_API_URL');
    console.warn('Или выполните: localStorage.setItem("backend_api_url", "https://your-backend-url.trycloudflare.com")');
  }
  
  // По умолчанию: localhost для локальной разработки
  return 'http://localhost:3000';
};

const API_URL = getApiUrl();
console.log('API URL configured:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 секунд таймаут для всех запросов
});

// Добавляем initData или JWT токен в заголовки для аутентификации
api.interceptors.request.use((config) => {
  // Проверяем, есть ли JWT токен в localStorage (для админ-панели)
  const jwtToken = localStorage.getItem('admin_token');
  if (jwtToken && config.url?.includes('/admin')) {
    config.headers['Authorization'] = `Bearer ${jwtToken}`;
    return config;
  }

  // Иначе используем Telegram аутентификацию
  const initData = getInitData();
  
  if (initData) {
    config.headers['X-Telegram-Init-Data'] = initData;
    
    // Получаем telegramId из initData
    try {
      // Парсим initData (формат: key=value&key2=value2)
      const params = new URLSearchParams(initData);
      const userParam = params.get('user');
      
      if (userParam) {
        const tgUser = JSON.parse(decodeURIComponent(userParam));
        if (tgUser.id) {
          config.headers['X-Telegram-Id'] = tgUser.id.toString();
        }
      }
    } catch (e) {
      console.warn('Failed to parse initData:', e);
      // Пробуем получить из initDataUnsafe
      const tgWebApp = window.Telegram?.WebApp as any;
      if (tgWebApp?.initDataUnsafe?.user?.id) {
        config.headers['X-Telegram-Id'] = tgWebApp.initDataUnsafe.user.id.toString();
      }
    }
  } else {
    // Режим разработки: добавляем тестовый telegramId
    const tgUser = getTelegramUser();
    if (tgUser?.id) {
      config.headers['X-Telegram-Id'] = tgUser.id.toString();
    } else {
      config.headers['X-Telegram-Id'] = '123456789';
    }
  }
  
  console.log('API Request:', {
    url: config.url,
    telegramId: config.headers['X-Telegram-Id'],
    hasInitData: !!initData,
    hasJWT: !!jwtToken,
  });
  
  return config;
});

// Обработка ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// API методы
export const usersApi = {
  getMe: () => api.get('/api/users/me'),
  updateMe: (data: any) => api.patch('/api/users/me', data),
  syncTelegram: () => api.post('/api/users/me/sync-telegram'),
  getFlarikiHistory: () => api.get('/api/users/me/flariki'),
};

export const tasksApi = {
  getMyTasks: (params?: { status?: string; type?: string }) => 
    api.get('/api/tasks/me', { params }),
  getTask: (id: string) => api.get(`/api/tasks/${id}`),
};

export const reportsApi = {
  getMyReports: (params?: { taskId?: string; status?: string; type?: string }) =>
    api.get('/api/reports/me', { params }),
  getReport: (id: string) => api.get(`/api/reports/${id}`),
  createReport: (data: {
    taskId: string;
    type: 'VIDEO_LINK' | 'STORY_SCREENSHOT';
    videoLinks?: Array<{ url: string; platform?: string; views?: number; likes?: number; comments?: number }>;
    stories?: Array<{ storyUrl: string; screenshotFile?: string; screenshotUrl?: string; reach: number }>;
    screenshotUrl?: string; // Legacy поддержка
    screenshotFile?: string; // Путь к загруженному файлу (legacy)
    storyUrl?: string; // Ссылка на сторис Instagram (legacy)
    storyReach?: number; // Количество просмотров сторис (legacy)
    productIds?: string[]; // Массив ID товаров
  }) => api.post('/api/reports', data),
  uploadScreenshot: (file: File): Promise<{ filename: string; url: string; path: string }> => {
    const formData = new FormData();
    formData.append('screenshot', file);
    return api.post('/api/reports/upload-screenshot', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(res => res.data);
  },
};

export const adminApi = {
  getUsers: (params?: { status?: string; page?: number; limit?: number; search?: string }) =>
    api.get('/api/admin/users', { params }),
  moderateUser: (id: string, data: { status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' | 'PENDING'; notes?: string }) =>
    api.patch(`/api/admin/users/${id}/moderate`, data),
  getTags: () => api.get('/api/admin/tags'),
  createTag: (data: { name: string; color?: string; description?: string }) =>
    api.post('/api/admin/tags', data),
  deleteTag: (id: string) => api.delete(`/api/admin/tags/${id}`),
  assignTags: (userId: string, tagIds: string[]) =>
    api.post(`/api/admin/users/${userId}/tags`, { tagIds }),
  createBroadcast: (data: { title: string; message: string; tagIds?: string[]; taskIds?: string[] }) =>
    api.post('/api/admin/broadcasts', data),
  getBroadcasts: () => api.get('/api/admin/broadcasts'),
  getReports: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get('/api/admin/reports', { params }),
  moderateReport: (id: string, data: { status: 'APPROVED' | 'REJECTED'; notes?: string; rejectionReason?: string }) =>
    api.patch(`/api/admin/reports/${id}/moderate`, data),
  getTasks: (params?: { status?: string; type?: string; page?: number; limit?: number }) =>
    api.get('/api/admin/tasks', { params }),
  createTask: (data: any) => api.post('/api/tasks', data),
  publishTask: (id: string) => api.post(`/api/tasks/${id}/publish`),
  getAuditLogs: (params?: { action?: string; entityType?: string; page?: number; limit?: number }) =>
    api.get('/api/admin/audit-logs', { params }),
  // Товары (Products)
  getProducts: () => api.get('/api/products'),
  createProduct: (data: { name: string; description?: string; imageUrl?: string; isActive?: boolean }) =>
    api.post('/api/products', data),
  updateProduct: (id: string, data: { name?: string; description?: string; imageUrl?: string; isActive?: boolean }) =>
    api.patch(`/api/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/api/products/${id}`),
  // Магазин (ShopItems)
  getShopItems: () => api.get('/api/admin/shop-items'),
  createShopItem: (data: { name: string; description?: string; imageUrl?: string; price: number; stock?: number | null; category?: string; isActive?: boolean }) =>
    api.post('/api/admin/shop-items', data),
  updateShopItem: (id: string, data: { name?: string; description?: string; imageUrl?: string; price?: number; stock?: number | null; category?: string; isActive?: boolean }) =>
    api.patch(`/api/admin/shop-items/${id}`, data),
  deleteShopItem: (id: string) => api.delete(`/api/admin/shop-items/${id}`),
  getPurchases: (params?: { status?: string; userId?: string }) =>
    api.get('/api/admin/purchases', { params }),
  updatePurchaseStatus: (id: string, data: { status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'; notes?: string }) =>
    api.patch(`/api/shop/purchases/${id}/status`, data),
  // Статистика
  getStatistics: (params?: { startDate?: string; endDate?: string; userId?: string; taskId?: string }) =>
    api.get('/api/statistics/overview', { params }),
  getLeaderboard: (params?: { startDate?: string; endDate?: string; taskId?: string }) =>
    api.get('/api/statistics/leaderboard', { params }),
};

export const flarikiApi = {
  getBalance: () => api.get('/api/flariki/balance'),
  getTransactions: (params?: { page?: number; limit?: number; type?: string }) =>
    api.get('/api/flariki/transactions', { params }),
};

export const shopApi = {
  getItems: () => api.get('/api/shop/items'),
  getPurchases: () => api.get('/api/shop/purchases'),
  purchase: (data: { shopItemId: string; quantity: number }) =>
    api.post('/api/shop/purchase', data),
};

export const productsApi = {
  getProducts: () => api.get('/api/products'),
};

export default api;

