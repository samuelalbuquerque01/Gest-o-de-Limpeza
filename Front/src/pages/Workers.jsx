import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Email,
  Phone,
  Badge,
  QrCode as QrCodeIcon,
  CheckCircle,
  PendingActions,
  LockReset,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import userService from '../services/userService';
import { formatDate } from '../utils/helpers';

const Workers = () => {
  const { user } = useAuth();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const [newWorker, setNewWorker] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'CLEANER',
    password: 'senha123',
    confirmPassword: 'senha123',
  });

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchWorkers();
    }
  }, [user]);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await userService.getUsers();
      
      if (response.success) {
        setWorkers(response.data || []);
      } else {
        setError(response.error || 'Erro ao carregar funcionários');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
      console.error('Erro ao carregar funcionários:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'ACTIVE':
        return { color: 'success', label: 'Ativo', icon: <CheckCircle /> };
      case 'INACTIVE':
        return { color: 'error', label: 'Inativo', icon: <PendingActions /> };
      case 'ON_LEAVE':
        return { color: 'warning', label: 'Afastado', icon: <PendingActions /> };
      default:
        return { color: 'default', label: status, icon: null };
    }
  };

  const getRoleInfo = (role) => {
    switch (role) {
      case 'CLEANER':
        return { label: 'Funcionário', color: '#4caf50' };
      case 'SUPERVISOR':
        return { label: 'Supervisor', color: '#2196f3' };
      case 'ADMIN':
        return { label: 'Administrador', color: '#1976d2' };
      default:
        return { label: role, color: '#757575' };
    }
  };

  const handleOpenDialog = (worker = null) => {
    setSelectedWorker(worker);
    if (worker) {
      setNewWorker({
        name: worker.name,
        email: worker.email,
        phone: worker.phone || '',
        role: worker.role,
        password: '',
        confirmPassword: '',
      });
    } else {
      setNewWorker({
        name: '',
        email: '',
        phone: '',
        role: 'CLEANER',
        password: 'senha123',
        confirmPassword: 'senha123',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedWorker(null);
    setMessage({ type: '', text: '' });
  };

  const handleSaveWorker = async () => {
    console.log('🔍 [Workers.jsx] Iniciando salvamento...');
    
    // Validações básicas
    if (!newWorker.name || !newWorker.email || !newWorker.phone) {
      console.log('❌ [Workers.jsx] Campos obrigatórios faltando');
      setMessage({ type: 'error', text: 'Preencha todos os campos obrigatórios' });
      return;
    }

    if (newWorker.password !== newWorker.confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem' });
      return;
    }

    // ✅ PREPARAR DADOS CORRETAMENTE para API
    const userDataToSend = {
      name: newWorker.name.trim(),
      email: newWorker.email.trim().toLowerCase(),
      phone: newWorker.phone.trim(),
      role: newWorker.role || 'CLEANER',
      status: 'ACTIVE'
    };

    // Se for criação OU atualização com nova senha, incluir senha
    if (!selectedWorker || (newWorker.password && newWorker.password !== '')) {
      userDataToSend.password = newWorker.password || 'senha123';
      userDataToSend.confirmPassword = newWorker.confirmPassword || newWorker.password;
    }

    console.log('📤 [Workers.jsx] Dados para enviar:', userDataToSend);

    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });

      let response;
      if (selectedWorker) {
        // Atualizar funcionário
        console.log('🔄 [Workers.jsx] Atualizando usuário:', selectedWorker.id);
        response = await userService.updateUser(selectedWorker.id, userDataToSend);
      } else {
        // Novo funcionário
        console.log('➕ [Workers.jsx] Criando novo usuário');
        response = await userService.createUser(userDataToSend);
      }

      console.log('📥 [Workers.jsx] Resposta do servidor:', response);

      if (response && response.success) {
        const successMsg = selectedWorker 
          ? 'Funcionário atualizado com sucesso!' 
          : 'Funcionário cadastrado com sucesso!';
        
        setMessage({ type: 'success', text: successMsg });
        
        // Fechar dialog após 2 segundos e recarregar lista
        setTimeout(() => {
          handleCloseDialog();
          fetchWorkers();
        }, 2000);
      } else {
        setMessage({ 
          type: 'error', 
          text: response?.error || 'Erro ao salvar funcionário' 
        });
      }
    } catch (err) {
      console.error('💥 [Workers.jsx] Erro completo:', err);
      setMessage({ 
        type: 'error', 
        text: err.message || 'Erro ao salvar funcionário' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWorker = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este funcionário?')) {
      try {
        const response = await userService.deleteUser(id);
        if (response.success) {
          setMessage({ type: 'success', text: 'Funcionário excluído com sucesso!' });
          fetchWorkers();
        } else {
          setMessage({ type: 'error', text: response.error || 'Erro ao excluir funcionário' });
        }
      } catch (err) {
        setMessage({ type: 'error', text: 'Erro ao excluir funcionário' });
        console.error('Erro ao excluir funcionário:', err);
      }
    }
  };

  const handleResetPassword = async (workerId) => {
    if (window.confirm('Deseja resetar a senha deste funcionário para "senha123"?')) {
      try {
        const response = await userService.resetPassword(workerId, 'senha123');
        if (response.success) {
          setMessage({ type: 'success', text: 'Senha resetada com sucesso!' });
        } else {
          setMessage({ type: 'error', text: response.error || 'Erro ao resetar senha' });
        }
      } catch (err) {
        setMessage({ type: 'error', text: 'Erro ao resetar senha' });
        console.error('Erro ao resetar senha:', err);
      }
    }
  };

  const handleGenerateQRCode = (workerId) => {
    const worker = workers.find(w => w.id === workerId);
    alert(`QR Code de ${worker.name}: QR-FUNC-${workerId}\n\nEm um sistema real, aqui seria gerado um QR Code para download.`);
  };

  // Estatísticas
  const stats = {
    total: workers.length,
    active: workers.filter(w => w.status === 'ACTIVE').length,
    cleaners: workers.filter(w => w.role === 'CLEANER').length,
    supervisors: workers.filter(w => w.role === 'SUPERVISOR').length,
    totalCleanings: workers.reduce((sum, w) => sum + (w.stats?.totalCleanings || 0), 0),
    todayCleanings: workers.reduce((sum, w) => sum + (w.stats?.todayCleanings || 0), 0),
  };

  if (user?.role !== 'ADMIN') {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Alert severity="error">
          Acesso restrito a administradores.
        </Alert>
      </Container>
    );
  }

  if (loading && workers.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {message.text && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {/* Cabeçalho */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#2c3e50' }}>
            👥 Gerenciamento de Funcionários
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Cadastre, visualize e gerencie sua equipe de limpeza
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ bgcolor: '#1976d2' }}
        >
          Novo Funcionário
        </Button>
      </Box>

      {/* Estatísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ color: '#1976d2', fontWeight: 700 }}>
                {stats.total}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total de Funcionários
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ color: '#4caf50', fontWeight: 700 }}>
                {stats.active}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Ativos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ color: '#2196f3', fontWeight: 700 }}>
                {stats.cleaners}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Funcionários
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ color: '#9c27b0', fontWeight: 700 }}>
                {stats.supervisors}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Supervisores
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ color: '#ff9800', fontWeight: 700 }}>
                {stats.totalCleanings}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Limpezas Totais
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ color: '#00bcd4', fontWeight: 700 }}>
                {stats.todayCleanings}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Hoje
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabela de Funcionários */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loading ? (
          <LinearProgress sx={{ mb: 2 }} />
        ) : (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell><strong>Funcionário</strong></TableCell>
                  <TableCell><strong>Cargo</strong></TableCell>
                  <TableCell><strong>Contato</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Admissão</strong></TableCell>
                  <TableCell><strong>Limpezas</strong></TableCell>
                  <TableCell><strong>Ações</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workers.map((worker) => {
                  const statusInfo = getStatusInfo(worker.status);
                  const roleInfo = getRoleInfo(worker.role);
                  
                  return (
                    <TableRow key={worker.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ width: 40, height: 40, mr: 2, bgcolor: roleInfo.color }}>
                            {worker.name.split(' ').map(n => n[0]).join('')}
                          </Avatar>
                          <Box>
                            <Typography variant="body1" fontWeight={500}>
                              {worker.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              ID: {worker.id?.substring(0, 8)}...
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={roleInfo.label}
                          size="small"
                          sx={{ bgcolor: roleInfo.color + '20', color: roleInfo.color }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{worker.email}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {worker.phone || 'Não informado'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={statusInfo.label}
                          size="small"
                          color={statusInfo.color}
                          icon={statusInfo.icon}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(worker.createdAt)}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {worker.lastLogin ? `Último login: ${formatDate(worker.lastLogin, 'dd/MM HH:mm')}` : 'Nunca logou'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            <strong>{worker.stats?.todayCleanings || 0}</strong> hoje
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {worker.stats?.totalCleanings || 0} total
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Gerar QR Code">
                            <IconButton size="small" onClick={() => handleGenerateQRCode(worker.id)}>
                              <QrCodeIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => handleOpenDialog(worker)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Resetar Senha">
                            <IconButton size="small" onClick={() => handleResetPassword(worker.id)}>
                              <LockReset fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton size="small" onClick={() => handleDeleteWorker(worker.id)} color="error">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {workers.length === 0 && !loading && (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <PersonIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Nenhum funcionário cadastrado
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Clique em "Novo Funcionário" para começar
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Diálogo para cadastrar/editar funcionário */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedWorker ? 'Editar Funcionário' : 'Novo Funcionário'}
        </DialogTitle>
        <DialogContent>
          {message.text && (
            <Alert severity={message.type} sx={{ mb: 2 }}>
              {message.text}
            </Alert>
          )}
          
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Nome Completo *"
              value={newWorker.name}
              onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
              InputProps={{
                startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
            
            <TextField
              fullWidth
              label="Email *"
              type="email"
              value={newWorker.email}
              onChange={(e) => setNewWorker({ ...newWorker, email: e.target.value })}
              InputProps={{
                startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
            
            <TextField
              fullWidth
              label="Telefone *"
              value={newWorker.phone}
              onChange={(e) => setNewWorker({ ...newWorker, phone: e.target.value })}
              placeholder="(11) 99999-9999"
              InputProps={{
                startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
            
            <FormControl fullWidth>
              <InputLabel>Cargo *</InputLabel>
              <Select
                value={newWorker.role}
                label="Cargo *"
                onChange={(e) => setNewWorker({ ...newWorker, role: e.target.value })}
              >
                <MenuItem value="CLEANER">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Badge sx={{ mr: 1, color: '#4caf50' }} />
                    Funcionário de Limpeza
                  </Box>
                </MenuItem>
                <MenuItem value="SUPERVISOR">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Badge sx={{ mr: 1, color: '#2196f3' }} />
                    Supervisor
                  </Box>
                </MenuItem>
                <MenuItem value="ADMIN">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Badge sx={{ mr: 1, color: '#1976d2' }} />
                    Administrador
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            {!selectedWorker && (
              <>
                <TextField
                  fullWidth
                  label="Senha *"
                  type="password"
                  value={newWorker.password}
                  onChange={(e) => setNewWorker({ ...newWorker, password: e.target.value })}
                  helperText="Senha inicial para o funcionário"
                />
                
                <TextField
                  fullWidth
                  label="Confirmar Senha *"
                  type="password"
                  value={newWorker.confirmPassword}
                  onChange={(e) => setNewWorker({ ...newWorker, confirmPassword: e.target.value })}
                />
              </>
            )}

            {selectedWorker && (
              <>
                <Alert severity="info" sx={{ mt: 2 }}>
                  Deixe as senhas em branco para manter a senha atual
                </Alert>
                <TextField
                  fullWidth
                  label="Nova Senha (opcional)"
                  type="password"
                  value={newWorker.password}
                  onChange={(e) => setNewWorker({ ...newWorker, password: e.target.value })}
                />
                
                <TextField
                  fullWidth
                  label="Confirmar Nova Senha"
                  type="password"
                  value={newWorker.confirmPassword}
                  onChange={(e) => setNewWorker({ ...newWorker, confirmPassword: e.target.value })}
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveWorker} 
            variant="contained"
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} /> : (selectedWorker ? 'Atualizar' : 'Cadastrar')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Workers;