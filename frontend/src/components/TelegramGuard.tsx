import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface TelegramGuardProps {
  children: ReactNode;
  allowDev?: boolean;
}

export default function TelegramGuard({ children, allowDev = false }: TelegramGuardProps) {
  const [isTelegram, setIsTelegram] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Разрешаем доступ к админ-панели без Telegram (для веб-версии)
    if (location.pathname.startsWith('/admin')) {
      setIsTelegram(true);
      return;
    }

    // Проверяем, запущено ли приложение в Telegram
    const checkTelegram = () => {
      // Проверяем наличие Telegram WebApp API
      if (window.Telegram?.WebApp) {
        setIsTelegram(true);
        return;
      }

      // Проверяем наличие initData в URL (Telegram передает данные через hash)
      const hash = window.location.hash;
      if (hash && (hash.includes('tgWebAppData') || hash.includes('_auth') || hash.includes('initData'))) {
        setIsTelegram(true);
        return;
      }

      // Проверяем user agent (не очень надежно, но может помочь)
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('telegram')) {
        setIsTelegram(true);
        return;
      }

      // В режиме разработки разрешаем доступ
      if (allowDev && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        setIsTelegram(true);
        return;
      }

      // Разрешаем доступ через Cloudflare туннель (для тестирования)
      if (window.location.hostname.includes('trycloudflare.com')) {
        setIsTelegram(true);
        return;
      }

      setIsTelegram(false);
    };

    checkTelegram();
  }, [allowDev, location.pathname]);

  if (isTelegram === null) {
    console.log('TelegramGuard: Проверка платформы...', {
      hostname: window.location.hostname,
      hasTelegram: !!window.Telegram?.WebApp,
      hash: window.location.hash,
    });
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh'
      }}>
        <div>Проверка платформы...</div>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
          Hostname: {window.location.hostname}
        </div>
      </div>
    );
  }

  console.log('TelegramGuard: isTelegram =', isTelegram, 'pathname:', location.pathname);

  if (!isTelegram) {
    return (
      <div style={{ 
        padding: '40px 20px', 
        textAlign: 'center',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <h1>⚠️ Доступ ограничен</h1>
        <p>Это приложение доступно только через Telegram Mini App.</p>
        <p>Пожалуйста, откройте приложение через Telegram бота.</p>
        <p style={{ marginTop: '1rem' }}>
          <a href="/admin/login" style={{ color: '#3390ec', textDecoration: 'underline' }}>
            Войти в админ-панель
          </a>
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

