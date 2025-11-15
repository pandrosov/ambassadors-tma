import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid,
  Alert,
} from '@mui/material';
import { EmojiEvents, TrendingUp } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { adminApi } from '../../lib/api';

interface LeaderboardEntry {
  userId: string;
  userName: string;
  username: string | null;
  telegramId: number;
  reportsCount: number;
  videos: number;
  stories: number;
  views: number;
  likes: number;
  comments: number;
  storyReach: number;
  rating: number;
  flarikiBalance: number;
}

interface LeaderboardData {
  period: {
    startDate: string | null;
    endDate: string | null;
  };
  leaderboard: LeaderboardEntry[];
}

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = async () => {
    try {
      const response = await adminApi.getTasks();
      const tasksData = response.data?.tasks || response.data || [];
      setTasks(Array.isArray(tasksData) ? tasksData : []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const loadLeaderboard = async () => {
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
      if (selectedTaskId) {
        params.taskId = selectedTaskId;
      }

      const response = await adminApi.getLeaderboard(params);
      setLeaderboard(response.data);
    } catch (error: any) {
      console.error('Failed to load leaderboard:', error);
      setError(error.response?.data?.error || 'Не удалось загрузить рейтинг');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [startDate, endDate, selectedTaskId]);

  const handleResetFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setSelectedTaskId('');
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}.`;
  };

  const getRankColor = (index: number) => {
    if (index === 0) return 'gold';
    if (index === 1) return 'silver';
    if (index === 2) return '#cd7f32'; // bronze
    return 'inherit';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Рейтинг амбассадоров</Typography>
        <Button variant="outlined" onClick={handleResetFilters}>
          Сбросить фильтры
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Фильтры
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Начальная дата"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Конечная дата"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
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
      ) : leaderboard && leaderboard.leaderboard.length > 0 ? (
        <>
          {/* Топ-3 */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {leaderboard.leaderboard.slice(0, 3).map((entry, index) => (
              <Grid item xs={12} md={4} key={entry.userId}>
                <Card
                  sx={{
                    background: index === 0
                      ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                      : index === 1
                      ? 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)'
                      : 'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)',
                    color: 'white',
                    textAlign: 'center',
                    position: 'relative',
                    pt: 2,
                  }}
                >
                  <Box sx={{ fontSize: 48, mb: 1 }}>
                    {getRankIcon(index)}
                  </Box>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {entry.userName}
                    </Typography>
                    {entry.username && (
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
                        @{entry.username}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2 }}>
                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                          {entry.rating.toFixed(0)}
                        </Typography>
                        <Typography variant="caption">Рейтинг</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.3)' }}>
                      <Box>
                        <Typography variant="h6">{entry.views.toLocaleString()}</Typography>
                        <Typography variant="caption">Просмотры</Typography>
                      </Box>
                      <Box>
                        <Typography variant="h6">{entry.likes.toLocaleString()}</Typography>
                        <Typography variant="caption">Лайки</Typography>
                      </Box>
                      <Box>
                        <Typography variant="h6">{entry.flarikiBalance}</Typography>
                        <Typography variant="caption">Фларики</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Полная таблица */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Место</TableCell>
                  <TableCell>Пользователь</TableCell>
                  <TableCell>Отчетов</TableCell>
                  <TableCell>Видео</TableCell>
                  <TableCell>Сторис</TableCell>
                  <TableCell>Просмотры</TableCell>
                  <TableCell>Лайки</TableCell>
                  <TableCell>Комментарии</TableCell>
                  <TableCell>Охват сторис</TableCell>
                  <TableCell>Рейтинг</TableCell>
                  <TableCell>Фларики</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaderboard.leaderboard.map((entry, index) => (
                  <TableRow
                    key={entry.userId}
                    sx={{
                      backgroundColor: index < 3 ? 'rgba(255, 215, 0, 0.1)' : 'inherit',
                    }}
                  >
                    <TableCell>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 'bold',
                          color: getRankColor(index),
                        }}
                      >
                        {getRankIcon(index)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: index < 3 ? 'bold' : 'normal' }}>
                          {entry.userName}
                        </Typography>
                        {entry.username && (
                          <Typography variant="caption" color="text.secondary">
                            @{entry.username}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{entry.reportsCount}</TableCell>
                    <TableCell>{entry.videos}</TableCell>
                    <TableCell>{entry.stories}</TableCell>
                    <TableCell>{entry.views.toLocaleString()}</TableCell>
                    <TableCell>{entry.likes.toLocaleString()}</TableCell>
                    <TableCell>{entry.comments.toLocaleString()}</TableCell>
                    <TableCell>{entry.storyReach.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={entry.rating.toFixed(0)}
                        color={index < 3 ? 'primary' : 'default'}
                        icon={<TrendingUp />}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={entry.flarikiBalance}
                        color="success"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : leaderboard ? (
        <Alert severity="info">
          Нет данных за выбранный период
        </Alert>
      ) : null}
    </Box>
  );
}

