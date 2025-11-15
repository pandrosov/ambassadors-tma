import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { Box, BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import {
  Home,
  Assignment,
  Assessment,
  AccountBalanceWallet,
  Person,
  ShoppingCart,
} from '@mui/icons-material';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user } = useAuthStore();

  // Проверяем, может ли пользователь использовать функционал
  const canUseApp = user && user.status === 'ACTIVE' && 
    !!(user.phone || user.email) && 
    !!(user.cdekPvz || user.address);

  const navItems = [
    { path: '/', label: 'Главная', icon: <Home />, alwaysVisible: true },
    { path: '/tasks', label: 'Задания', icon: <Assignment />, requiresAccess: true },
    { path: '/reports', label: 'Отчеты', icon: <Assessment />, requiresAccess: true },
    { path: '/flariki', label: 'Фларики', icon: <AccountBalanceWallet />, requiresAccess: true },
    { path: '/shop', label: 'Магазин', icon: <ShoppingCart />, requiresAccess: true },
    { path: '/profile', label: 'Профиль', icon: <Person />, alwaysVisible: true },
  ];

  const handleNavClick = (e: React.MouseEvent, item: typeof navItems[0]) => {
    if (item.requiresAccess && !canUseApp) {
      e.preventDefault();
      const message = user?.status === 'PENDING' 
        ? 'Ваш аккаунт ожидает модерации'
        : 'Заполните профиль для доступа к функциям';
      
      try {
        const tgWebApp = window.Telegram?.WebApp as any;
        if (tgWebApp?.showAlert) {
          tgWebApp.showAlert(message);
        } else {
          alert(message);
        }
      } catch (error) {
        alert(message);
      }
    }
  };

  const currentPath = location.pathname;
  const visibleNavItems = navItems.filter(item => {
    const isVisible = item.alwaysVisible || (item.requiresAccess && canUseApp);
    return isVisible;
  });
  const currentIndex = visibleNavItems.findIndex(item => item.path === currentPath);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      pb: 7, // Отступ для нижней навигации
    }}>
      <Box component="main" sx={{ flexGrow: 1, width: '100%' }}>
        {children}
      </Box>
      
      {visibleNavItems.length > 0 && (
        <Paper
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
          }}
          elevation={3}
        >
          <BottomNavigation
            value={currentIndex >= 0 ? currentIndex : 0}
            showLabels
          >
            {visibleNavItems.map((item) => {
              const isDisabled = (item.requiresAccess && !canUseApp);
              
              return (
                <BottomNavigationAction
                  key={item.path}
                  component={Link}
                  to={item.path}
                  label={item.label}
                  icon={item.icon}
                  onClick={(e) => handleNavClick(e, item)}
                  disabled={isDisabled}
                  sx={{
                    opacity: isDisabled ? 0.5 : 1,
                    '&.Mui-disabled': {
                      opacity: 0.5,
                    },
                  }}
                />
              );
            })}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}
