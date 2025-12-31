import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  LinearProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import StarIcon from '@mui/icons-material/Star';
import VerifiedIcon from '@mui/icons-material/Verified';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import SettingsIcon from '@mui/icons-material/Settings';
import { api } from '../utils/api';

const VIP_TIERS = {
  bronze: { color: 'linear-gradient(135deg, #92400e 0%, #78350f 100%)', min: 0, discount: 0 },
  silver: { color: 'linear-gradient(135deg, #9ca3af 0%, #4b5563 100%)', min: 100, discount: 5 },
  gold: { color: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', min: 500, discount: 10 },
  platinum: { color: 'linear-gradient(135deg, #67e8f9 0%, #3b82f6 100%)', min: 2000, discount: 15 },
  diamond: { color: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', min: 10000, discount: 20 },
};

const formatDate = (dateStr) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
};

export default function Wallet() {
  const [searchParams] = useSearchParams();
  const [wallet, setWallet] = useState(null);
  const [entitlements, setEntitlements] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendAmount, setSendAmount] = useState('');
  const [sendRecipient, setSendRecipient] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [buyingCredits, setBuyingCredits] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchData();

    // Handle subscription redirect
    const subStatus = searchParams.get('subscription');
    if (subStatus === 'success') {
      setSnackbar({ open: true, message: 'Subscription activated! Enjoy unlimited access.', severity: 'success' });
    } else if (subStatus === 'canceled') {
      setSnackbar({ open: true, message: 'Subscription canceled.', severity: 'info' });
    }

    // Handle credit purchase redirect
    const creditStatus = searchParams.get('credits');
    if (creditStatus === 'success') {
      setSnackbar({ open: true, message: '100 credits added to your account!', severity: 'success' });
    } else if (creditStatus === 'canceled') {
      setSnackbar({ open: true, message: 'Credit purchase canceled.', severity: 'info' });
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      const [walletData, entitlementsData, historyData] = await Promise.all([
        api.wallet.balance().catch(() => null),
        fetch('/api/entitlements', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(r => r.json()).then(d => d.data).catch(() => null),
        api.wallet.transactions(20).catch(() => ({ transactions: [] })),
      ]);

      setWallet(walletData);
      setEntitlements(entitlementsData);
      setTransactions(historyData.transactions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.data?.url) {
        window.location.href = data.data.url;
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to start subscription. Please try again.', severity: 'error' });
    } finally {
      setSubscribing(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.data?.url) {
        window.location.href = data.data.url;
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to open billing portal.', severity: 'error' });
    }
  };

  const handleBuyCredits = async () => {
    setBuyingCredits(true);
    try {
      const response = await fetch('/api/billing/credits/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.data?.url) {
        window.location.href = data.data.url;
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to start purchase. Please try again.', severity: 'error' });
    } finally {
      setBuyingCredits(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    try {
      const data = await api.wallet.transfer({
        recipient_username: sendRecipient,
        amount: parseFloat(sendAmount),
        message: sendMessage
      });
      if (data.success) {
        setShowSendModal(false);
        setSendAmount('');
        setSendRecipient('');
        setSendMessage('');
        fetchData();
        setSnackbar({ open: true, message: 'Credits sent successfully!', severity: 'success' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to send credits.', severity: 'error' });
    }
  };

  const tier = wallet?.ranking?.vip_tier || 'bronze';
  const tierConfig = VIP_TIERS[tier] || VIP_TIERS.bronze;
  const isUnlimited = entitlements?.unlimited;
  const isInTrial = entitlements?.reason === 'trial';
  const isSubscribed = entitlements?.reason === 'subscribed';

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 4 }}>
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Toolbar>
          <IconButton edge="start" component={RouterLink} to="/dashboard" sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>Wallet</Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 3 }}>
        {/* Unlimited Access Banner */}
        {isUnlimited && (
          <Paper
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 3,
              background: isSubscribed
                ? 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)'
                : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <AllInclusiveIcon sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  {isSubscribed ? 'Unlimited Subscriber' : 'Free Trial Active'}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {isSubscribed
                    ? 'All features unlocked - no credit limits!'
                    : `${entitlements?.daysLeftInTrial} days remaining in your free trial`
                  }
                </Typography>
              </Box>
            </Box>

            {isInTrial && (
              <>
                <LinearProgress
                  variant="determinate"
                  value={((90 - entitlements?.daysLeftInTrial) / 90) * 100}
                  sx={{
                    mb: 2,
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    '& .MuiLinearProgress-bar': { bgcolor: 'white' }
                  }}
                />
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  sx={{
                    bgcolor: 'white',
                    color: '#059669',
                    fontWeight: 700,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                  }}
                >
                  {subscribing ? <CircularProgress size={24} /> : 'Subscribe for $1/month - Stay Unlimited'}
                </Button>
              </>
            )}

            {isSubscribed && (
              <Button
                variant="outlined"
                fullWidth
                onClick={handleManageSubscription}
                sx={{
                  borderColor: 'rgba(255,255,255,0.5)',
                  color: 'white',
                  '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                }}
                startIcon={<SettingsIcon />}
              >
                Manage Subscription
              </Button>
            )}
          </Paper>
        )}

        {/* Subscription CTA for users after trial */}
        {!isUnlimited && (
          <Paper
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
              textAlign: 'center',
            }}
          >
            <AllInclusiveIcon sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Go Unlimited
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
              Subscribe for just $1/month and never worry about credits again.
              Send unlimited messages, log unlimited workouts - everything is included.
            </Typography>
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleSubscribe}
              disabled={subscribing}
              sx={{
                bgcolor: 'white',
                color: '#7c3aed',
                fontWeight: 700,
                py: 1.5,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
              }}
            >
              {subscribing ? <CircularProgress size={24} /> : 'Subscribe - $1/month'}
            </Button>
          </Paper>
        )}

        {/* Balance Card - Only show if credits are visible */}
        {entitlements?.creditsVisible && (
          <Paper
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 3,
              background: tierConfig.color,
              position: 'relative',
            }}
          >
            <Chip
              icon={<StarIcon sx={{ fontSize: 16 }} />}
              label={tier.charAt(0).toUpperCase() + tier.slice(1)}
              size="small"
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontWeight: 600,
              }}
            />

            <Typography variant="body2" sx={{ opacity: 0.8, mb: 0.5 }}>Available Balance</Typography>
            <Typography variant="h3" fontWeight={700} sx={{ mb: 0.5 }}>
              {(entitlements?.creditBalance || 0).toLocaleString()}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 3 }}>credits</Typography>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setShowBuyModal(true)}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                  }}
                >
                  Add Credits
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<SendIcon />}
                  onClick={() => setShowSendModal(true)}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                  }}
                >
                  Send
                </Button>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Stats Grid - Only show if credits are visible */}
        {entitlements?.creditsVisible && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6}>
              <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">Lifetime Earned</Typography>
                <Typography variant="h6" fontWeight={600}>
                  {(wallet?.wallet?.lifetime_earned || 0).toLocaleString()}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">Lifetime Spent</Typography>
                <Typography variant="h6" fontWeight={600}>
                  {(wallet?.wallet?.lifetime_spent || 0).toLocaleString()}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* VIP Progress - Only show if credits are visible */}
        {entitlements?.creditsVisible && (
          <Paper sx={{ p: 3, mb: 3, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VerifiedIcon color="primary" />
                <Typography fontWeight={600}>VIP Status</Typography>
              </Box>
              {tierConfig.discount > 0 && (
                <Chip label={`${tierConfig.discount}% discount`} size="small" color="success" />
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
              {Object.entries(VIP_TIERS).map(([name, config], i) => (
                <Box
                  key={name}
                  sx={{
                    flex: 1,
                    height: 8,
                    borderRadius: 4,
                    background: tier === name ? config.color :
                      Object.keys(VIP_TIERS).indexOf(tier) > i ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'
                  }}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              {Object.entries(VIP_TIERS).map(([name]) => (
                <Typography
                  key={name}
                  variant="caption"
                  sx={{
                    color: tier === name ? 'white' : 'text.secondary',
                    fontWeight: tier === name ? 600 : 400,
                    textTransform: 'capitalize'
                  }}
                >
                  {name}
                </Typography>
              ))}
            </Box>
          </Paper>
        )}

        {/* Transaction History - Only show if credits are visible */}
        {entitlements?.creditsVisible && (
          <Box>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Recent Transactions</Typography>
            {transactions.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
                <AccountBalanceWalletIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography color="text.secondary">No transactions yet</Typography>
              </Paper>
            ) : (
              <List sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
                {transactions.map((tx, i) => (
                  <React.Fragment key={tx.id}>
                    <ListItem>
                      <ListItemIcon>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: tx.amount > 0 ? 'success.dark' : 'error.dark',
                          }}
                        >
                          {tx.amount > 0 ? <TrendingDownIcon color="success" /> : <TrendingUpIcon color="error" />}
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={tx.action || tx.type || 'Transaction'}
                        secondary={formatDate(tx.created_at)}
                      />
                      <Typography
                        variant="body1"
                        fontWeight={600}
                        color={tx.amount > 0 ? 'success.main' : 'error.main'}
                      >
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </Typography>
                    </ListItem>
                    {i < transactions.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        )}
      </Container>

      {/* Buy Credits Dialog */}
      <Dialog open={showBuyModal} onClose={() => setShowBuyModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Get More Credits</DialogTitle>
        <DialogContent>
          {/* Credit Purchase Option */}
          <Paper
            sx={{
              p: 3,
              mb: 2,
              borderRadius: 2,
              border: '2px solid',
              borderColor: 'primary.main',
              textAlign: 'center',
            }}
          >
            <Typography variant="h4" fontWeight={700} color="primary">
              100 Credits
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              $1.00
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Each workout prescription costs 1 credit
            </Typography>
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleBuyCredits}
              disabled={buyingCredits}
              sx={{ fontWeight: 700 }}
            >
              {buyingCredits ? <CircularProgress size={24} /> : 'Buy 100 Credits - $1'}
            </Button>
          </Paper>

          <Divider sx={{ my: 2 }}>or</Divider>

          {/* Subscription Option */}
          <Paper
            sx={{
              p: 3,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
              textAlign: 'center',
            }}
          >
            <AllInclusiveIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h5" fontWeight={700}>
              Go Unlimited
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
              $1/month - No credit limits ever
            </Typography>
            <Button
              variant="contained"
              fullWidth
              onClick={handleSubscribe}
              disabled={subscribing}
              sx={{
                bgcolor: 'white',
                color: '#7c3aed',
                fontWeight: 700,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
              }}
            >
              {subscribing ? <CircularProgress size={24} /> : 'Subscribe - $1/month'}
            </Button>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBuyModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Send Credits Dialog */}
      <Dialog open={showSendModal} onClose={() => setShowSendModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Send Credits</DialogTitle>
        <form onSubmit={handleSend}>
          <DialogContent>
            <TextField
              fullWidth
              label="Recipient Username"
              value={sendRecipient}
              onChange={(e) => setSendRecipient(e.target.value)}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
              required
              inputProps={{ min: 1 }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Message (optional)"
              value={sendMessage}
              onChange={(e) => setSendMessage(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowSendModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Send Credits</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
