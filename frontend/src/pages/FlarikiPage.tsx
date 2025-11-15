import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  AccountBalanceWallet,
  Add,
  Remove,
  CardGiftcard,
  Warning,
} from '@mui/icons-material';
import { useAuthStore } from '../store/auth';
import { flarikiApi } from '../lib/api';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  reason: string;
  createdAt: string;
  task?: {
    id: string;
    title: string;
  };
}

export default function FlarikiPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.status !== 'ACTIVE') {
      navigate('/');
      return;
    }
    
    const hasContactInfo = !!(user.phone || user.email);
    const hasAddressInfo = !!(user.cdekPvz || user.address);
    if (!hasContactInfo || !hasAddressInfo) {
      navigate('/');
      return;
    }

    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [balanceRes, transactionsRes] = await Promise.all([
        flarikiApi.getBalance(),
        flarikiApi.getTransactions({ limit: 50 }),
      ]);

      setBalance(balanceRes.data.balance || 0);
      setTransactions(transactionsRes.data.transactions || []);
    } catch (error) {
      console.error('Failed to load flariki data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'EARNED':
        return <Add color="success" />;
      case 'SPENT':
        return <Remove color="error" />;
      case 'BONUS':
        return <CardGiftcard color="primary" />;
      case 'PENALTY':
        return <Warning color="warning" />;
      default:
        return <AccountBalanceWallet />;
    }
  };

  const getTransactionColor = (amount: number): 'success' | 'error' | 'default' => {
    if (amount > 0) return 'success';
    if (amount < 0) return 'error';
    return 'default';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container sx={{ py: 3 }}>
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <AccountBalanceWallet sx={{ fontSize: 64, color: 'white', mb: 2 }} />
          <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
            Ваш баланс
          </Typography>
          <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold' }}>
            {balance} флариков
          </Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            История транзакций
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {transactions.length === 0 ? (
            <Alert severity="info">Нет транзакций</Alert>
          ) : (
            <List>
              {transactions.map((transaction, index) => (
                <ListItem
                  key={transaction.id}
                  divider={index < transactions.length - 1}
                >
                  <ListItemIcon>
                    {getTransactionIcon(transaction.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1">
                          {transaction.reason}
                        </Typography>
                        <Chip
                          label={`${transaction.amount > 0 ? '+' : ''}${transaction.amount}`}
                          color={getTransactionColor(transaction.amount)}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        {transaction.task && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Задание: {transaction.task.title}
                          </Typography>
                        )}
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {new Date(transaction.createdAt).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
