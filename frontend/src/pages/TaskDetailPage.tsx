import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
} from '@mui/material';
import {
  Assignment,
  Event,
  AccountBalanceWallet,
  Assessment,
  CheckCircle,
  Pending,
  Cancel,
} from '@mui/icons-material';
import { useAuthStore } from '../store/auth';
import { tasksApi, reportsApi } from '../lib/api';
import { hapticFeedback } from '../lib/telegram';

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [task, setTask] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.status !== 'ACTIVE') {
      navigate('/');
      return;
    }
    
    const hasContactInfo = !!(user.phone || user.email);
    const hasAddressInfo = !!(user.cdekPvz || user.address);
    if (!hasContactInfo || !hasAddressInfo) {
      navigate('/');
      return;
    }

    if (id) {
      loadTask();
      loadReports();
    }
  }, [id, user, navigate]);

  const loadTask = async () => {
    try {
      const response = await tasksApi.getTask(id!);
      setTask(response.data);
    } catch (error) {
      console.error('Failed to load task:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      const response = await reportsApi.getMyReports({ taskId: id });
      setReports(response.data);
    } catch (error) {
      console.error('Failed to load reports:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle color="success" />;
      case 'PENDING':
        return <Pending color="warning" />;
      case 'REJECTED':
        return <Cancel color="error" />;
      default:
        return <Pending />;
    }
  };

  const getStatusColor = (status: string): "success" | "warning" | "error" | "default" => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'PENDING': return 'warning';
      case 'REJECTED': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!task) {
    return (
      <Container sx={{ py: 3 }}>
        <Alert severity="error">Задание не найдено</Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 3 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h4" gutterBottom>
              {task.title}
            </Typography>
            <Chip
              label={task.status === 'ACTIVE' ? 'Активно' : 'Завершено'}
              color={task.status === 'ACTIVE' ? 'success' : 'default'}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Описание
          </Typography>
          <Typography variant="body1" paragraph>
            {task.description}
          </Typography>

          {task.requirements && (
            <>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Требования
              </Typography>
              <Typography variant="body1" paragraph>
                {task.requirements}
              </Typography>
            </>
          )}

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 3 }}>
            {task.deadline && (
              <Chip
                icon={<Event />}
                label={`Дедлайн: ${new Date(task.deadline).toLocaleDateString('ru-RU')}`}
                variant="outlined"
              />
            )}
            {task.rewardFlariki && (
              <Chip
                icon={<AccountBalanceWallet />}
                label={`Награда: ${task.rewardFlariki} флариков`}
                color="success"
              />
            )}
          </Box>

          {task.status === 'ACTIVE' && (
            <Button
              variant="contained"
              fullWidth
              size="large"
              component={Link}
              to={`/tasks/${id}/report`}
              startIcon={<Assessment />}
              sx={{ mt: 3 }}
              onClick={() => hapticFeedback('medium')}
            >
              Отправить отчет
            </Button>
          )}
        </CardContent>
      </Card>

      {reports.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Мои отчеты
            </Typography>
            <List>
              {reports.map((report) => (
                <ListItem key={report.id} divider>
                  <ListItemIcon>
                    {getStatusIcon(report.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1">
                          {report.type === 'VIDEO_LINK' ? 'Видео' : 'Сторис'}
                        </Typography>
                        <Chip
                          label={
                            report.status === 'PENDING' ? 'На проверке' :
                            report.status === 'APPROVED' ? 'Одобрен' :
                            'Отклонен'
                          }
                          size="small"
                          color={getStatusColor(report.status)}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(report.submittedAt).toLocaleDateString('ru-RU')}
                        </Typography>
                        {report.videoLinks && report.videoLinks.length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            {report.videoLinks.map((link: any, idx: number) => (
                              <Typography
                                key={idx}
                                variant="body2"
                                component="a"
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ display: 'block', color: 'primary.main', textDecoration: 'none' }}
                              >
                                {link.url}
                              </Typography>
                            ))}
                          </Box>
                        )}
                        {report.rejectionReason && (
                          <Alert severity="error" sx={{ mt: 1 }}>
                            Причина отклонения: {report.rejectionReason}
                          </Alert>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Container>
  );
}
