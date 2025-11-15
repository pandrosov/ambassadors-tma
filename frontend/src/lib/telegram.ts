declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        version?: string;
        platform?: string;
        initData?: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            phone_number?: string;
          };
          auth_date?: number;
        };
        themeParams?: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
        };
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        enableClosingConfirmation?: () => void;
        showAlert?: (message: string, callback?: () => void) => void;
        requestContact?: (callback: (contact: any) => void) => void;
        MainButton: {
          text: string;
          isVisible?: boolean;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
        };
        BackButton: {
          onClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
        };
      };
    };
  }
}

/**
 * Инициализация Telegram WebApp
 */
export function initTelegramWebApp() {
  // Проверяем, запущено ли приложение в Telegram
  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    
    // Инициализируем WebApp
    tg.ready();
    tg.expand();
    
    // Настраиваем тему
    if (tg.themeParams?.bg_color) {
      tg.setHeaderColor(tg.themeParams.bg_color);
      tg.setBackgroundColor(tg.themeParams.bg_color);
    }
    
    // Включаем подтверждение закрытия (если поддерживается)
    try {
      tg.enableClosingConfirmation();
    } catch (e) {
      // Игнорируем ошибку, если не поддерживается
    }
    
    console.log('Telegram WebApp инициализирован', {
      version: tg.version,
      platform: tg.platform,
      initData: tg.initData ? 'present' : 'missing',
      initDataUnsafe: tg.initDataUnsafe ? {
        user: tg.initDataUnsafe.user ? 'present' : 'missing',
        auth_date: tg.initDataUnsafe.auth_date,
      } : 'missing',
      user: tg.initDataUnsafe?.user,
    });
    
    // Дополнительная отладка
    console.log('Full initDataUnsafe:', tg.initDataUnsafe);
    console.log('Full initData:', tg.initData);
  } else {
    // Для разработки вне Telegram - добавляем заглушку
    console.warn('Telegram WebApp не обнаружен. Запуск в режиме разработки.');
  }
}

/**
 * Получение initData для аутентификации
 */
export function getInitData(): string | null {
  try {
    // Используем нативный Telegram WebApp API
    if (window.Telegram?.WebApp?.initData) {
      const initData = window.Telegram.WebApp.initData;
      console.log('Got initData from Telegram.WebApp:', initData ? 'present' : 'missing');
      return initData;
    }
    
    // Пробуем получить из window.location.hash
    try {
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        // Telegram может передавать initData через разные параметры
        const initData = params.get('tgWebAppData') || params.get('_auth') || params.get('initData');
        if (initData) {
          console.log('Got initData from hash');
          return decodeURIComponent(initData);
        }
      }
    } catch (e) {
      // Игнорируем ошибки
    }
    
    // Fallback на SDK (если используется)
    try {
      const { retrieveLaunchParams } = require('@telegram-apps/sdk');
      const launchParams = retrieveLaunchParams();
      if (launchParams.initDataRaw) {
        console.log('Got initData from SDK');
        return launchParams.initDataRaw;
      }
    } catch (e) {
      // SDK не доступен
    }
    
    console.warn('initData not found');
    return null;
  } catch (error) {
    console.error('Failed to get init data:', error);
    return null;
  }
}

/**
 * Получение данных пользователя из Telegram
 */
export function getTelegramUser() {
  try {
    // Используем нативный Telegram WebApp API
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      // Пробуем получить из initDataUnsafe (самый надежный способ)
      if (tg.initDataUnsafe?.user) {
        console.log('Got user from initDataUnsafe:', tg.initDataUnsafe.user);
        return tg.initDataUnsafe.user;
      }
      
      // Пробуем распарсить initData вручную
      if (tg.initData) {
        try {
          const params = new URLSearchParams(tg.initData);
          const userParam = params.get('user');
          if (userParam) {
            const user = JSON.parse(decodeURIComponent(userParam));
            console.log('Got user from parsed initData:', user);
            return user;
          }
        } catch (e) {
          console.warn('Failed to parse user from initData:', e);
        }
      }
      
      // Пробуем получить из window.location.hash (Telegram передает данные через hash)
      try {
        const hash = window.location.hash;
        if (hash) {
          const params = new URLSearchParams(hash.substring(1));
          const userParam = params.get('user');
          if (userParam) {
            const user = JSON.parse(decodeURIComponent(userParam));
            console.log('Got user from hash:', user);
            return user;
          }
        }
      } catch (e) {
        // Игнорируем ошибки парсинга hash
      }
    }
    
    // Fallback на SDK (если используется)
    try {
      const { retrieveLaunchParams } = require('@telegram-apps/sdk');
      const launchParams = retrieveLaunchParams();
      if (launchParams.initData?.user) {
        console.log('Got user from SDK:', launchParams.initData.user);
        return launchParams.initData.user;
      }
    } catch (e) {
      // SDK не доступен
    }
    
    console.warn('Telegram user not found in any source');
    return null;
  } catch (error) {
    console.error('Failed to get Telegram user:', error);
    return null;
  }
}

