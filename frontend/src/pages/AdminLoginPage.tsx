import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminLoginPage.css';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Проверяем, авторизован ли пользователь уже
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        return;
      }

      try {
        // Определяем backend URL
        const getBackendUrl = () => {
          const env = (import.meta as any).env;
          if (env?.VITE_API_URL) {
            return env.VITE_API_URL;
          }
          
          // Production на Railway
          const currentHost = window.location.hostname;
          if (currentHost.includes('railway.app') || currentHost.includes('up.railway.app')) {
            let backendUrl = window.location.origin.replace('frontend', 'backend');
            if (backendUrl === window.location.origin) {
              const match = currentHost.match(/^([^.]+)-(frontend|web|app)(.*)$/);
              if (match) {
                const [, serviceName, , rest] = match;
                backendUrl = `https://${serviceName}-backend${rest}`;
              } else {
                backendUrl = 'https://ambassadors-tma-production.up.railway.app';
              }
            }
            return backendUrl;
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
        const response = await axios.get('/api/auth/admin/me', {
          baseURL: backendUrl,
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 5000,
        });

        // Если токен валиден, редиректим на /admin
        if (response.data && (response.data.role === 'ADMIN' || response.data.role === 'MANAGER')) {
          console.log('AdminLoginPage: Already authenticated, redirecting to /admin');
          navigate('/admin', { replace: true });
        }
      } catch (error) {
        // Токен невалиден, удаляем его
        console.log('AdminLoginPage: Token invalid, removing from localStorage');
        localStorage.removeItem('admin_token');
      }
    };

    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Определяем backend URL для админ-панели
      const getBackendUrl = () => {
        // Приоритет 1: Переменная окружения
        const env = (import.meta as any).env;
        if (env?.VITE_API_URL) {
          return env.VITE_API_URL;
        }
        
        // Приоритет 2: Production на Railway
        const currentHost = window.location.hostname;
        if (currentHost.includes('railway.app') || currentHost.includes('up.railway.app')) {
          let backendUrl = window.location.origin.replace('frontend', 'backend');
          if (backendUrl === window.location.origin) {
            const match = currentHost.match(/^([^.]+)-(frontend|web|app)(.*)$/);
            if (match) {
              const [, serviceName, , rest] = match;
              backendUrl = `https://${serviceName}-backend${rest}`;
            } else {
              backendUrl = 'https://ambassadors-tma-production.up.railway.app';
            }
          }
          return backendUrl;
        }
        
        // Приоритет 3: localStorage (сохраненный URL)
        const savedBackendUrl = localStorage.getItem('backend_api_url');
        if (savedBackendUrl) {
          return savedBackendUrl;
        }
        
        // Приоритет 4: Если это Cloudflare домен, используем backend туннель
        if (currentHost.includes('trycloudflare.com')) {
          return 'https://celebrities-lopez-got-left.trycloudflare.com';
        }
        
        // По умолчанию: localhost для локальной разработки
        return 'http://localhost:3000';
      };

      const backendUrl = getBackendUrl();
      console.log('Admin login: Using backend URL:', backendUrl);

      console.log('Sending login request to:', backendUrl);
      const response = await axios.post('/api/auth/admin/login', {
        email,
        password,
      }, {
        baseURL: backendUrl,
        timeout: 10000,
      });

      console.log('Login response:', response.data);

      // Сохраняем токен
      const token = response.data.token;
      localStorage.setItem('admin_token', token);
      console.log('Token saved to localStorage:', token.substring(0, 20) + '...');
      
      // Небольшая задержка перед редиректом, чтобы токен успел сохраниться
      setTimeout(() => {
        console.log('Navigating to /admin...');
        navigate('/admin', { replace: true });
      }, 100);
    } catch (err: any) {
      console.error('Login error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText,
      });
      
      if (err.code === 'ECONNABORTED') {
        setError('Превышено время ожидания. Проверьте, что backend доступен.');
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.status === 401) {
        setError('Неверный email или пароль');
      } else if (err.response?.status === 403) {
        setError('Аккаунт неактивен');
      } else if (err.message === 'Network Error') {
        setError('Не удалось подключиться к серверу. Проверьте, что backend запущен.');
      } else {
        setError(err.message || 'Ошибка входа. Проверьте email и пароль.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>🔐 Вход в админ-панель</h1>
          <p>Введите email и пароль для доступа</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="admin@example.com"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="Введите пароль"
              className="form-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div className="login-footer">
          <p className="hint">
            💡 Для первого входа используйте email пользователя с ролью ADMIN или MANAGER.
            Пароль будет создан автоматически при первом входе.
          </p>
        </div>
      </div>
    </div>
  );
}

