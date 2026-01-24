import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client/react';
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
import { useAuth } from '../store';
import { MY_ENTITLEMENTS_QUERY, MY_WALLET_INFO_QUERY } from '../graphql/queries';
import { TRANSFER_CREDITS_BY_USERNAME_MUTATION } from '../graphql/mutations';

// Types
interface Entitlements {
  unlimited: boolean;
  reason: string;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  creditBalance: number;
  creditsVisible: boolean;
  daysLeftInTrial: number | null;
}

interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  action: string | null;
  createdAt: string;
}

interface WalletInfo {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  totalTransferredOut: number;
  totalTransferredIn: number;
  status: string;
  vipTier: string;
  transactions: WalletTransaction[];
}

const VIP_TIERS: Record<string, { color: string; min: number; discount: number }> = {
  broke: { color: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)', min: 0, discount: 0 },
  bronze: { color: 'linear-gradient(135deg, #92400e 0%, #78350f 100%)', min: 0, discount: 0 },
  silver: { color: 'linear-gradient(135deg, #9ca3af 0%, #4b5563 100%)', min: 100, discount: 5 },
  gold: { color: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', min: 500, discount: 10 },
  platinum: { color: 'linear-gradient(135deg, #67e8f9 0%, #3b82f6 100%)', min: 2000, discount: 15 },
  diamond: { color: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', min: 10000, discount: 20 },
  obsidian: { color: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)', min: 1000000, discount: 25 },
};

const formatDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
};

export default function Wallet() {
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendAmount, setSendAmount] = useState('');
  const [sendRecipient, setSendRecipient] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [buyingCredits, setBuyingCredits] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });

  // GraphQL queries
  const { data: entitlementsData, loading: entitlementsLoading, refetch: refetchEntitlements } = useQuery<{ myEntitlements: Entitlements }>(
    MY_ENTITLEMENTS_QUERY,
    {
      skip: !isAuthenticated,
      fetchPolicy: 'cache-and-network',
    }
  );

  const { data: walletData, loading: walletLoading, refetch: refetchWallet } = useQuery<{ myWalletInfo: WalletInfo }>(
    MY_WALLET_INFO_QUERY,
    {
      skip: !isAuthenticated,
      fetchPolicy: 'cache-and-network',
    }
  );

  // GraphQL mutation
  const [transferCredits] = useMutation(TRANSFER_CREDITS_BY_USERNAME_MUTATION, {
    onCompleted: (data) => {
      if (data.transferCreditsByUsername.success) {
        setShowSendModal(false);
        setSendAmount('');
        setSendRecipient('');
        setSendMessage('');
        refetchWallet();
        refetchEntitlements();
        setSnackbar({ open: true, message: 'Credits sent successfully!', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: data.transferCreditsByUsername.error || 'Failed to send credits.', severity: 'error' });
      }
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to send credits.', severity: 'error' });
    },
  });

  // Memoized data
  const entitlements = useMemo(() => entitlementsData?.myEntitlements || null, [entitlementsData]);
  const wallet = useMemo(() => walletData?.myWalletInfo || null, [walletData]);
  const transactions = useMemo(() => wallet?.transactions || [], [wallet]);

  const loading = entitlementsLoading || walletLoading;

  // Handle URL params for subscription/credit purchase redirects
  useEffect(() => {
    const subStatus = searchParams.get('subscription');
    if (subStatus === 'success') {
      setSnackbar({ open: true, message: 'Subscription activated! Enjoy unlimited access.', severity: 'success' });
      refetchEntitlements();
    } else if (subStatus === 'canceled') {
      setSnackbar({ open: true, message: 'Subscription canceled.', severity: 'info' });
    }

    const creditStatus = searchParams.get('credits');
    if (creditStatus === 'success') {
      setSnackbar({ open: true, message: '100 credits added to your account!', severity: 'success' });
      refetchWallet();
      refetchEntitlements();
    } else if (creditStatus === 'canceled') {
      setSnackbar({ open: true, message: 'Credit purchase canceled.', severity: 'info' });
    }
  }, [searchParams, refetchEntitlements, refetchWallet]);

  // Billing operations remain as REST (Stripe redirects)
  const handleSubscribe = useCallback(async () => {
    setSubscribing(true);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('musclemap_token')}`,
        },
      });
      const data = await response.json();
      if (data.data?.url) {
        window.location.href = data.data.url;
      }
    } catch {
      setSnackbar({ open: true, message: 'Failed to start subscription. Please try again.', severity: 'error' });
    } finally {
      setSubscribing(false);
    }
  }, []);

  const handleManageSubscription = useCallback(async () => {
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('musclemap_token')}`,
        },
      });
      const data = await response.json();
      if (data.data?.url) {
        window.location.href = data.data.url;
      }
    } catch {
      setSnackbar({ open: true, message: 'Failed to open billing portal.', severity: 'error' });
    }
  }, []);

  const handleBuyCredits = useCallback(async () => {
    setBuyingCredits(true);
    try {
      const response = await fetch('/api/billing/credits/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('musclemap_token')}`,
        },
      });
      const data = await response.json();
      if (data.data?.url) {
        window.location.href = data.data.url;
      }
    } catch {
      setSnackbar({ open: true, message: 'Failed to start purchase. Please try again.', severity: 'error' });
    } finally {
      setBuyingCredits(false);
    }
  }, []);

  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    transferCredits({
      variables: {
        input: {
          recipientUsername: sendRecipient,
          amount: parseFloat(sendAmount),
          message: sendMessage || undefined,
        },
      },
    });
  }, [transferCredits, sendRecipient, sendAmount, sendMessage]);

  const tier = wallet?.vipTier || 'bronze';
  const tierConfig = VIP_TIERS[tier] || VIP_TIERS.bronze;
  const isUnlimited = entitlements?.unlimited;
  const isInTrial = entitlements?.reason === 'trial';
  const isSubscribed = entitlements?.reason === 'subscribed';
  const creditsVisible = entitlements?.creditsVisible ?? true;

  if (loading && !wallet && !entitlements) {
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
                    : `${entitlements?.daysLeftInTrial || 0} days remaining in your free trial`
                  }
                </Typography>
              </Box>
            </Box>

            {isInTrial && (
              <>
                <LinearProgress
                  variant="determinate"
                  value={((90 - (entitlements?.daysLeftInTrial || 0)) / 90) * 100}
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
        {creditsVisible && (
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
        {creditsVisible && wallet && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6}>
              <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">Lifetime Earned</Typography>
                <Typography variant="h6" fontWeight={600}>
                  {(wallet.lifetimeEarned || 0).toLocaleString()}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">Lifetime Spent</Typography>
                <Typography variant="h6" fontWeight={600}>
                  {(wallet.lifetimeSpent || 0).toLocaleString()}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* VIP Progress - Only show if credits are visible */}
        {creditsVisible && (
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
        {creditsVisible && (
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
                        secondary={formatDate(tx.createdAt)}
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
