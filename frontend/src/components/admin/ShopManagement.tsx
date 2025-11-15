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
  IconButton,
  Switch,
  FormControlLabel,
  Alert,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { adminApi } from '../../lib/api';

interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  stock: number | null;
  category: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: {
    purchases: number;
  };
}

interface Purchase {
  id: string;
  quantity: number;
  totalPrice: number;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  createdAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
  };
  shopItem: ShopItem;
}

export default function ShopManagement() {
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    price: 0,
    stock: null as number | null,
    category: '',
    isActive: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [purchaseStatusFilter, setPurchaseStatusFilter] = useState<string>('');

  const loadShopItems = async () => {
    try {
      const response = await adminApi.getShopItems();
      setShopItems(response.data || []);
    } catch (error: any) {
      console.error('Failed to load shop items:', error);
      setError('Не удалось загрузить товары магазина');
    }
  };

  const loadPurchases = async () => {
    try {
      const params: any = {};
      if (purchaseStatusFilter) {
        params.status = purchaseStatusFilter;
      }
      const response = await adminApi.getPurchases(params);
      setPurchases(response.data || []);
    } catch (error: any) {
      console.error('Failed to load purchases:', error);
      setError('Не удалось загрузить покупки');
    }
  };

  useEffect(() => {
    if (tabValue === 0) {
      loadShopItems();
    } else {
      loadPurchases();
    }
  }, [tabValue, purchaseStatusFilter]);

  const handleOpenDialog = (item?: ShopItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description || '',
        imageUrl: item.imageUrl || '',
        price: item.price,
        stock: item.stock,
        category: item.category || '',
        isActive: item.isActive,
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        imageUrl: '',
        price: 0,
        stock: null,
        category: '',
        isActive: true,
      });
    }
    setDialogOpen(true);
    setError(null);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      imageUrl: '',
      price: 0,
      stock: null,
      category: '',
      isActive: true,
    });
    setError(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Название товара обязательно');
      return;
    }
    if (formData.price <= 0) {
      setError('Цена должна быть больше 0');
      return;
    }

    try {
      setError(null);
      if (editingItem) {
        await adminApi.updateShopItem(editingItem.id, {
          name: formData.name,
          description: formData.description || undefined,
          imageUrl: formData.imageUrl || undefined,
          price: formData.price,
          stock: formData.stock !== null && formData.stock >= 0 ? formData.stock : null,
          category: formData.category || undefined,
          isActive: formData.isActive,
        });
      } else {
        await adminApi.createShopItem({
          name: formData.name,
          description: formData.description || undefined,
          imageUrl: formData.imageUrl || undefined,
          price: formData.price,
          stock: formData.stock !== null && formData.stock >= 0 ? formData.stock : null,
          category: formData.category || undefined,
          isActive: formData.isActive,
        });
      }
      await loadShopItems();
      handleCloseDialog();
    } catch (error: any) {
      console.error('Failed to save shop item:', error);
      setError(error.response?.data?.error || 'Не удалось сохранить товар');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот товар?')) {
      return;
    }

    try {
      await adminApi.deleteShopItem(id);
      await loadShopItems();
    } catch (error: any) {
      console.error('Failed to delete shop item:', error);
      alert(error.response?.data?.message || error.response?.data?.error || 'Не удалось удалить товар');
    }
  };

  const handleUpdatePurchaseStatus = async (id: string, status: string, notes?: string) => {
    try {
      await adminApi.updatePurchaseStatus(id, { status: status as any, notes });
      await loadPurchases();
    } catch (error: any) {
      console.error('Failed to update purchase status:', error);
      alert(error.response?.data?.error || 'Не удалось обновить статус покупки');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'warning';
      case 'PROCESSING':
        return 'info';
      case 'SHIPPED':
        return 'primary';
      case 'DELIVERED':
        return 'success';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'Ожидает',
      PROCESSING: 'В обработке',
      SHIPPED: 'Отправлен',
      DELIVERED: 'Доставлен',
      CANCELLED: 'Отменен',
    };
    return labels[status] || status;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Управление магазином</Typography>
      </Box>

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="Товары магазина" />
        <Tab label="Покупки" />
      </Tabs>

      {error && !dialogOpen && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {tabValue === 0 && (
        <>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
            >
              Добавить товар
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Название</TableCell>
                  <TableCell>Категория</TableCell>
                  <TableCell>Цена (фларики)</TableCell>
                  <TableCell>Остаток</TableCell>
                  <TableCell>Изображение</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Покупок</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shopItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      Нет товаров
                    </TableCell>
                  </TableRow>
                ) : (
                  shopItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.category || '-'}</TableCell>
                      <TableCell>{item.price}</TableCell>
                      <TableCell>{item.stock === null ? '∞' : item.stock}</TableCell>
                      <TableCell>
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }}
                          />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.isActive ? 'Активен' : 'Неактивен'}
                          color={item.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{item._count?.purchases || 0}</TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(item)}
                          color="primary"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(item.id)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {tabValue === 1 && (
        <>
          <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              select
              label="Фильтр по статусу"
              value={purchaseStatusFilter}
              onChange={(e) => setPurchaseStatusFilter(e.target.value)}
              SelectProps={{
                native: true,
              }}
              sx={{ minWidth: 200 }}
            >
              <option value="">Все статусы</option>
              <option value="PENDING">Ожидает</option>
              <option value="PROCESSING">В обработке</option>
              <option value="SHIPPED">Отправлен</option>
              <option value="DELIVERED">Доставлен</option>
              <option value="CANCELLED">Отменен</option>
            </TextField>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Пользователь</TableCell>
                  <TableCell>Товар</TableCell>
                  <TableCell>Количество</TableCell>
                  <TableCell>Стоимость</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Дата</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {purchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      Нет покупок
                    </TableCell>
                  </TableRow>
                ) : (
                  purchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell>
                        {purchase.user.firstName || purchase.user.lastName
                          ? `${purchase.user.firstName || ''} ${purchase.user.lastName || ''}`.trim()
                          : purchase.user.username || 'Неизвестно'}
                      </TableCell>
                      <TableCell>{purchase.shopItem.name}</TableCell>
                      <TableCell>{purchase.quantity}</TableCell>
                      <TableCell>{purchase.totalPrice} флариков</TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(purchase.status)}
                          color={getStatusColor(purchase.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(purchase.createdAt).toLocaleDateString('ru-RU')}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {purchase.status === 'PENDING' && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleUpdatePurchaseStatus(purchase.id, 'PROCESSING')}
                            >
                              В обработку
                            </Button>
                          )}
                          {purchase.status === 'PROCESSING' && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleUpdatePurchaseStatus(purchase.id, 'SHIPPED')}
                            >
                              Отправить
                            </Button>
                          )}
                          {purchase.status === 'SHIPPED' && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              onClick={() => handleUpdatePurchaseStatus(purchase.id, 'DELIVERED')}
                            >
                              Доставлен
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingItem ? 'Редактировать товар' : 'Добавить товар в магазин'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Название товара"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Описание"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              label="URL изображения"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://..."
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Цена (фларики)"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                required
                inputProps={{ min: 1 }}
              />
              <TextField
                fullWidth
                label="Категория"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="косметика, аксессуары..."
              />
            </Box>
            <TextField
              fullWidth
              label="Остаток на складе"
              type="number"
              value={formData.stock === null ? '' : formData.stock}
              onChange={(e) => {
                const value = e.target.value;
                setFormData({ ...formData, stock: value === '' ? null : parseInt(value) || 0 });
              }}
              helperText="Оставьте пустым для неограниченного количества"
              inputProps={{ min: 0 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Активен"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          <Button onClick={handleSave} variant="contained">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

