import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import {
  ShoppingCart,
  AccountBalanceWallet,
} from '@mui/icons-material';
import { shopApi } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { hapticFeedback } from '../lib/telegram';

interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  stock: number | null;
  category: string | null;
  isActive: boolean;
}

interface Purchase {
  id: string;
  quantity: number;
  totalPrice: number;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  createdAt: string;
  shopItem: ShopItem;
}

export default function ShopPage() {
  const { user, initAuth } = useAuthStore();
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadShopItems = async () => {
    try {
      setLoading(true);
      const response = await shopApi.getItems();
      setShopItems(response.data || []);
    } catch (error: any) {
      console.error('Failed to load shop items:', error);
      setError('Не удалось загрузить товары');
    } finally {
      setLoading(false);
    }
  };

  const loadPurchases = async () => {
    try {
      const response = await shopApi.getPurchases();
      setPurchases(response.data || []);
    } catch (error: any) {
      console.error('Failed to load purchases:', error);
    }
  };

  useEffect(() => {
    if (tabValue === 0) {
      loadShopItems();
    } else {
      loadPurchases();
    }
  }, [tabValue]);

  const handleOpenDialog = (item: ShopItem) => {
    setSelectedItem(item);
    setQuantity(1);
    setDialogOpen(true);
    setError(null);
    hapticFeedback('light');
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedItem(null);
    setQuantity(1);
    setError(null);
  };

  const handlePurchase = async () => {
    if (!selectedItem) return;
    if (!user) {
      setError('Необходимо войти в систему');
      return;
    }

    if (user.flarikiBalance < selectedItem.price * quantity) {
      setError(`Недостаточно флариков. Требуется: ${selectedItem.price * quantity}, доступно: ${user.flarikiBalance}`);
      hapticFeedback('light');
      return;
    }

    if (selectedItem.stock !== null && selectedItem.stock < quantity) {
      setError(`Недостаточно товара на складе. Доступно: ${selectedItem.stock}`);
      hapticFeedback('light');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      hapticFeedback('medium');

      await shopApi.purchase({
        shopItemId: selectedItem.id,
        quantity,
      });

      // Обновляем баланс пользователя
      await initAuth();

      // Обновляем список товаров и покупок
      await loadShopItems();
      await loadPurchases();

      hapticFeedback('heavy');
      
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert('Покупка успешно оформлена!');
      } else {
        alert('Покупка успешно оформлена!');
      }

      handleCloseDialog();
    } catch (error: any) {
      console.error('Failed to purchase:', error);
      setError(error.response?.data?.message || error.response?.data?.error || 'Не удалось оформить покупку');
      hapticFeedback('light');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'Ожидает обработки',
      PROCESSING: 'В обработке',
      SHIPPED: 'Отправлен',
      DELIVERED: 'Доставлен',
      CANCELLED: 'Отменен',
    };
    return labels[status] || status;
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

  const categories = Array.from(new Set(shopItems.map(item => item.category).filter(Boolean))) as string[];
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredItems = selectedCategory === 'all'
    ? shopItems
    : shopItems.filter(item => item.category === selectedCategory);

  return (
    <Container sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Магазин подарков
        </Typography>
        {user && (
          <Chip
            icon={<AccountBalanceWallet />}
            label={`${user.flarikiBalance} флариков`}
            color="primary"
            sx={{ fontSize: '1rem', py: 2.5 }}
          />
        )}
      </Box>

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="Товары" />
        <Tab label="Мои покупки" />
      </Tabs>

      {error && !dialogOpen && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {tabValue === 0 && (
        <>
          {categories.length > 0 && (
            <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label="Все"
                onClick={() => setSelectedCategory('all')}
                color={selectedCategory === 'all' ? 'primary' : 'default'}
                sx={{ cursor: 'pointer' }}
              />
              {categories.map((category) => (
                <Chip
                  key={category}
                  label={category}
                  onClick={() => setSelectedCategory(category)}
                  color={selectedCategory === category ? 'primary' : 'default'}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredItems.length === 0 ? (
            <Alert severity="info">
              Нет доступных товаров
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {filteredItems.map((item) => (
                <Grid xs={12} sm={6} md={4} key={item.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                      },
                    }}
                  >
                    {item.imageUrl && (
                      <CardMedia
                        component="img"
                        height="200"
                        image={item.imageUrl}
                        alt={item.name}
                        sx={{ objectFit: 'cover' }}
                      />
                    )}
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="h6" component="h3">
                          {item.name}
                        </Typography>
                        {item.category && (
                          <Chip label={item.category} size="small" />
                        )}
                      </Box>
                      {item.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {item.description}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" color="primary">
                          {item.price} флариков
                        </Typography>
                        {item.stock !== null && (
                          <Typography variant="body2" color="text.secondary">
                            Осталось: {item.stock}
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<ShoppingCart />}
                        onClick={() => handleOpenDialog(item)}
                        disabled={!item.isActive || (item.stock !== null && item.stock === 0)}
                      >
                        {!item.isActive
                          ? 'Недоступен'
                          : item.stock !== null && item.stock === 0
                          ? 'Нет в наличии'
                          : 'Купить'}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {tabValue === 1 && (
        <>
          {purchases.length === 0 ? (
            <Alert severity="info">
              У вас пока нет покупок
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {purchases.map((purchase) => (
                <Grid xs={12} key={purchase.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box>
                          <Typography variant="h6">{purchase.shopItem.name}</Typography>
                          {purchase.shopItem.imageUrl && (
                            <Box sx={{ mt: 1 }}>
                              <img
                                src={purchase.shopItem.imageUrl}
                                alt={purchase.shopItem.name}
                                style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8 }}
                              />
                            </Box>
                          )}
                        </Box>
                        <Chip
                          label={getStatusLabel(purchase.status)}
                          color={getStatusColor(purchase.status) as any}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Количество: {purchase.quantity}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Стоимость: {purchase.totalPrice} флариков
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(purchase.createdAt).toLocaleDateString('ru-RU')}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Оформление покупки</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {selectedItem && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedItem.name}
              </Typography>
              {selectedItem.description && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {selectedItem.description}
                </Typography>
              )}
              <Box sx={{ mt: 3 }}>
                <TextField
                  fullWidth
                  label="Количество"
                  type="number"
                  value={quantity}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    const maxQuantity = selectedItem.stock !== null ? selectedItem.stock : 10;
                    setQuantity(Math.min(Math.max(1, value), maxQuantity));
                  }}
                  inputProps={{ min: 1, max: selectedItem.stock !== null ? selectedItem.stock : 10 }}
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography>Цена за единицу:</Typography>
                  <Typography variant="h6">{selectedItem.price} флариков</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography>Итого:</Typography>
                  <Typography variant="h6" color="primary">
                    {selectedItem.price * quantity} флариков
                  </Typography>
                </Box>
                {user && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography>Ваш баланс:</Typography>
                    <Typography variant="body1" color={user.flarikiBalance >= selectedItem.price * quantity ? 'success.main' : 'error.main'}>
                      {user.flarikiBalance} флариков
                    </Typography>
                  </Box>
                )}
                {user && user.flarikiBalance < selectedItem.price * quantity && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Недостаточно флариков для покупки
                  </Alert>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          <Button
            onClick={handlePurchase}
            variant="contained"
            disabled={loading || !user || (user && user.flarikiBalance < (selectedItem?.price || 0) * quantity)}
            startIcon={<ShoppingCart />}
          >
            {loading ? 'Оформление...' : 'Купить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

