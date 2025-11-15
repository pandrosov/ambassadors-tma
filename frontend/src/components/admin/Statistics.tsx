import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { adminApi } from '../../lib/api';
// Графики временно отключены - требуется установка recharts

interface StatisticsData {
  period: {
    startDate: string | null;
    endDate: string | null;
  };
  totals: {
    reports: number;
    videos: number;
    stories: number;
    views: number;
    likes: number;
    comments: number;
    storyReach: number;
  };
  reports: Array<{
    id: string;
    userId: string;
    userName: string;
    taskId: string;
    taskTitle: string;
    type: string;
    videos: number;
    stories: number;
    views: number;
    likes: number;
    comments: number;
    storyReach: number;
    submittedAt: string;
  }>;
}

export default function Statistics() {
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      const response = await adminApi.getUsers({ status: 'ACTIVE' });
      const usersData = response.data?.users || response.data || [];
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const response = await adminApi.getTasks();
      const tasksData = response.data?.tasks || response.data || [];
      setTasks(Array.isArray(tasksData) ? tasksData : []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {};
      if (startDate) {
        params.startDate = startDate.toISOString();
      }
      if (endDate) {
        params.endDate = endDate.toISOString();
      }
      if (selectedUserId) {
        params.userId = selectedUserId;
      }
      if (selectedTaskId) {
        params.taskId = selectedTaskId;
      }

      const response = await adminApi.getStatistics(params);
      setStatistics(response.data);
    } catch (error: any) {
      console.error('Failed to load statistics:', error);
      setError(error.response?.data?.error || 'Не удалось загрузить статистику');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadTasks();
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [startDate, endDate, selectedUserId, selectedTaskId]);

  const handleResetFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setSelectedUserId('');
    setSelectedTaskId('');
  };

  // Данные для графиков (можно использовать после установки recharts)
  // const chartData = statistics?.reports.map((report) => ({
  //   name: report.userName.substring(0, 15),
  //   views: report.views,
  //   likes: report.likes,
  //   comments: report.comments,
  //   storyReach: report.storyReach,
  // })) || [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Статистика</Typography>
        <Button variant="outlined" onClick={handleResetFilters}>
          Сбросить фильтры
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Фильтры
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Начальная дата"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Конечная дата"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Пользователь</InputLabel>
              <Select
                value={selectedUserId}
                label="Пользователь"
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <MenuItem value="">Все пользователи</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Задание</InputLabel>
              <Select
                value={selectedTaskId}
                label="Задание"
                onChange={(e) => setSelectedTaskId(e.target.value)}
              >
                <MenuItem value="">Все задания</MenuItem>
                {tasks.map((task) => (
                  <MenuItem key={task.id} value={task.id}>
                    {task.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <Typography>Загрузка...</Typography>
        </Box>
      ) : statistics ? (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Отчетов
                  </Typography>
                  <Typography variant="h4">
                    {statistics.totals.reports}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Видео
                  </Typography>
                  <Typography variant="h4">
                    {statistics.totals.videos}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Сторис
                  </Typography>
                  <Typography variant="h4">
                    {statistics.totals.stories}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Просмотры
                  </Typography>
                  <Typography variant="h4">
                    {statistics.totals.views.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Лайки
                  </Typography>
                  <Typography variant="h4">
                    {statistics.totals.likes.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Комментарии
                  </Typography>
                  <Typography variant="h4">
                    {statistics.totals.comments.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Охват сторис
                  </Typography>
                  <Typography variant="h4">
                    {statistics.totals.storyReach.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Графики можно добавить после установки recharts */}

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Пользователь</TableCell>
                  <TableCell>Задание</TableCell>
                  <TableCell>Тип</TableCell>
                  <TableCell>Видео</TableCell>
                  <TableCell>Сторис</TableCell>
                  <TableCell>Просмотры</TableCell>
                  <TableCell>Лайки</TableCell>
                  <TableCell>Комментарии</TableCell>
                  <TableCell>Охват сторис</TableCell>
                  <TableCell>Дата</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {statistics.reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      Нет данных за выбранный период
                    </TableCell>
                  </TableRow>
                ) : (
                  statistics.reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>{report.userName}</TableCell>
                      <TableCell>{report.taskTitle}</TableCell>
                      <TableCell>
                        {report.type === 'VIDEO_LINK' ? 'Видео' : 'Сторис'}
                      </TableCell>
                      <TableCell>{report.videos}</TableCell>
                      <TableCell>{report.stories}</TableCell>
                      <TableCell>{report.views.toLocaleString()}</TableCell>
                      <TableCell>{report.likes.toLocaleString()}</TableCell>
                      <TableCell>{report.comments.toLocaleString()}</TableCell>
                      <TableCell>{report.storyReach.toLocaleString()}</TableCell>
                      <TableCell>
                        {new Date(report.submittedAt).toLocaleDateString('ru-RU')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : null}
    </Box>
  );
}

