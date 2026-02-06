import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  Avatar,
  Divider,
  Switch,
  FormControlLabel,
  Alert,
  Card,
  CardContent,
} from '@mui/material';
import {
  Person,
  Email,
  Lock,
  Notifications,
  Security,
  Save,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Settings = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    cleaningAlerts: true,
    reportAlerts: false,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNotificationChange = (name) => (e) => {
    setNotifications(prev => ({ ...prev, [name]: e.target.checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    // Simular salvamento
    setTimeout(() => {
      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
      setSaving(false);
    }, 1000);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#2c3e50', mb: 4 }}>
        ⚙️ Configurações
      </Typography>

      {message.text && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Perfil */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Person sx={{ mr: 2, color: '#1976d2' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Perfil do Usuário
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  mx: 'auto',
                  mb: 2,
                  bgcolor: user?.role === 'ADMIN' ? '#1976d2' : '#4caf50',
                  fontSize: '2rem',
                }}
              >
                {user?.avatar || user?.name?.charAt(0)}
              </Avatar>
              <Typography variant="h6">{user?.name}</Typography>
              <Typography variant="body2" color="textSecondary">
                {user?.email}
              </Typography>
              <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: 'block' }}>
                {user?.role === 'ADMIN' ? 'Administrador' : 'Funcionário de Limpeza'}
              </Typography>
            </Box>

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Nome Completo"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                margin="normal"
                InputProps={{
                  startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
              
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                margin="normal"
                InputProps={{
                  startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />

              <Divider sx={{ my: 3 }} />

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Lock sx={{ mr: 2, color: '#1976d2' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Alterar Senha
                </Typography>
              </Box>

              <TextField
                fullWidth
                label="Senha Atual"
                name="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={handleInputChange}
                margin="normal"
              />
              
              <TextField
                fullWidth
                label="Nova Senha"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleInputChange}
                margin="normal"
              />
              
              <TextField
                fullWidth
                label="Confirmar Nova Senha"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                margin="normal"
              />

              <Button
                type="submit"
                variant="contained"
                startIcon={<Save />}
                disabled={saving}
                sx={{ mt: 3 }}
                fullWidth
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </form>
          </Paper>
        </Grid>

        {/* Notificações e Segurança */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Notifications sx={{ mr: 2, color: '#1976d2' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Notificações
              </Typography>
            </Box>

            <Box sx={{ pl: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.email}
                    onChange={handleNotificationChange('email')}
                    color="primary"
                  />
                }
                label="Notificações por Email"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.push}
                    onChange={handleNotificationChange('push')}
                    color="primary"
                  />
                }
                label="Notificações Push"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.cleaningAlerts}
                    onChange={handleNotificationChange('cleaningAlerts')}
                    color="primary"
                  />
                }
                label="Alertas de Limpeza"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.reportAlerts}
                    onChange={handleNotificationChange('reportAlerts')}
                    color="primary"
                  />
                }
                label="Alertas de Relatórios"
              />
            </Box>
          </Paper>

          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Security sx={{ mr: 2, color: '#1976d2' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Segurança
              </Typography>
            </Box>

            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Sessões Ativas
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Dispositivo atual • {new Date().toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>

            <Button
              variant="outlined"
              color="error"
              fullWidth
              onClick={() => {
                // Lógica para encerrar todas as sessões
              }}
            >
              Encerrar Todas as Outras Sessões
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Settings;