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
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Pagination,
} from '@mui/material';
import { adminApi } from '../../lib/api';

export default function ReportsModeration() {
  const [reports, setReports] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [moderateStatus, setModerateStatus] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState('');

  const loadReports = async () => {
    try {
      const response = await adminApi.getReports({
        status: statusFilter || undefined,
        page,
        limit: 20,
      });
      setReports(response.data.reports || []);
      setTotalPages(response.data.pagination?.pages || 1);
    } catch (error) {
      console.error('Failed to load reports:', error);
    }
  };

  useEffect(() => {
    loadReports();
  }, [page, statusFilter]);

  const handleModerate = async () => {
    if (!selectedReport || !moderateStatus) return;
    if (moderateStatus === 'REJECTED' && !rejectionReason.trim()) {
      alert('Укажите причину отклонения');
      return;
    }
    try {
      await adminApi.moderateReport(selectedReport.id, {
        status: moderateStatus as 'APPROVED' | 'REJECTED',
        rejectionReason: moderateStatus === 'REJECTED' ? rejectionReason : undefined,
      });
      setDialogOpen(false);
      setRejectionReason('');
      loadReports();
    } catch (error) {
      console.error('Failed to moderate report:', error);
      alert('Ошибка при модерации отчета');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'PENDING': return 'warning';
      case 'REJECTED': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Статус</InputLabel>
          <Select
            value={statusFilter}
            label="Статус"
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="">Все</MenuItem>
            <MenuItem value="PENDING">На рассмотрении</MenuItem>
            <MenuItem value="APPROVED">Проверено</MenuItem>
            <MenuItem value="REJECTED">Отказано</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Пользователь</TableCell>
              <TableCell>Задание</TableCell>
              <TableCell>Тип</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Дата</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id}>
                <TableCell>
                  {report.user?.firstName} {report.user?.lastName}
                </TableCell>
                <TableCell>{report.task?.title}</TableCell>
                <TableCell>{report.type === 'VIDEO_LINK' ? 'Видео' : 'Скриншот'}</TableCell>
                <TableCell>
                  <Chip
                    label={report.status}
                    color={getStatusColor(report.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(report.submittedAt).toLocaleDateString('ru-RU')}
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    onClick={() => {
                      setSelectedReport(report);
                      setModerateStatus(report.status);
                      setRejectionReason(report.rejectionReason || '');
                      setDialogOpen(true);
                    }}
                  >
                    Модерировать
                  </Button>
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Модерация отчета</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Задание: {selectedReport?.task?.title}
          </Typography>
          {selectedReport?.videoLinks?.map((link: any, idx: number) => (
            <Typography key={idx} variant="body2" sx={{ mb: 1 }}>
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                {link.url}
              </a>
            </Typography>
          ))}
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Статус</InputLabel>
            <Select
              value={moderateStatus}
              label="Статус"
              onChange={(e) => setModerateStatus(e.target.value)}
            >
              <MenuItem value="PENDING">На рассмотрении</MenuItem>
              <MenuItem value="APPROVED">Проверено</MenuItem>
              <MenuItem value="REJECTED">Отказано</MenuItem>
            </Select>
          </FormControl>
          {moderateStatus === 'REJECTED' && (
            <TextField
              fullWidth
              label="Причина отклонения"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              sx={{ mt: 2 }}
              multiline
              rows={3}
              required
            />
          )}
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

