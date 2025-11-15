import { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Chip,
} from '@mui/material';
import { adminApi } from '../../lib/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadLogs = async () => {
    try {
      const response = await adminApi.getAuditLogs({
        action: actionFilter || undefined,
        entityType: entityFilter || undefined,
        page,
        limit: 50,
      });
      setLogs(response.data.logs || []);
      setTotalPages(response.data.pagination?.pages || 1);
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter, entityFilter]);

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Действие</InputLabel>
          <Select
            value={actionFilter}
            label="Действие"
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="">Все</MenuItem>
            <MenuItem value="TASK_CREATED">Создание задания</MenuItem>
            <MenuItem value="TASK_PUBLISHED">Публикация задания</MenuItem>
            <MenuItem value="REPORT_MODERATED">Модерация отчета</MenuItem>
            <MenuItem value="USER_MODERATED">Модерация пользователя</MenuItem>
            <MenuItem value="BROADCAST_CREATED">Создание рассылки</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Тип сущности</InputLabel>
          <Select
            value={entityFilter}
            label="Тип сущности"
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="">Все</MenuItem>
            <MenuItem value="Task">Задание</MenuItem>
            <MenuItem value="Report">Отчет</MenuItem>
            <MenuItem value="User">Пользователь</MenuItem>
            <MenuItem value="Broadcast">Рассылка</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Дата</TableCell>
              <TableCell>Действие</TableCell>
              <TableCell>Тип</TableCell>
              <TableCell>Пользователь</TableCell>
              <TableCell>Детали</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  {new Date(log.createdAt).toLocaleString('ru-RU')}
                </TableCell>
                <TableCell>
                  <Chip label={log.action} size="small" />
                </TableCell>
                <TableCell>{log.entityType}</TableCell>
                <TableCell>
                  {log.user?.firstName} {log.user?.lastName}
                </TableCell>
                <TableCell>
                  {log.details ? JSON.stringify(log.details).substring(0, 50) + '...' : '-'}
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
    </Box>
  );
}

