import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  requireActive?: boolean;
  requireProfile?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requireActive = true,
  requireProfile = true 
}: ProtectedRouteProps) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Проверка статуса
  if (requireActive && user.status !== 'ACTIVE') {
    return <Navigate to="/" replace />;
  }

  // Проверка заполненности профиля
  if (requireProfile) {
    const hasContactInfo = !!(user.phone || user.email);
    const hasAddressInfo = !!(user.cdekPvz || user.address);
    const isProfileComplete = hasContactInfo && hasAddressInfo;

    if (!isProfileComplete) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

