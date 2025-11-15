import { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Container,
  Typography,
  Paper,
  AppBar,
  Toolbar,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import UsersModeration from '../components/admin/UsersModeration';
import TagsManagement from '../components/admin/TagsManagement';
import BroadcastsManagement from '../components/admin/BroadcastsManagement';
import ReportsModeration from '../components/admin/ReportsModeration';
import TasksManagement from '../components/admin/TasksManagement';
import AuditLogs from '../components/admin/AuditLogs';
import ProductsManagement from '../components/admin/ProductsManagement';
import ShopManagement from '../components/admin/ShopManagement';
import Statistics from '../components/admin/Statistics';
import Leaderboard from '../components/admin/Leaderboard';

// Создаем тему Material-UI
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3390ec',
    },
    secondary: {
      main: '#f50057',
    },
  },
});

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="static" elevation={0}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              ⚙️ Админ-панель
            </Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
          <Paper elevation={2}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                aria-label="admin tabs"
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab label="👥 Пользователи" />
                <Tab label="📋 Задания" />
                <Tab label="📊 Отчеты" />
                <Tab label="🏷️ Теги" />
                <Tab label="📢 Рассылки" />
                <Tab label="📦 Товары" />
                <Tab label="🛒 Магазин" />
                <Tab label="📈 Статистика" />
                <Tab label="🏆 Рейтинг" />
                <Tab label="📝 Логи" />
              </Tabs>
            </Box>

            <TabPanel value={activeTab} index={0}>
              <UsersModeration />
            </TabPanel>
            <TabPanel value={activeTab} index={1}>
              <TasksManagement />
            </TabPanel>
            <TabPanel value={activeTab} index={2}>
              <ReportsModeration />
            </TabPanel>
            <TabPanel value={activeTab} index={3}>
              <TagsManagement />
            </TabPanel>
            <TabPanel value={activeTab} index={4}>
              <BroadcastsManagement />
            </TabPanel>
            <TabPanel value={activeTab} index={5}>
              <ProductsManagement />
            </TabPanel>
            <TabPanel value={activeTab} index={6}>
              <ShopManagement />
            </TabPanel>
            <TabPanel value={activeTab} index={7}>
              <Statistics />
            </TabPanel>
            <TabPanel value={activeTab} index={8}>
              <Leaderboard />
            </TabPanel>
            <TabPanel value={activeTab} index={9}>
              <AuditLogs />
            </TabPanel>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
