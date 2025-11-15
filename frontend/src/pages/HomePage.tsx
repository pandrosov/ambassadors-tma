import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Assignment,
  Assessment,
  AccountBalanceWallet,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import { useAuthStore } from '../store/auth';
import { tasksApi, flarikiApi } from '../lib/api';

export default function HomePage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    activeTasks: 0,
    pendingReports: 0,
    flarikiBalance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const [tasksRes, flarikiRes] = await Promise.all([
          tasksApi.getMyTasks({ status: 'ACTIVE' }),
          flarikiApi.getBalance(),
        ]);

        setStats({
          activeTasks: tasksRes.data.length || 0,
          pendingReports: 0,
          flarikiBalance: flarikiRes.data.balance || 0,
        });
      } catch (error: any) {
        console.error('Failed to load stats:', error);
        setStats({
          activeTasks: 0,
          pendingReports: 0,
          flarikiBalance: user.flarikiBalance || 0,
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadStats();
    }
  }, [user]);

  if (loading) {
    return (
      <Container sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>Загрузка...</Typography>
        </Box>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container sx={{ py: 3 }}>
        <Alert severity="info">Загрузка данных пользователя...</Alert>
      </Container>
    );
  }

  // Проверка статуса пользователя
  if (user.status === 'PENDING') {
    return (
      <Container sx={{ py: 3 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Warning sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Ожидание модерации
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Ваш аккаунт ожидает проверки администратором.
              После модерации вы сможете использовать все функции приложения.
            </Typography>
            <Button
              variant="contained"
              component={Link}
              to="/profile"
              size="large"
            >
              Заполнить профиль
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (user.status !== 'ACTIVE') {
    return (
      <Container sx={{ py: 3 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Warning sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Аккаунт неактивен
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ваш аккаунт заблокирован или неактивен.
              Обратитесь к администратору для получения помощи.
            </Typography>
          </CardContent>
        </Card>
      </Container>
    );
  }

  // Проверка заполненности профиля
  const hasContactInfo = !!(user.phone || user.email);
  const hasAddressInfo = !!(user.cdekPvz || user.address);
  const isProfileComplete = hasContactInfo && hasAddressInfo;

  if (!isProfileComplete) {
    return (
      <Container sx={{ py: 3 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Warning sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Заполните профиль
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Для доступа к функциям приложения необходимо заполнить контактные данные
              и адрес доставки в профиле.
            </Typography>
            <Button
              variant="contained"
              component={Link}
              to="/profile"
              size="large"
            >
              Перейти к профилю
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Добро пожаловать{user.firstName ? `, ${user.firstName}` : ''}!
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3, mb: 3 }}>
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Assignment sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.activeTasks}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Активных заданий
                  </Typography>
                </Box>
              </Box>
              <Button
                fullWidth
                variant="outlined"
                component={Link}
                to="/tasks"
                sx={{ mt: 1 }}
              >
                Посмотреть задания
              </Button>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Assessment sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.pendingReports}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Отчетов на проверке
                  </Typography>
                </Box>
              </Box>
              <Button
                fullWidth
                variant="outlined"
                component={Link}
                to="/reports"
                sx={{ mt: 1 }}
              >
                Мои отчеты
              </Button>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AccountBalanceWallet sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.flarikiBalance}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Флариков
                  </Typography>
                </Box>
              </Box>
              <Button
                fullWidth
                variant="outlined"
                component={Link}
                to="/flariki"
                sx={{ mt: 1 }}
              >
                История транзакций
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Быстрые действия
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
            <Button
              variant="contained"
              component={Link}
              to="/tasks"
              startIcon={<Assignment />}
            >
              Все задания
            </Button>
            <Button
              variant="outlined"
              component={Link}
              to="/reports"
              startIcon={<Assessment />}
            >
              Создать отчет
            </Button>
            <Button
              variant="outlined"
              component={Link}
              to="/profile"
              startIcon={<CheckCircle />}
            >
              Профиль
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
