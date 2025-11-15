import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  IconButton,
  Pagination,
} from '@mui/material';
import { Edit } from '@mui/icons-material';
import { adminApi } from '../../lib/api';

export default function UsersModeration() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [moderateStatus, setModerateStatus] = useState<string>('');

  const loadUsers = async () => {
    try {
      const response = await adminApi.getUsers({
        search: search || undefined,
        status: statusFilter || undefined,
        page,
        limit: 20,
      });
      setUsers(response.data.users || []);
      setTotalPages(response.data.pagination?.pages || 1);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, statusFilter]);

  const handleSearch = () => {
    setPage(1);
    loadUsers();
  };

  const handleModerate = async () => {
    if (!selectedUser || !moderateStatus) return;
    try {
      await adminApi.moderateUser(selectedUser.id, { status: moderateStatus as any });
      setDialogOpen(false);
      loadUsers();
    } catch (error) {
      console.error('Failed to moderate user:', error);
      alert('Ошибка при модерации пользователя');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'PENDING': return 'warning';
      case 'SUSPENDED': return 'error';
      case 'INACTIVE': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          label="Поиск"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          size="small"
          sx={{ flexGrow: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Статус</InputLabel>
          <Select
            value={statusFilter}
            label="Статус"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">Все</MenuItem>
            <MenuItem value="PENDING">Ожидает</MenuItem>
            <MenuItem value="ACTIVE">Активен</MenuItem>
            <MenuItem value="INACTIVE">Неактивен</MenuItem>
            <MenuItem value="SUSPENDED">Заблокирован</MenuItem>
          </Select>
        </FormControl>
        <Button variant="contained" onClick={handleSearch}>
          Поиск
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Имя</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.firstName} {user.lastName}</TableCell>
                <TableCell>@{user.username || '-'}</TableCell>
                <TableCell>{user.email || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={user.status}
                    color={getStatusColor(user.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedUser(user);
                      setModerateStatus(user.status);
                      setDialogOpen(true);
                    }}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, value) => setPage(value)}
        />
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Модерация пользователя</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {selectedUser?.firstName} {selectedUser?.lastName}
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Статус</InputLabel>
            <Select
              value={moderateStatus}
              label="Статус"
              onChange={(e) => setModerateStatus(e.target.value)}
            >
              <MenuItem value="PENDING">Ожидает</MenuItem>
              <MenuItem value="ACTIVE">Активен</MenuItem>
              <MenuItem value="INACTIVE">Неактивен</MenuItem>
              <MenuItem value="SUSPENDED">Заблокирован</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleModerate} variant="contained">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

