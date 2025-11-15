import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Grid,
  Alert,
} from '@mui/material';
import {
  Assignment,
  Event,
  AccountBalanceWallet,
  ArrowForward,
} from '@mui/icons-material';
import { useAuthStore } from '../store/auth';
import { tasksApi } from '../lib/api';

interface Task {
  id: string;
  title: string;
  description: string;
  type: 'GENERAL' | 'PERSONAL';
  status: string;
  deadline?: string;
  rewardFlariki?: number;
}

export default function TasksPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      console.log('TasksPage: User not loaded yet');
      return;
    }

    if (user.status !== 'ACTIVE') {
      console.log('TasksPage: User status is not ACTIVE:', user.status);
      navigate('/');
      return;
    }
    
    const hasContactInfo = !!(user.phone || user.email);
    const hasAddressInfo = !!(user.cdekPvz || user.address);
    if (!hasContactInfo || !hasAddressInfo) {
      console.log('TasksPage: Profile incomplete', {
        hasContactInfo,
        hasAddressInfo,
        phone: user.phone,
        email: user.email,
        cdekPvz: user.cdekPvz,
        address: user.address,
      });
      navigate('/');
      return;
    }

    console.log('TasksPage: Loading tasks for user:', user.id);
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, user?.id, user?.status]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('=== TasksPage: Loading tasks ===');
      console.log('Filter:', filter);
      console.log('User:', user?.id, user?.status);
      
      const statusMap = ['all', 'active', 'completed'] as const;
      const statusParam = filter === 0 ? undefined : statusMap[filter].toUpperCase();
      console.log('Requesting tasks with status:', statusParam);
      
      const response = await tasksApi.getMyTasks({ status: statusParam });
      console.log('Tasks response:', response);
      console.log('Tasks data:', response.data);
      console.log('Tasks count:', Array.isArray(response.data) ? response.data.length : 'not an array');
      
      if (Array.isArray(response.data)) {
        setTasks(response.data);
        console.log(`✅ Successfully loaded ${response.data.length} tasks`);
      } else {
        console.warn('⚠️ Response data is not an array:', response.data);
        setTasks([]);
        setError('Неверный формат ответа от сервера');
      }
    } catch (error: any) {
      console.error('❌ Failed to load tasks:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
      });
      
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Не удалось загрузить задания';
      console.error('Setting error message:', errorMessage);
      setError(errorMessage);
      
      // Если ошибка 403 (Forbidden), это может быть из-за статуса или профиля
      if (error.response?.status === 403) {
        const errorData = error.response?.data;
        if (errorData?.error === 'Profile incomplete') {
          console.warn('Profile incomplete - redirecting to profile');
          // Можно перенаправить на профиль или показать специальное сообщение
        } else if (errorData?.error === 'Account not active') {
          console.warn('Account not active:', errorData.status);
        }
      }
      
      setTasks([]);
    } finally {
      setLoading(false);
      console.log('=== TasksPage: Loading finished ===');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Задания
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={filter} onChange={(_, newValue) => setFilter(newValue)}>
          <Tab label="Все" />
          <Tab label="Активные" />
          <Tab label="Завершенные" />
        </Tabs>
      </Box>

      {tasks.length === 0 ? (
        <Alert severity="info">Нет заданий</Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
                    {task.title}
                  </Typography>
                  <Chip
                    label={task.type === 'GENERAL' ? 'Общее' : 'Персональное'}
                    size="small"
                    color={task.type === 'GENERAL' ? 'primary' : 'secondary'}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {task.description.length > 150 
                    ? `${task.description.substring(0, 150)}...` 
                    : task.description}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {task.deadline && (
                    <Chip
                      icon={<Event fontSize="small" />}
                      label={`До ${new Date(task.deadline).toLocaleDateString('ru-RU')}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {task.rewardFlariki && (
                    <Chip
                      icon={<AccountBalanceWallet fontSize="small" />}
                      label={`${task.rewardFlariki} флариков`}
                      size="small"
                      color="success"
                    />
                  )}
                </Box>
              </CardContent>
              <CardActions>
                <Button
                  component={Link}
                  to={`/tasks/${task.id}`}
                  endIcon={<ArrowForward />}
                  fullWidth
                >
                  Подробнее
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  );
}
