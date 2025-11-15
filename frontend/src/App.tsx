import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { initTelegramWebApp } from './lib/telegram';
import { useAuthStore } from './store/auth';
import { userTheme } from './theme';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import TelegramGuard from './components/TelegramGuard';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import TasksPage from './pages/TasksPage';
import TaskDetailPage from './pages/TaskDetailPage';
import ReportsPage from './pages/ReportsPage';
import FlarikiPage from './pages/FlarikiPage';
import ShopPage from './pages/ShopPage';
import AdminPage from './pages/AdminPage';
import AdminLoginPage from './pages/AdminLoginPage';

function App() {
  const { initAuth, loading } = useAuthStore();

  useEffect(() => {
    // Инициализация Telegram WebApp
    try {
      initTelegramWebApp();
    } catch (error) {
      console.error('Failed to init Telegram WebApp:', error);
    }
    
    // Инициализация аутентификации (с задержкой для загрузки Telegram API)
    // Telegram WebApp может загружать данные асинхронно
    const timer = setTimeout(() => {
      // Проверяем наличие данных перед инициализацией
      try {
        if (window.Telegram?.WebApp) {
          const tgWebApp = window.Telegram.WebApp as any;
          console.log('Checking Telegram data before auth:', {
            hasInitData: !!tgWebApp.initData,
            hasInitDataUnsafe: !!tgWebApp.initDataUnsafe,
            hasUser: !!tgWebApp.initDataUnsafe?.user,
          });
        }
      } catch (error) {
        console.warn('Telegram WebApp not available:', error);
      }
      initAuth().catch(err => {
        console.error('Auth initialization failed:', err);
      });
    }, 500); // Увеличена задержка для загрузки данных от Telegram
    
    return () => clearTimeout(timer);
  }, [initAuth]);

  // Показываем индикатор загрузки если аутентификация еще не завершена
  if (loading) {
    console.log('App: Показываем индикатор загрузки (loading = true)');
    return (
      <ThemeProvider theme={userTheme}>
        <CssBaseline />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          flexDirection: 'column',
          gap: '16px',
          backgroundColor: '#fff',
          color: '#000'
        }}>
          <div>Загрузка...</div>
        </div>
      </ThemeProvider>
    );
  }

  console.log('App: Рендерим основное приложение (loading = false)');

  return (
    <ThemeProvider theme={userTheme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          {/* Админ-панель доступна только через веб (без Telegram Guard) */}
          <Route 
            path="/admin/login" 
            element={<AdminLoginPage />} 
          />
          <Route 
            path="/admin/*" 
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            } 
          />
          
          {/* Остальные страницы только через Telegram */}
          <Route path="/" element={
            <TelegramGuard allowDev={process.env.NODE_ENV === 'development'}>
              <Layout>
                <HomePage />
              </Layout>
            </TelegramGuard>
          } />
          <Route path="/profile" element={
            <TelegramGuard allowDev={process.env.NODE_ENV === 'development'}>
              <Layout>
                <ProfilePage />
              </Layout>
            </TelegramGuard>
          } />
          <Route 
            path="/tasks" 
            element={
              <TelegramGuard allowDev={process.env.NODE_ENV === 'development'}>
                <Layout>
                  <ProtectedRoute requireActive requireProfile>
                    <TasksPage />
                  </ProtectedRoute>
                </Layout>
              </TelegramGuard>
            } 
          />
          <Route 
            path="/tasks/:id" 
            element={
              <TelegramGuard allowDev={process.env.NODE_ENV === 'development'}>
                <Layout>
                  <ProtectedRoute requireActive requireProfile>
                    <TaskDetailPage />
                  </ProtectedRoute>
                </Layout>
              </TelegramGuard>
            } 
          />
          <Route 
            path="/tasks/:id/report" 
            element={
              <TelegramGuard allowDev={process.env.NODE_ENV === 'development'}>
                <Layout>
                  <ProtectedRoute requireActive requireProfile>
                    <ReportsPage />
                  </ProtectedRoute>
                </Layout>
              </TelegramGuard>
            } 
          />
          <Route 
            path="/reports" 
            element={
              <TelegramGuard allowDev={process.env.NODE_ENV === 'development'}>
                <Layout>
                  <ProtectedRoute requireActive requireProfile>
                    <ReportsPage />
                  </ProtectedRoute>
                </Layout>
              </TelegramGuard>
            } 
          />
          <Route 
            path="/flariki" 
            element={
              <TelegramGuard allowDev={process.env.NODE_ENV === 'development'}>
                <Layout>
                  <ProtectedRoute requireActive requireProfile>
                    <FlarikiPage />
                  </ProtectedRoute>
                </Layout>
              </TelegramGuard>
            } 
          />
          <Route 
            path="/shop" 
            element={
              <TelegramGuard allowDev={process.env.NODE_ENV === 'development'}>
                <Layout>
                  <ProtectedRoute requireActive requireProfile>
                    <ShopPage />
                  </ProtectedRoute>
                </Layout>
              </TelegramGuard>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

