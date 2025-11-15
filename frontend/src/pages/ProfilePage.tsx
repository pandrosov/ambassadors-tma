import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Avatar,
  Chip,
  Grid,
  CircularProgress,
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  Sync,
  Phone,
  Email,
  LocationOn,
  Instagram,
  YouTube,
  MusicNote,
  Language,
} from '@mui/icons-material';
import { useAuthStore } from '../store/auth';
import { usersApi } from '../lib/api';
import { hapticFeedback, requestPhoneNumber } from '../lib/telegram';

export default function ProfilePage() {
  const { user, updateUser, initAuth } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    cdekPvz: '',
    address: '',
    instagramLink: '',
    youtubeLink: '',
    tiktokLink: '',
    vkLink: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        phone: user.phone || '',
        email: user.email || '',
        cdekPvz: user.cdekPvz || '',
        address: user.address || '',
        instagramLink: user.instagramLink || '',
        youtubeLink: user.youtubeLink || '',
        tiktokLink: user.tiktokLink || '',
        vkLink: user.vkLink || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateUser(formData);
      setEditing(false);
      hapticFeedback('medium');
      
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert('Профиль успешно обновлен!');
      }
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      let errorMessage = 'Не удалось обновить профиль';
      
      if (error.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      }
      
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(errorMessage);
      } else {
        alert(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSyncTelegram = async () => {
    try {
      hapticFeedback('light');
      console.log('Starting Telegram sync...');
      
      // Сначала запрашиваем номер телефона у пользователя
      let phoneNumber: string | null = null;
      try {
        const tgWebApp = window.Telegram?.WebApp as any;
        if (tgWebApp) {
          // Показываем подтверждение перед запросом номера
          const confirmMessage = 'Разрешить доступ к номеру телефона для заполнения профиля?';
          
          if (tgWebApp.showConfirm) {
            const confirmed = await new Promise<boolean>((resolve) => {
              tgWebApp.showConfirm(confirmMessage, (result: boolean) => {
                resolve(result);
              });
            });
            
            if (confirmed) {
              phoneNumber = await requestPhoneNumber();
              console.log('Phone number requested:', phoneNumber);
            } else {
              console.log('User declined phone number request');
            }
          } else {
            // Если showConfirm не доступен, просто запрашиваем номер
            phoneNumber = await requestPhoneNumber();
          }
        }
      } catch (phoneError: any) {
        console.warn('Failed to request phone number:', phoneError);
        // Продолжаем синхронизацию даже если номер не получен
      }
      
      // Синхронизируем данные из Telegram
      const response = await usersApi.syncTelegram();
      console.log('Sync Telegram response:', response.data);
      
      if (!response.data) {
        throw new Error('No data received from sync endpoint');
      }
      
      // Если получили номер телефона, обновляем его
      const updateData: any = { ...response.data };
      if (phoneNumber) {
        updateData.phone = phoneNumber;
        console.log('Updating phone number:', phoneNumber);
        
        // Обновляем номер телефона на сервере
        try {
          await usersApi.updateMe({ phone: phoneNumber });
          console.log('Phone number updated on server');
        } catch (updateError: any) {
          console.error('Failed to update phone number:', updateError);
          // Не прерываем процесс, если обновление номера не удалось
        }
      }
      
      // Обновляем store
      await updateUser(updateData);
      console.log('Store updated with:', {
        username: updateData.username,
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        phone: updateData.phone,
      });
      
      // Обновляем formData чтобы поля формы заполнились
      setFormData({
        phone: updateData.phone || '',
        email: updateData.email || '',
        cdekPvz: updateData.cdekPvz || '',
        address: updateData.address || '',
        instagramLink: updateData.instagramLink || '',
        youtubeLink: updateData.youtubeLink || '',
        tiktokLink: updateData.tiktokLink || '',
        vkLink: updateData.vkLink || '',
      });
      console.log('FormData updated');
      
      // Перезагружаем данные пользователя для обновления UI
      await initAuth();
      
      // Формируем сообщение об успехе
      let syncMessage = 'Данные из Telegram обновлены!';
      if (updateData.username || updateData.firstName) {
        syncMessage = `Данные обновлены!\nИмя: ${updateData.firstName || ''}\nФамилия: ${updateData.lastName || ''}\nUsername: ${updateData.username || ''}`;
        if (phoneNumber) {
          syncMessage += `\nТелефон: ${phoneNumber}`;
        }
      } else if (phoneNumber) {
        syncMessage = `Номер телефона обновлен: ${phoneNumber}`;
      }
      
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(syncMessage);
      } else {
        alert(syncMessage);
      }
    } catch (error: any) {
      console.error('Failed to sync Telegram:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Не удалось обновить данные';
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(`Ошибка синхронизации: ${errorMsg}`);
      } else {
        alert(`Ошибка синхронизации: ${errorMsg}`);
      }
    }
  };

  if (!user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const getInitials = () => {
    if (user.firstName) return user.firstName[0].toUpperCase();
    if (user.username) return user.username[0].toUpperCase();
    return 'U';
  };

  return (
    <Container sx={{ py: 3 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: 'primary.main',
                fontSize: 32,
                mr: 3,
              }}
            >
              {getInitials()}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5" gutterBottom>
                {user.firstName || user.username || 'Пользователь'}
              </Typography>
              {user.username && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  @{user.username}
                </Typography>
              )}
              <Chip
                label={user.role === 'AMBASSADOR' ? 'Амбассадор' : user.role}
                size="small"
                color="primary"
                sx={{ mt: 1 }}
              />
            </Box>
            <Button
              variant="outlined"
              startIcon={<Sync />}
              onClick={handleSyncTelegram}
              size="small"
            >
              Синхронизировать
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Контактные данные</Typography>
            {!editing ? (
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => {
                  setEditing(true);
                  hapticFeedback('light');
                }}
              >
                Редактировать
              </Button>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Cancel />}
                  onClick={() => {
                    setEditing(false);
                    hapticFeedback('light');
                  }}
                  disabled={saving}
                >
                  Отмена
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </Box>
            )}
          </Box>

          <Grid container spacing={3}>
            <Grid xs={12} sm={6}>
              <TextField
                fullWidth
                label="Телефон"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!editing}
                InputProps={{
                  startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid2>
            <Grid2 xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!editing}
                InputProps={{
                  startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid2>
            <Grid2 xs={12}>
              <TextField
                fullWidth
                label="Ближайший ПВЗ СДЭК"
                value={formData.cdekPvz}
                onChange={(e) => setFormData({ ...formData, cdekPvz: e.target.value })}
                disabled={!editing}
                InputProps={{
                  startAdornment: <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid2>
            <Grid2 xs={12}>
              <TextField
                fullWidth
                label="Адрес проживания"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={!editing}
                InputProps={{
                  startAdornment: <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Социальные сети
          </Typography>
          <Grid2 container spacing={3}>
            <Grid2 xs={12}>
              <TextField
                fullWidth
                label="Instagram"
                type="url"
                value={formData.instagramLink}
                onChange={(e) => setFormData({ ...formData, instagramLink: e.target.value })}
                disabled={!editing}
                placeholder="https://instagram.com/..."
                InputProps={{
                  startAdornment: <Instagram sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid2>
            <Grid2 xs={12}>
              <TextField
                fullWidth
                label="YouTube"
                type="url"
                value={formData.youtubeLink}
                onChange={(e) => setFormData({ ...formData, youtubeLink: e.target.value })}
                disabled={!editing}
                placeholder="https://youtube.com/..."
                InputProps={{
                  startAdornment: <YouTube sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid2>
            <Grid2 xs={12}>
              <TextField
                fullWidth
                label="TikTok"
                type="url"
                value={formData.tiktokLink}
                onChange={(e) => setFormData({ ...formData, tiktokLink: e.target.value })}
                disabled={!editing}
                placeholder="https://tiktok.com/..."
                InputProps={{
                  startAdornment: <MusicNote sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid2>
            <Grid2 xs={12}>
              <TextField
                fullWidth
                label="VK"
                type="url"
                value={formData.vkLink}
                onChange={(e) => setFormData({ ...formData, vkLink: e.target.value })}
                disabled={!editing}
                placeholder="https://vk.com/..."
                InputProps={{
                  startAdornment: <Language sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
}
