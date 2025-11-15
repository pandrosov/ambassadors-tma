import { createTheme } from '@mui/material/styles';

// Получаем цвета из Telegram WebApp или используем значения по умолчанию
const getTelegramColors = () => {
  try {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp as any;
      return {
        bgColor: tg.themeParams?.bg_color || '#ffffff',
        textColor: tg.themeParams?.text_color || '#000000',
        hintColor: tg.themeParams?.hint_color || '#999999',
        linkColor: tg.themeParams?.link_color || '#3390ec',
        buttonColor: tg.themeParams?.button_color || '#3390ec',
        buttonTextColor: tg.themeParams?.button_text_color || '#ffffff',
        secondaryBgColor: tg.themeParams?.secondary_bg_color || '#f1f1f1',
      };
    }
  } catch (error) {
    console.warn('Failed to get Telegram colors:', error);
  }
  return {
    bgColor: '#ffffff',
    textColor: '#000000',
    hintColor: '#999999',
    linkColor: '#3390ec',
    buttonColor: '#3390ec',
    buttonTextColor: '#ffffff',
    secondaryBgColor: '#f1f1f1',
  };
};

const tgColors = getTelegramColors();

// Функция для конвертации hex в RGB
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

const rgb = hexToRgb(tgColors.bgColor);

export const userTheme = createTheme({
  palette: {
    mode: rgb && rgb.r + rgb.g + rgb.b > 384 ? 'light' : 'dark',
    primary: {
      main: tgColors.buttonColor,
      contrastText: tgColors.buttonTextColor,
    },
    secondary: {
      main: tgColors.linkColor,
    },
    background: {
      default: tgColors.bgColor,
      paper: tgColors.secondaryBgColor,
    },
    text: {
      primary: tgColors.textColor,
      secondary: tgColors.hintColor,
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

