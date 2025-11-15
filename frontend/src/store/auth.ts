import { create } from 'zustand';
import { usersApi } from '../lib/api';
import { getTelegramUser } from '../lib/telegram';

interface User {
  id: string;
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  role: string;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  cdekPvz?: string;
  address?: string;
  instagramLink?: string;
  youtubeLink?: string;
  tiktokLink?: string;
  vkLink?: string;
  flarikiBalance: number;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  initAuth: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  initAuth: async () => {
    try {
      set({ loading: true, error: null });
      
      // Получаем данные пользователя из Telegram
      const tgUser = await getTelegramUser();
      
      console.log('Initializing auth, Telegram user:', tgUser);
      
      // Режим разработки: если нет Telegram user, создаем мокового пользователя
      if (!tgUser) {
        console.warn('Telegram user not found. Running in development mode.');
        
        // Пытаемся загрузить пользователя с сервера (может быть создан вручную)
        try {
          const response = await usersApi.getMe();
          console.log('User loaded from server:', response.data);
          set({ user: response.data, loading: false });
          return;
        } catch (apiError: any) {
          console.warn('User not found on server:', apiError.response?.status, apiError.message);
          // Если пользователя нет на сервере, создаем мокового для разработки
          const mockUser: User = {
            id: 'dev-user-1',
            telegramId: 123456789,
            firstName: 'Тестовый',
            lastName: 'Пользователь',
            role: 'AMBASSADOR',
            status: 'ACTIVE',
            flarikiBalance: 0,
          };
          set({ user: mockUser, loading: false, error: null });
          return;
        }
      }

      // Добавляем таймаут для предотвращения бесконечной загрузки
      const timeoutId = setTimeout(() => {
        console.warn('Auth initialization timeout, setting loading to false');
        set((state) => ({ ...state, loading: false }));
      }, 10000); // 10 секунд таймаут

      // Загружаем данные пользователя с сервера
      console.log('Loading user from server with telegramId:', tgUser.id);
      let response;
      try {
        response = await usersApi.getMe();
        console.log('User loaded:', response.data);
        
        // Если у пользователя нет username или firstName, пробуем синхронизировать с Telegram
        if ((!response.data.username || !response.data.firstName) && tgUser.id) {
          try {
            console.log('Syncing Telegram data...');
            const syncResponse = await usersApi.syncTelegram();
            console.log('Telegram data synced:', syncResponse.data);
            set({ user: syncResponse.data, loading: false });
            return;
          } catch (syncError) {
            console.warn('Failed to sync Telegram data:', syncError);
            // Продолжаем с данными, которые есть
          }
        }
        
        clearTimeout(timeoutId);
        set({ user: response.data, loading: false });
      } catch (error: any) {
        clearTimeout(timeoutId);
        // Если пользователя нет, пробуем синхронизировать
        if (error.response?.status === 404 && tgUser.id) {
          try {
            console.log('User not found, syncing from Telegram...');
            const syncResponse = await usersApi.syncTelegram();
            set({ user: syncResponse.data, loading: false });
            return;
          } catch (syncError) {
            console.error('Failed to sync:', syncError);
          }
        }
        throw error;
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      
      // Если ошибка 401/404, возможно пользователя нет в базе - создаем мокового для разработки
      if (error.response?.status === 401 || error.response?.status === 404) {
        console.warn('User not authenticated. Using mock user for development.');
        const tgUser = await getTelegramUser();
        const mockUser: User = {
          id: 'dev-user-1',
          telegramId: tgUser?.id || 123456789,
          firstName: tgUser?.first_name || 'Тестовый',
          lastName: tgUser?.last_name || 'Пользователь',
          role: 'AMBASSADOR',
          status: 'ACTIVE',
          flarikiBalance: 0,
        };
        set({ user: mockUser, loading: false, error: null });
        return;
      }
      
      set({ 
        error: error.response?.data?.error || error.message || 'Failed to authenticate',
        loading: false 
      });
    }
  },

  updateUser: async (data: Partial<User>) => {
    try {
      const response = await usersApi.updateMe(data);
      set({ user: response.data });
    } catch (error: any) {
      console.error('Update user error:', error);
      throw error;
    }
  },

  logout: () => {
    set({ user: null, error: null });
  },
}));

