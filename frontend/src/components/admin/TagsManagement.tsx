import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
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
  IconButton,
  Chip,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { adminApi } from '../../lib/api';

export default function TagsManagement() {
  const [tags, setTags] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTag, setNewTag] = useState({ name: '', color: '#3390ec', description: '' });

  const loadTags = async () => {
    try {
      const response = await adminApi.getTags();
      setTags(response.data || []);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  useEffect(() => {
    loadTags();
  }, []);

  const handleCreate = async () => {
    try {
      await adminApi.createTag(newTag);
      setDialogOpen(false);
      setNewTag({ name: '', color: '#3390ec', description: '' });
      loadTags();
    } catch (error) {
      console.error('Failed to create tag:', error);
      alert('Ошибка при создании тега');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить тег?')) return;
    try {
      await adminApi.deleteTag(id);
      loadTags();
    } catch (error) {
      console.error('Failed to delete tag:', error);
      alert('Ошибка при удалении тега');
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
          Создать тег
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Название</TableCell>
              <TableCell>Цвет</TableCell>
              <TableCell>Описание</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tags.map((tag) => (
              <TableRow key={tag.id}>
                <TableCell>
                  <Chip label={tag.name} sx={{ bgcolor: tag.color, color: 'white' }} />
                </TableCell>
                <TableCell>
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      bgcolor: tag.color,
                      borderRadius: 1,
                    }}
                  />
                </TableCell>
                <TableCell>{tag.description || '-'}</TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(tag.id)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Создать тег</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Название"
            value={newTag.name}
            onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Цвет (hex)"
            value={newTag.color}
            onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
            sx={{ mt: 2 }}
            type="color"
          />
          <TextField
            fullWidth
            label="Описание"
            value={newTag.description}
            onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
            sx={{ mt: 2 }}
            multiline
            rows={3}
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

