import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { adminApi } from '../../lib/api';

export default function BroadcastsManagement() {
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newBroadcast, setNewBroadcast] = useState({
    title: '',
    message: '',
    tagIds: [] as string[],
    taskIds: [] as string[],
  });

  const loadBroadcasts = async () => {
    try {
      const response = await adminApi.getBroadcasts();
      console.log('Broadcasts response:', response.data);
      setBroadcasts(response.data || []);
    } catch (error: any) {
      console.error('Failed to load broadcasts:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
    }
  };

  const loadTags = async () => {
    try {
      const response = await adminApi.getTags();
      setTags(response.data || []);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const response = await adminApi.getTasks({ status: 'ACTIVE' });
      // API возвращает { tasks: [...], pagination: {...} }
      console.log('Tasks response:', response.data);
      setTasks(response.data?.tasks || response.data || []);
    } catch (error: any) {
      console.error('Failed to load tasks:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
    }
  };

  useEffect(() => {
    loadBroadcasts();
    loadTags();
    loadTasks();
  }, []);

  const handleCreate = async () => {
    if (!newBroadcast.title || !newBroadcast.message.replace(/<[^>]*>/g, '').trim()) {
      alert('Заполните заголовок и сообщение');
      return;
    }
    
    console.log('Creating broadcast with data:', {
      title: newBroadcast.title,
      messageLength: newBroadcast.message.length,
      tagIds: newBroadcast.tagIds,
      taskIds: newBroadcast.taskIds,
    });
    
    try {
      const response = await adminApi.createBroadcast(newBroadcast);
      console.log('Broadcast created successfully:', response.data);
      setDialogOpen(false);
      setNewBroadcast({ title: '', message: '', tagIds: [], taskIds: [] });
      loadBroadcasts();
      alert('Рассылка успешно создана и отправлена!');
    } catch (error: any) {
      console.error('Failed to create broadcast:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config,
      });
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Ошибка при создании рассылки';
      const errorDetails = error.response?.data?.details ? `\nДетали: ${JSON.stringify(error.response.data.details)}` : '';
      alert(`Ошибка: ${errorMessage}${errorDetails}`);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setDialogOpen(true)}
        >
          Создать рассылку
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Заголовок</TableCell>
              <TableCell>Получателей</TableCell>
              <TableCell>Дата</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {broadcasts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  Рассылок пока нет
                </TableCell>
              </TableRow>
            ) : (
              broadcasts.map((broadcast) => (
                <TableRow key={broadcast.id}>
                  <TableCell>{broadcast.title}</TableCell>
                  <TableCell>{broadcast.sentCount || 0}</TableCell>
                  <TableCell>
                    {broadcast.createdAt ? new Date(broadcast.createdAt).toLocaleDateString('ru-RU') : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Создать рассылку</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Заголовок"
            value={newBroadcast.title}
            onChange={(e) => setNewBroadcast({ ...newBroadcast, title: e.target.value })}
            sx={{ mt: 2 }}
          />
          <Box sx={{ mt: 2 }}>
            <ReactQuill
              theme="snow"
              value={newBroadcast.message}
              onChange={(value) => setNewBroadcast({ ...newBroadcast, message: value })}
              placeholder="Текст сообщения"
              style={{ minHeight: '200px', marginBottom: '50px' }}
            />
          </Box>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Теги (опционально)</InputLabel>
            <Select
              multiple
              value={newBroadcast.tagIds}
              label="Теги (опционально)"
              onChange={(e) => setNewBroadcast({ ...newBroadcast, tagIds: e.target.value as string[] })}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((tagId) => {
                    const tag = tags.find((t) => t.id === tagId);
                    return tag ? <Chip key={tagId} label={tag.name} size="small" /> : null;
                  })}
                </Box>
              )}
            >
              {tags.map((tag) => (
                <MenuItem key={tag.id} value={tag.id}>
                  {tag.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Задания (опционально)</InputLabel>
            <Select
              multiple
              value={newBroadcast.taskIds}
              label="Задания (опционально)"
              onChange={(e) => setNewBroadcast({ ...newBroadcast, taskIds: e.target.value as string[] })}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((taskId) => {
                    const task = tasks.find((t) => t.id === taskId);
                    return task ? <Chip key={taskId} label={task.title} size="small" /> : null;
                  })}
                </Box>
              )}
            >
              {tasks.map((task) => (
                <MenuItem key={task.id} value={task.id}>
                  {task.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleCreate} variant="contained">
            Отправить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

