import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import axios from 'axios';

interface AdminRouteProps {
  children: ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading } = useAuthStore();
  const [jwtUser, setJwtUser] = useState<any>(null);
  const [jwtLoading, setJwtLoading] = useState(true);

  useEffect(() => {
    // Проверяем JWT токен для веб-версии
    const checkJWT = async () => {
      console.log('AdminRoute: checkJWT called');
      const token = localStorage.getItem('admin_token');
      console.log('AdminRoute: Token from localStorage:', token ? token.substring(0, 20) + '...' : 'null');
      
      if (!token) {
        console.log('AdminRoute: No token found, setting jwtLoading to false');
        setJwtLoading(false);
        return;
      }

      try {
        // Определяем backend URL (та же логика, что в AdminLoginPage)
        const getBackendUrl = () => {
          const env = (import.meta as any).env;
          if (env?.VITE_API_URL) {
            return env.VITE_API_URL;
          }
          
          // Production на Railway
          const currentHost = window.location.hostname;
          if (currentHost.includes('railway.app') || currentHost.includes('up.railway.app')) {
            // Используем фиксированный URL бэкенда
            return 'https://ambassadors-tma-production.up.railway.app';
          }
          
          const savedBackendUrl = localStorage.getItem('backend_api_url');
          if (savedBackendUrl) {
            return savedBackendUrl;
          }
          if (currentHost.includes('trycloudflare.com')) {
            return 'https://celebrities-lopez-got-left.trycloudflare.com';
          }
          return 'http://localhost:3000';
        };

        const backendUrl = getBackendUrl();
        console.log('AdminRoute: Checking token with backend URL:', backendUrl);
        
        const response = await axios.get('/api/auth/admin/me', {
          baseURL: backendUrl,
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 10000,
        });
        
        console.log('AdminRoute: Token validated, user:', response.data);
        setJwtUser(response.data);
      } catch (error: any) {
        console.error('AdminRoute: Token validation failed:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          code: error.code,
        });
        // Токен недействителен, удаляем его
        localStorage.removeItem('admin_token');
        setJwtUser(null);
      } finally {
        setJwtLoading(false);
      }
    };

    // Для админ-панели всегда проверяем JWT токен, независимо от Telegram пользователя
    // Telegram пользователи не должны иметь доступ к админ-панели через Mini App
    console.log('AdminRoute: useEffect triggered', { user, loading, hasToken: !!localStorage.getItem('admin_token') });
    
    // Проверяем JWT токен всегда, если нет активного Telegram пользователя или если это веб-версия
    if (!loading) {
      checkJWT();
    } else {
      console.log('AdminRoute: Waiting for auth store to finish loading...');
    }
  }, [user, loading]);

  if (loading || jwtLoading) {
    console.log('AdminRoute: Loading...', { loading, jwtLoading });
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div>Загрузка...</div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          Проверка аутентификации...
        </div>
      </div>
    );
  }

  console.log('AdminRoute: Auth check result', {
    jwtUser,
    jwtUserRole: jwtUser?.role,
    hasValidRole: jwtUser && (jwtUser.role === 'ADMIN' || jwtUser.role === 'MANAGER'),
  });

  // Админ-панель доступна ТОЛЬКО через JWT (веб-версия)
  // Telegram пользователи не могут заходить в админку через Mini App
  if (jwtUser && (jwtUser.role === 'ADMIN' || jwtUser.role === 'MANAGER')) {
    console.log('AdminRoute: Access granted');
    return <>{children}</>;
  }

  // Если нет JWT аутентификации, перенаправляем на страницу входа
  console.log('AdminRoute: Access denied, redirecting to login');
  return <Navigate to="/admin/login" replace />;
}

