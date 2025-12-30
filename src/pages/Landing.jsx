import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Container,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';

export default function Landing() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.15), transparent 35%), radial-gradient(circle at 80% 0%, rgba(168, 85, 247, 0.2), transparent 30%)',
      }}
    >
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar sx={{ maxWidth: 1200, width: '100%', mx: 'auto', py: 2, px: { xs: 2, md: 4 } }}>
          <Typography
            variant="h6"
            fontWeight={900}
            sx={{
              flexGrow: 1,
              background: 'linear-gradient(90deg, #60a5fa 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            MuscleMap
          </Typography>

          <Stack direction="row" spacing={2} alignItems="center">
            <Button color="inherit" component={RouterLink} to="/login">
              Log In
            </Button>
            <Button
              variant="contained"
              component={RouterLink}
              to="/signup"
              disableElevation
            >
              Sign Up
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ textAlign: 'center', py: { xs: 10, md: 16 } }}>
        <Typography
          variant="h2"
          fontWeight={900}
          color="common.white"
          sx={{
            mb: 3,
            fontSize: { xs: '2.75rem', md: '4.25rem' },
            lineHeight: 1.1,
          }}
        >
          See Every Rep.
          <br />
          <Box
            component="span"
            sx={{
              display: 'inline-block',
              background: 'linear-gradient(90deg, #60a5fa 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Know Every Muscle.
          </Box>
        </Typography>

        <Typography variant="h6" color="text.secondary" sx={{ mb: 5, maxWidth: 700, mx: 'auto' }}>
          Real-time muscle activation visualization. Log a set, watch it light up.
        </Typography>

        <Button
          size="large"
          variant="contained"
          color="primary"
          component={RouterLink}
          to="/signup"
          disableElevation
          sx={{
            px: 4,
            py: 1.5,
            fontSize: { xs: '1rem', md: '1.125rem' },
          }}
        >
          Start Your Journey
        </Button>
      </Container>
    </Box>
  );
}
