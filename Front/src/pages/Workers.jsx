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
  CheckCircle,
  PendingActions,
  Login as LoginIcon,
  CleaningServices,
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
  const [workerStats, setWorkerStats] = useState({});

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

  // ----
  //  FUNÇÃO ajustada - Busca funcionários + estatísticas REAIS
  // ----
  const fetchWorkers = async () => {
    try {
      setLoading(true);
      setError('');

      //  1. Buscar TODOS os usuários
      const response = await userService.getUsers();
      
      if (response.success) {
        const allUsers = response.data || [];
        
        //  2. Para cada funcionário, buscar estatísticas reais
        const workersWithStats = await Promise.all(
          allUsers.map(async (worker) => {
            try {
              //  ajustado: userService.getWorkerStats (NÃO cleaningService)
              const statsResponse = await userService.getWorkerStats(worker.id);
              const loginHistory = await userService.getUserLoginHistory(worker.id);
              
              return {
                ...worker,
                stats: {
                  totalCleanings: statsResponse?.total || 0,
                  todayCleanings: statsResponse?.today || 0,
                  weekCleanings: statsResponse?.week || 0,
                  monthCleanings: statsResponse?.month || 0,
                  averageTime: statsResponse?.averageTime || 0,
                  lastCleaning: statsResponse?.lastCleaning || null,
                },
                lastLogin: loginHistory?.lastLogin || null,
                firstLogin: loginHistory?.firstLogin || worker.createdAt,
                loginCount: loginHistory?.count || 0,
                activities: loginHistory?.activities || []
              };
            } catch (err) {
              console.error(`Erro ao buscar dados do funcionário ${worker.id}:`, err);
              // Se falhar, retorna com dados básicos
              return {
                ...worker,
                stats: { 
                  totalCleanings: 0, 
                  todayCleanings: 0,
                  averageTime: 0 
                },
                lastLogin: null,
                loginCount: 0,
              };
            }
          })
        );

        setWorkers(workersWithStats);
        
        //  3. Calcular estatísticas gerais
        const stats = {
          total: workersWithStats.length,
          active: workersWithStats.filter(w => w.status === 'ACTIVE').length,
          inactive: workersWithStats.filter(w => w.status === 'INACTIVE').length,
          cleaners: workersWithStats.filter(w => w.role === 'CLEANER').length,
          supervisors: workersWithStats.filter(w => w.role === 'SUPERVISOR').length,
          admins: workersWithStats.filter(w => w.role === 'ADMIN').length,
          totalCleanings: workersWithStats.reduce((sum, w) => sum + (w.stats?.totalCleanings || 0), 0),
          todayCleanings: workersWithStats.reduce((sum, w) => sum + (w.stats?.todayCleanings || 0), 0),
          weekCleanings: workersWithStats.reduce((sum, w) => sum + (w.stats?.weekCleanings || 0), 0),
          monthCleanings: workersWithStats.reduce((sum, w) => sum + (w.stats?.monthCleanings || 0), 0),
          averageTime: workersWithStats.reduce((sum, w) => sum + (w.stats?.averageTime || 0), 0) / Math.max(workersWithStats.length, 1),
        };
        setWorkerStats(stats);
        
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
    
    if (!newWorker.name || !newWorker.email || !newWorker.phone) {
      setMessage({ type: 'error', text: 'Preencha todos os campos obrigatórios' });
      return;
    }

    if (newWorker.password !== newWorker.confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem' });
      return;
    }

    const userDataToSend = {
      name: newWorker.name.trim(),
      email: newWorker.email.trim().toLowerCase(),
      phone: newWorker.phone.trim(),
      role: newWorker.role || 'CLEANER',
      status: 'ACTIVE'
    };

    if (!selectedWorker || (newWorker.password && newWorker.password !== '')) {
      userDataToSend.password = newWorker.password || 'senha123';
    }

    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });

      let response;
      if (selectedWorker) {
        response = await userService.updateUser(selectedWorker.id, userDataToSend);
      } else {
        response = await userService.createUser(userDataToSend);
      }

      if (response && response.success) {
        const successMsg = selectedWorker 
          ? 'Funcionário atualizado com sucesso!' 
          : 'Funcionário cadastrado com sucesso!';
        
        setMessage({ type: 'success', text: successMsg });
        
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

      {/* Estatísticas REAIS */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ color: '#1976d2', fontWeight: 700 }}>
                {workerStats.total || 0}
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
                {workerStats.active || 0}
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
              <Typography variant="h3" sx={{ color: '#4caf50', fontWeight: 700 }}>
                {workerStats.cleaners || 0}
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
              <Typography variant="h3" sx={{ color: '#2196f3', fontWeight: 700 }}>
                {workerStats.supervisors || 0}
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
                {workerStats.totalCleanings || 0}
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
                {workerStats.todayCleanings || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Hoje
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabela de Funcionários com dados REAIS */}
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
                  <TableCell><strong>Último Acesso</strong></TableCell>
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
                            {worker.name?.split(' ').map(n => n[0]).join('')}
                          </Avatar>
                          <Box>
                            <Typography variant="body1" fontWeight={500}>
                              {worker.name}
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
                      </TableCell>
                      <TableCell>
                        <Box>
                          {worker.lastLogin ? (
                            <>
                              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                                <LoginIcon fontSize="small" sx={{ mr: 0.5, color: '#4caf50' }} />
                                {formatDate(worker.lastLogin, 'dd/MM/yyyy HH:mm')}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {worker.loginCount || 1} {worker.loginCount === 1 ? 'acesso' : 'acessos'}
                              </Typography>
                            </>
                          ) : (
                            <Typography variant="body2" sx={{ color: '#ff9800', display: 'flex', alignItems: 'center' }}>
                              <PendingActions fontSize="small" sx={{ mr: 0.5 }} />
                              Nunca logou
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                            <CleaningServices fontSize="small" sx={{ mr: 0.5, color: '#1976d2' }} />
                            <strong>{worker.stats?.todayCleanings || 0}</strong>&nbsp;hoje
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {worker.stats?.totalCleanings || 0} total
                          </Typography>
                          {worker.stats?.averageTime > 0 && (
                            <Typography variant="caption" color="textSecondary" display="block">
                              ⏱️ {worker.stats.averageTime} min média
                            </Typography>
                          )}
                          {worker.stats?.lastCleaning && (
                            <Typography variant="caption" color="textSecondary" display="block">
                              🧹 Última: {formatDate(worker.stats.lastCleaning.date, 'dd/MM HH:mm')}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => handleOpenDialog(worker)}>
                              <EditIcon fontSize="small" />
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
                <MenuItem value="CLEANER">Funcionário de Limpeza</MenuItem>
                <MenuItem value="SUPERVISOR">Supervisor</MenuItem>
                <MenuItem value="ADMIN">Administrador</MenuItem>
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