/**
 * Показать главную кнопку Telegram
 */
export function showMainButton(text: string, onClick: () => void) {
  if (window.Telegram?.WebApp?.MainButton) {
    const btn = window.Telegram.WebApp.MainButton;
    // Используем setText если доступен, иначе text
    if (typeof btn.setText === 'function') {
      btn.setText(text);
    } else {
      btn.text = text;
    }
    btn.onClick(onClick);
    btn.show();
    btn.enable();
    console.log('MainButton shown:', text);
  } else {
    console.warn('MainButton not available');
  }
}

/**
 * Скрыть главную кнопку Telegram
 */
export function hideMainButton() {
  if (window.Telegram?.WebApp?.MainButton) {
    window.Telegram.WebApp.MainButton.hide();
    console.log('MainButton hidden');
  }
}

/**
 * Тактильная обратная связь
 */
export function hapticFeedback(style: 'light' | 'medium' | 'heavy' = 'medium') {
  if (window.Telegram?.WebApp?.HapticFeedback) {
    window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
  }
}

/**
 * Запрос номера телефона у пользователя через Telegram WebApp API
 * Использует метод MainButton для запроса контакта
 * Возвращает промис с номером телефона или null если пользователь отклонил запрос
 */
export function requestPhoneNumber(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const tgWebApp = window.Telegram?.WebApp as any;
      
      if (!tgWebApp) {
        console.warn('Telegram WebApp not available');
        resolve(null);
        return;
      }

      // Используем MainButton для запроса контакта
      // Это стандартный способ запроса номера телефона в Telegram Mini Apps
      if (tgWebApp.MainButton && tgWebApp.MainButton.setText) {
        const originalText = tgWebApp.MainButton.text || '';
        const originalVisible = tgWebApp.MainButton.isVisible;
        
        // Настраиваем кнопку для запроса контакта
        tgWebApp.MainButton.setText('Поделиться номером телефона');
        tgWebApp.MainButton.show();
        
        // Обработчик нажатия на кнопку
        const handleClick = () => {
          // Запрашиваем контакт через requestContact
          if (tgWebApp.requestContact) {
            tgWebApp.requestContact((contact: any) => {
              // Восстанавливаем кнопку
              if (originalText) {
                tgWebApp.MainButton.setText(originalText);
              } else {
                tgWebApp.MainButton.hide();
              }
              tgWebApp.MainButton.offClick(handleClick);
              
              if (contact && contact.phone_number) {
                console.log('Phone number received:', contact.phone_number);
                resolve(contact.phone_number);
              } else {
                console.log('User declined phone number request');
                resolve(null);
              }
            });
          } else {
            // Если requestContact недоступен, пробуем получить из initDataUnsafe
            const user = tgWebApp.initDataUnsafe?.user;
            if (user && user.phone_number) {
              console.log('Phone number from initDataUnsafe:', user.phone_number);
              resolve(user.phone_number);
            } else {
              console.warn('Phone number not available');
              resolve(null);
            }
            
            // Восстанавливаем кнопку
            if (originalText) {
              tgWebApp.MainButton.setText(originalText);
            } else {
              tgWebApp.MainButton.hide();
            }
            tgWebApp.MainButton.offClick(handleClick);
          }
        };
        
        tgWebApp.MainButton.onClick(handleClick);
        
        // Таймаут на случай, если пользователь не нажмет кнопку
        setTimeout(() => {
          if (originalText) {
            tgWebApp.MainButton.setText(originalText);
          } else {
            tgWebApp.MainButton.hide();
          }
          tgWebApp.MainButton.offClick(handleClick);
          resolve(null);
        }, 30000); // 30 секунд таймаут
      } else {
        // Альтернативный способ: пробуем получить номер из initDataUnsafe
        const user = tgWebApp.initDataUnsafe?.user;
        if (user && user.phone_number) {
          console.log('Phone number from initDataUnsafe:', user.phone_number);
          resolve(user.phone_number);
        } else {
          console.warn('Phone number request not supported');
          resolve(null);
        }
      }
    } catch (error) {
      console.error('Failed to request phone number:', error);
      resolve(null);
    }
  });
}

