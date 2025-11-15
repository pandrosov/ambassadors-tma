import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Add,
  Delete,
  Send,
  CloudUpload,
} from '@mui/icons-material';
import { reportsApi, productsApi } from '../lib/api';
import { showMainButton, hideMainButton, hapticFeedback } from '../lib/telegram';

interface VideoLink {
  url: string;
  platform?: string;
  views?: number;
  likes?: number;
  comments?: number;
}

interface Story {
  storyUrl: string;
  screenshotFile?: string;
  screenshotUrl?: string;
  reach: number;
}

export default function ReportsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [type, setType] = useState<'VIDEO_LINK' | 'STORY_SCREENSHOT'>('VIDEO_LINK');
  const [videoLinks, setVideoLinks] = useState<VideoLink[]>([{ url: '' }]);
  // Несколько сторис
  const [stories, setStories] = useState<Story[]>([]);
  // Legacy поля для обратной совместимости
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotUrl] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [storyUrl, setStoryUrl] = useState('');
  const [storyReach, setStoryReach] = useState<number | ''>('');
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [loading, setLoading] = useState(false);
  // Товары
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  useEffect(() => {
    // Загружаем товары при монтировании
    const loadProducts = async () => {
      try {
        const response = await productsApi.getProducts();
        setProducts(response.data || []);
      } catch (error) {
        console.error('Failed to load products:', error);
      }
    };
    loadProducts();
  }, []);

  useEffect(() => {
    if (id) {
      showMainButton('Отправить отчет', handleSubmit);
    }
    return () => {
      hideMainButton();
    };
  }, [id, type, videoLinks, stories, screenshotUrl, screenshotFile, storyUrl, storyReach, selectedProductIds]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    // Проверяем размер файла (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Размер файла не должен превышать 10MB');
      return;
    }

    setScreenshotFile(file);
    
    // Создаем превью
    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const addVideoLink = () => {
    setVideoLinks([...videoLinks, { url: '' }]);
    hapticFeedback('light');
  };

  const removeVideoLink = (index: number) => {
    if (videoLinks.length > 1) {
      setVideoLinks(videoLinks.filter((_, i) => i !== index));
      hapticFeedback('light');
    }
  };

  const updateVideoLink = (index: number, field: 'url' | 'platform' | 'views' | 'likes' | 'comments', value: string | number) => {
    const updated = [...videoLinks];
    updated[index] = { ...updated[index], [field]: value };
    setVideoLinks(updated);
  };

  const addStory = () => {
    setStories([...stories, { storyUrl: '', reach: 0 }]);
    hapticFeedback('light');
  };

  const removeStory = (index: number) => {
    setStories(stories.filter((_, i) => i !== index));
    hapticFeedback('light');
  };

  const updateStory = (index: number, field: keyof Story, value: string | number) => {
    const updated = [...stories];
    updated[index] = { ...updated[index], [field]: value };
    setStories(updated);
  };

  const handleStoryFileChange = async (index: number, file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Размер файла не должен превышать 10MB');
      return;
    }

    try {
      setUploadingScreenshot(true);
      const uploadResult = await reportsApi.uploadScreenshot(file);
      const updated = [...stories];
      updated[index] = { ...updated[index], screenshotFile: uploadResult.filename };
      setStories(updated);
    } catch (error: any) {
      console.error('Failed to upload screenshot:', error);
      alert('Не удалось загрузить скриншот');
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const handleSubmit = async () => {
    if (!id) {
      alert('Ошибка: ID задания не найден');
      return;
    }

    if (type === 'VIDEO_LINK') {
      const validLinks = videoLinks.filter(link => link.url.trim());
      if (validLinks.length === 0) {
        alert('Пожалуйста, добавьте хотя бы одну ссылку на видео');
        hapticFeedback('light');
        return;
      }
    }

    if (type === 'STORY_SCREENSHOT') {
      // Проверяем новые сторис или legacy данные
      const hasStories = stories.length > 0 && stories.every(s => s.storyUrl && s.reach > 0);
      const hasLegacyStory = !!(storyUrl.trim() && storyReach && storyReach > 0);
      const hasLegacyScreenshot = !!(screenshotUrl.trim() || screenshotFile) && storyReach && storyReach > 0;
      
      if (!hasStories && !hasLegacyStory && !hasLegacyScreenshot) {
        if (stories.length === 0) {
          alert('Пожалуйста, добавьте хотя бы один сторис или заполните поля ниже');
        } else {
          alert('Пожалуйста, заполните все поля для сторис (ссылка и количество просмотров)');
        }
        hapticFeedback('light');
        return;
      }
    }

    try {
      setLoading(true);
      hapticFeedback('medium');

      const validVideoLinks = type === 'VIDEO_LINK' 
        ? videoLinks.filter(link => link.url.trim()).map(link => ({
            url: link.url.trim(),
            platform: link.platform || undefined,
            views: link.views || undefined,
            likes: link.likes || undefined,
            comments: link.comments || undefined,
          }))
        : undefined;

      // Обрабатываем сторис
      let validStories: Story[] | undefined;
      if (type === 'STORY_SCREENSHOT') {
        if (stories.length > 0) {
          // Новый формат - несколько сторис
          validStories = stories.filter(s => s.storyUrl && s.reach > 0);
        } else if (storyUrl && storyReach) {
          // Legacy формат - один сторис из старых полей
          let uploadedFilename: string | undefined;
          if (screenshotFile) {
            try {
              const uploadResult = await reportsApi.uploadScreenshot(screenshotFile);
              uploadedFilename = uploadResult.filename;
            } catch (uploadError: any) {
              console.error('Failed to upload screenshot:', uploadError);
              alert('Не удалось загрузить скриншот: ' + (uploadError.response?.data?.error || uploadError.message));
              setLoading(false);
              return;
            }
          }
          validStories = [{
            storyUrl: storyUrl.trim(),
            screenshotFile: uploadedFilename,
            screenshotUrl: screenshotUrl.trim() || undefined,
            reach: Number(storyReach),
          }];
        }
      }

      await reportsApi.createReport({
        taskId: id,
        type,
        videoLinks: validVideoLinks,
        stories: validStories,
        // Legacy поля для обратной совместимости
        screenshotUrl: type === 'STORY_SCREENSHOT' && screenshotUrl.trim() ? screenshotUrl : undefined,
        screenshotFile: undefined, // Используем stories вместо этого
        storyUrl: type === 'STORY_SCREENSHOT' && storyUrl.trim() ? storyUrl : undefined,
        storyReach: type === 'STORY_SCREENSHOT' && storyReach ? Number(storyReach) : undefined,
        productIds: selectedProductIds.length > 0 ? selectedProductIds : undefined,
      });

      hapticFeedback('heavy');
      
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert('Отчет успешно отправлен!');
      } else {
        alert('Отчет успешно отправлен!');
      }
      
      navigate(`/tasks/${id}`);
    } catch (error: any) {
      console.error('Failed to submit report:', error);
      const errorMessage = error.response?.data?.error || 'Не удалось отправить отчет';
      
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(errorMessage);
      } else {
        alert(errorMessage);
      }
      hapticFeedback('light');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Отправить отчет
      </Typography>

      <Card>
        <CardContent>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Тип отчета</InputLabel>
            <Select
              value={type}
              label="Тип отчета"
              onChange={(e) => setType(e.target.value as 'VIDEO_LINK' | 'STORY_SCREENSHOT')}
            >
              <MenuItem value="VIDEO_LINK">Видео</MenuItem>
              <MenuItem value="STORY_SCREENSHOT">Скриншот сторис</MenuItem>
            </Select>
          </FormControl>

          {type === 'VIDEO_LINK' ? (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Ссылки на видео</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Add />}
                  onClick={addVideoLink}
                >
                  Добавить ссылку
                </Button>
              </Box>

              {videoLinks.map((link, index) => (
                <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <TextField
                          fullWidth
                          label="URL видео"
                          value={link.url}
                          onChange={(e) => updateVideoLink(index, 'url', e.target.value)}
                          placeholder="https://..."
                          sx={{ mb: 2 }}
                        />
                        <FormControl fullWidth>
                          <InputLabel>Платформа</InputLabel>
                          <Select
                            value={link.platform || ''}
                            label="Платформа"
                            onChange={(e) => updateVideoLink(index, 'platform', e.target.value)}
                          >
                            <MenuItem value="">Не указано</MenuItem>
                            <MenuItem value="youtube">YouTube</MenuItem>
                            <MenuItem value="instagram">Instagram</MenuItem>
                            <MenuItem value="tiktok">TikTok</MenuItem>
                            <MenuItem value="vk">VK</MenuItem>
                          </Select>
                        </FormControl>
                        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                          <TextField
                            fullWidth
                            label="Просмотры"
                            type="number"
                            value={link.views || ''}
                            onChange={(e) => updateVideoLink(index, 'views', parseInt(e.target.value) || 0)}
                            inputProps={{ min: 0 }}
                          />
                          <TextField
                            fullWidth
                            label="Лайки"
                            type="number"
                            value={link.likes || ''}
                            onChange={(e) => updateVideoLink(index, 'likes', parseInt(e.target.value) || 0)}
                            inputProps={{ min: 0 }}
                          />
                          <TextField
                            fullWidth
                            label="Комментарии"
                            type="number"
                            value={link.comments || ''}
                            onChange={(e) => updateVideoLink(index, 'comments', parseInt(e.target.value) || 0)}
                            inputProps={{ min: 0 }}
                          />
                        </Box>
                      </Box>
                      {videoLinks.length > 1 && (
                        <IconButton
                          color="error"
                          onClick={() => removeVideoLink(index)}
                        >
                          <Delete />
                        </IconButton>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Instagram сторис</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Add />}
                  onClick={addStory}
                >
                  Добавить сторис
                </Button>
              </Box>

              {/* Несколько сторис */}
              {stories.length > 0 && stories.map((story, index) => (
                <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <TextField
                          fullWidth
                          label="Ссылка на сторис Instagram"
                          value={story.storyUrl}
                          onChange={(e) => updateStory(index, 'storyUrl', e.target.value)}
                          placeholder="https://instagram.com/stories/..."
                          sx={{ mb: 2 }}
                          required
                        />
                        <TextField
                          fullWidth
                          label="Количество просмотров"
                          type="number"
                          value={story.reach || ''}
                          onChange={(e) => updateStory(index, 'reach', parseInt(e.target.value) || 0)}
                          placeholder="1000"
                          required
                          inputProps={{ min: 1 }}
                          sx={{ mb: 2 }}
                        />
                        <Box sx={{ mb: 2 }}>
                          <input
                            accept="image/*"
                            style={{ display: 'none' }}
                            id={`story-screenshot-${index}`}
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleStoryFileChange(index, file);
                            }}
                            disabled={uploadingScreenshot}
                          />
                          <label htmlFor={`story-screenshot-${index}`}>
                            <Button
                              variant="outlined"
                              component="span"
                              size="small"
                              startIcon={<CloudUpload />}
                              disabled={uploadingScreenshot}
                            >
                              {uploadingScreenshot ? 'Загрузка...' : story.screenshotFile ? 'Скриншот загружен' : 'Загрузить скриншот'}
                            </Button>
                          </label>
                        </Box>
                      </Box>
                      {stories.length > 1 && (
                        <IconButton
                          color="error"
                          onClick={() => removeStory(index)}
                        >
                          <Delete />
                        </IconButton>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}

              {/* Legacy поля для обратной совместимости (если нет новых сторис) */}
              {stories.length === 0 && (
                <>
                  <TextField
                    fullWidth
                    label="Ссылка на сторис Instagram"
                    value={storyUrl}
                    onChange={(e) => setStoryUrl(e.target.value)}
                    placeholder="https://instagram.com/stories/..."
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Количество просмотров сторис"
                    type="number"
                    value={storyReach}
                    onChange={(e) => setStoryReach(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="1000"
                    required
                    inputProps={{ min: 1 }}
                    helperText="Обязательное поле для Instagram сторис"
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ mb: 2 }}>
                    <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="screenshot-upload"
                      type="file"
                      onChange={handleFileChange}
                      disabled={uploadingScreenshot}
                    />
                    <label htmlFor="screenshot-upload">
                      <Button
                        variant="outlined"
                        component="span"
                        fullWidth
                        startIcon={<CloudUpload />}
                        disabled={uploadingScreenshot}
                      >
                        {uploadingScreenshot ? 'Загрузка...' : screenshotFile ? 'Файл загружен' : 'Загрузить скриншот'}
                      </Button>
                    </label>
                    {screenshotPreview && (
                      <Box sx={{ mt: 2 }}>
                        <img
                          src={screenshotPreview}
                          alt="Превью скриншота"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '300px',
                            borderRadius: '8px',
                            border: '1px solid #ddd',
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                </>
              )}
            </Box>
          )}

          {/* Выбор товаров */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Товары (необязательно)
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Выберите товары</InputLabel>
              <Select
                multiple
                value={selectedProductIds}
                onChange={(e) => setSelectedProductIds(e.target.value as string[])}
                label="Выберите товары"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((productId) => {
                      const product = products.find(p => p.id === productId);
                      return product ? (
                        <Chip key={productId} label={product.name} size="small" />
                      ) : null;
                    })}
                  </Box>
                )}
              >
                {products.filter(p => p.isActive).map((product) => (
                  <MenuItem key={product.id} value={product.id}>
                    {product.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Выберите товары, которые использовались в отчете
            </Typography>
          </Box>

          <Button
            variant="contained"
            fullWidth
            size="large"
            startIcon={<Send />}
            onClick={handleSubmit}
            disabled={loading}
            sx={{ mt: 3 }}
          >
            {loading ? 'Отправка...' : 'Отправить отчет'}
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
}
