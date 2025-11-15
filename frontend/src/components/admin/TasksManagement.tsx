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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import { Add, Publish } from '@mui/icons-material';
import { adminApi } from '../../lib/api';

export default function TasksManagement() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    type: 'GENERAL',
    requirements: '',
    deadline: '',
    rewardFlariki: 0,
    assignedUserIds: [] as string[],
  });

  const loadTasks = async () => {
    try {
      const response = await adminApi.getTasks();
      // API возвращает { tasks: [...], pagination: {...} }
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

  const loadUsers = async () => {
    try {
      const response = await adminApi.getUsers({ status: 'ACTIVE' });
      // API возвращает { users: [...], pagination: {...} }
      console.log('Users response:', response.data);
      const usersData = response.data?.users || response.data || [];
      console.log('Setting users:', Array.isArray(usersData) ? usersData.length : 'not an array', usersData);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error: any) {
      console.error('Failed to load users:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      setUsers([]); // Устанавливаем пустой массив при ошибке
    }
  };

  useEffect(() => {
    loadTasks();
    loadUsers();
  }, []);

  const handleCreate = async () => {
    // Валидация для персональных заданий
    if (newTask.type === 'PERSONAL' && newTask.assignedUserIds.length === 0) {
      alert('Для персонального задания необходимо выбрать хотя бы одного пользователя');
      return;
    }

    // Валидация обязательных полей
    if (!newTask.title.trim()) {
      alert('Введите название задания');
      return;
    }

    if (!newTask.description.trim()) {
      alert('Введите описание задания');
      return;
    }

    try {
      // Подготавливаем данные для отправки
      const taskData: any = {
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        type: newTask.type,
      };
      
      if (newTask.requirements && newTask.requirements.trim()) {
        taskData.requirements = newTask.requirements.trim();
      }
      
      if (newTask.deadline) {
        // Преобразуем дату в ISO формат
        const deadlineDate = new Date(newTask.deadline);
        if (!isNaN(deadlineDate.getTime())) {
          taskData.deadline = deadlineDate.toISOString();
        }
      }
      
      if (newTask.rewardFlariki && newTask.rewardFlariki > 0) {
        taskData.rewardFlariki = newTask.rewardFlariki;
      }
      
      // Если персональное задание, добавляем назначенных пользователей
      if (newTask.type === 'PERSONAL') {
        if (newTask.assignedUserIds.length === 0) {
          alert('Для персонального задания необходимо выбрать хотя бы одного пользователя');
          return;
        }
        taskData.assignedUserIds = newTask.assignedUserIds;
        console.log('Creating PERSONAL task with assigned users:', newTask.assignedUserIds);
      }
      
      console.log('Creating task with data:', taskData);
      
      const response = await adminApi.createTask(taskData);
      console.log('Task created successfully:', response.data);
      
      setDialogOpen(false);
      setNewTask({
        title: '',
        description: '',
        type: 'GENERAL',
        requirements: '',
        deadline: '',
        rewardFlariki: 0,
        assignedUserIds: [],
      });
      loadTasks();
      alert('Задание успешно создано!');
    } catch (error: any) {
      console.error('Failed to create task:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config,
      });
      
      let errorMessage = 'Ошибка при создании задания';
      if (error.response?.data) {
        if (error.response.data.details) {
          // Zod validation errors
          const details = error.response.data.details;
          if (Array.isArray(details)) {
            errorMessage = 'Ошибки валидации:\n' + details.map((d: any) => `${d.path.join('.')}: ${d.message}`).join('\n');
          } else {
            errorMessage = error.response.data.error || error.response.data.message || errorMessage;
          }
        } else {
          errorMessage = error.response.data.error || error.response.data.message || errorMessage;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`Ошибка: ${errorMessage}`);
    }
  };

  const handlePublish = async (id: string) => {
    if (!confirm('Опубликовать задание в бота?')) return;
    try {
      await adminApi.publishTask(id);
      loadTasks();
      alert('Задание опубликовано!');
    } catch (error) {
      console.error('Failed to publish task:', error);
      alert('Ошибка при публикации задания');
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
          Создать задание
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Название</TableCell>
              <TableCell>Тип</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>{task.title}</TableCell>
                <TableCell>
                  <Chip
                    label={task.type === 'GENERAL' ? 'Общее' : 'Персональное'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={task.status}
                    color={task.status === 'ACTIVE' ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {task.status === 'DRAFT' && (
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handlePublish(task.id)}
                      title="Опубликовать"
                    >
                      <Publish fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Создать задание</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Название"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Описание"
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            sx={{ mt: 2 }}
            multiline
            rows={4}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Тип</InputLabel>
            <Select
              value={newTask.type}
              label="Тип"
              onChange={(e) => {
                const newType = e.target.value;
                setNewTask({ 
                  ...newTask, 
                  type: newType,
                  // Очищаем назначенных пользователей при смене типа на GENERAL
                  assignedUserIds: newType === 'GENERAL' ? [] : newTask.assignedUserIds,
                });
              }}
            >
              <MenuItem value="GENERAL">Общее</MenuItem>
              <MenuItem value="PERSONAL">Персональное</MenuItem>
            </Select>
          </FormControl>
          {newTask.type === 'PERSONAL' && (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Назначить пользователям</InputLabel>
              <Select
                multiple
                value={newTask.assignedUserIds}
                label="Назначить пользователям"
                onChange={(e) => setNewTask({ ...newTask, assignedUserIds: e.target.value as string[] })}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((userId) => {
                      const user = users.find((u) => u.id === userId);
                      return user ? (
                        <Chip 
                          key={userId} 
                          label={`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.id} 
                          size="small" 
                        />
                      ) : null;
                    })}
                  </Box>
                )}
              >
                {Array.isArray(users) && users.length > 0 ? (
                  users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.id}
                      {user.username && ` (@${user.username})`}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>Нет доступных пользователей</MenuItem>
                )}
              </Select>
            </FormControl>
          )}
          <TextField
            fullWidth
            label="Требования"
            value={newTask.requirements}
            onChange={(e) => setNewTask({ ...newTask, requirements: e.target.value })}
            sx={{ mt: 2 }}
            multiline
            rows={3}
          />
          <TextField
            fullWidth
            label="Дедлайн"
            type="date"
            value={newTask.deadline}
            onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
            sx={{ mt: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="Награда (фларики)"
            type="number"
            value={newTask.rewardFlariki}
            onChange={(e) => setNewTask({ ...newTask, rewardFlariki: parseInt(e.target.value) || 0 })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleCreate} variant="contained">
            Создать
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

