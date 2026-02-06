import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Paper,
  LinearProgress,
  Chip,
  Avatar,
  AvatarGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  CleaningServices,
  Bathroom,
  CheckCircle,
  PendingActions,
  QrCodeScanner,
  Warning,
  AccessTime,
  Person,
  Refresh,
  Visibility,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import cleaningService from '../services/cleaningService';
import roomService from '../services/roomService';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Buscar dados do dashboard do backend
      const [statsResponse, activeResponse, recentResponse, roomStatsResponse] = await Promise.all([
        cleaningService.getCleaningStats('today'),
        cleaningService.getActiveCleanings(),
        cleaningService.getRecentCleanings(5),
        roomService.getRoomStats(),
      ]);

      if (statsResponse.success && roomStatsResponse.success) {
        const stats = statsResponse.stats || {};
        const roomStats = roomStatsResponse.stats || {};
        
        setDashboardData({
          stats: {
            totalRooms: roomStats.total || 0,
            pendingCleaning: roomStats.byStatus?.PENDING || 0,
            inProgress: roomStats.byStatus?.['IN_PROGRESS'] || 0,
            completedToday: stats.completed || 0,
            needsAttention: roomStats.byStatus?.['NEEDS_ATTENTION'] || 0,
            completionRate: stats.completionRate || 0,
          },
          activeCleanings: activeResponse.success ? activeResponse.data : [],
          recentCompletions: recentResponse.success ? recentResponse.data : [],
          roomsByStatus: [
            { status: 'PENDENTE', count: roomStats.byStatus?.PENDING || 0, color: '#ff9800' },
            { status: 'EM ANDAMENTO', count: roomStats.byStatus?.['IN_PROGRESS'] || 0, color: '#2196f3' },
            { status: 'CONCLUÍDO', count: roomStats.byStatus?.COMPLETED || 0, color: '#4caf50' },
            { status: 'ATENÇÃO', count: roomStats.byStatus?.['NEEDS_ATTENTION'] || 0, color: '#f44336' },
          ],
        });
      } else {
        setError('Erro ao carregar dados do dashboard');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
      console.error('Erro no dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, subtitle, onClick }) => (
    <Card 
      sx={{ 
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s',
        '&:hover': onClick ? { transform: 'translateY(-4px)' } : {},
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="textSecondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h3" component="div" sx={{ fontWeight: 700, color }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color, fontSize: 48, opacity: 0.8 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const formatTime = (date) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'HH:mm', { locale: ptBR });
  };

  const formatDuration = (startDate) => {
    if (!startDate) return '0 min';
    const diff = Date.now() - new Date(startDate).getTime();
    const minutes = Math.floor(diff / 60000);
    return `${minutes} min`;
  };

  if (loading && !dashboardData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !dashboardData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={fetchDashboardData} startIcon={<Refresh />}>
          Tentar novamente
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Cabeçalho */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#2c3e50' }}>
            Dashboard de Limpeza
          </Typography>
          <Typography variant="body1" color="textSecondary">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchDashboardData}
            disabled={loading}
          >
            {loading ? 'Atualizando...' : 'Atualizar'}
          </Button>
          <Button
            variant="contained"
            startIcon={<QrCodeScanner />}
            onClick={() => navigate('/scan')}
            sx={{ bgcolor: '#1976d2' }}
          >
            Escanear QR Code
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Cards de Estatísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <StatCard 
            title="Total de Ambientes" 
            value={dashboardData?.stats.totalRooms || 0}
            icon={<CleaningServices />}
            color="#1976d2"
            subtitle="Salas + Banheiros"
            onClick={() => navigate('/rooms')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <StatCard 
            title="Pendentes" 
            value={dashboardData?.stats.pendingCleaning || 0}
            icon={<PendingActions />}
            color="#ff9800"
            subtitle="Aguardando limpeza"
            onClick={() => navigate('/rooms?status=PENDING')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <StatCard 
            title="Em Andamento" 
            value={dashboardData?.stats.inProgress || 0}
            icon={<AccessTime />}
            color="#2196f3"
            subtitle="Sendo limpos agora"
            onClick={() => navigate('/rooms?status=IN_PROGRESS')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <StatCard 
            title="Concluídos Hoje" 
            value={dashboardData?.stats.completedToday || 0}
            icon={<CheckCircle />}
            color="#4caf50"
            subtitle="Limpezas finalizadas"
            onClick={() => navigate('/history')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <StatCard 
            title="Precisa Atenção" 
            value={dashboardData?.stats.needsAttention || 0}
            icon={<Warning />}
            color="#f44336"
            subtitle="Verificação necessária"
            onClick={() => navigate('/rooms?status=NEEDS_ATTENTION')}
          />
        </Grid>
      </Grid>

      {/* Progresso Geral */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Progresso Geral de Limpeza
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2' }}>
            {dashboardData?.stats.completionRate || 0}%
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={dashboardData?.stats.completionRate || 0} 
          sx={{ 
            height: 12, 
            borderRadius: 6,
            backgroundColor: '#e0e0e0',
            '& .MuiLinearProgress-bar': {
              borderRadius: 6,
            }
          }}
          color={dashboardData?.stats.completionRate >= 80 ? "success" : dashboardData?.stats.completionRate >= 50 ? "primary" : "warning"}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="caption" color="textSecondary">0%</Typography>
          <Typography variant="caption" color="textSecondary">100%</Typography>
        </Box>
      </Paper>

      {/* Grid com duas colunas */}
      <Grid container spacing={3}>
        {/* Coluna 1: Limpezas em Andamento */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                ��� Limpezas em Andamento
              </Typography>
              <Chip label={`${dashboardData?.activeCleanings.length || 0} ativas`} color="primary" size="small" />
            </Box>
            
            {loading ? (
              <LinearProgress sx={{ my: 2 }} />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Ambiente</TableCell>
                      <TableCell>Funcionário</TableCell>
                      <TableCell>Início</TableCell>
                      <TableCell>Tempo</TableCell>
                      <TableCell align="right">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardData?.activeCleanings.map((cleaning) => (
                      <TableRow key={cleaning.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: cleaning.room?.type === 'BATHROOM' ? '#2196f3' : '#4caf50', mr: 2 }}>
                              {cleaning.room?.type === 'BATHROOM' ? '���' : '���'}
                            </Avatar>
                            {cleaning.room?.name || 'N/A'}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ width: 24, height: 24, mr: 1, bgcolor: '#1976d2' }}>
                              <Person fontSize="small" />
                            </Avatar>
                            {cleaning.cleaner?.name || 'N/A'}
                          </Box>
                        </TableCell>
                        <TableCell>{formatTime(cleaning.startedAt)}</TableCell>
                        <TableCell>
                          <Chip 
                            label={formatDuration(cleaning.startedAt)} 
                            size="small" 
                            icon={<AccessTime fontSize="small" />}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => navigate(`/scan?room=${cleaning.room?.id}`)}>
                            <Visibility fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            
            {dashboardData?.activeCleanings.length === 0 && !loading && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="textSecondary">
                  Nenhuma limpeza em andamento
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Coluna 2: Recentemente Concluídas */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                ✅ Recentemente Concluídas
              </Typography>
              <Button size="small" onClick={() => navigate('/history')}>
                Ver todas
              </Button>
            </Box>
            
            {loading ? (
              <LinearProgress sx={{ my: 2 }} />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Ambiente</TableCell>
                      <TableCell>Funcionário</TableCell>
                      <TableCell>Concluído</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardData?.recentCompletions.map((completion) => (
                      <TableRow key={completion.id} hover>
                        <TableCell>{completion.room?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ width: 24, height: 24, mr: 1, bgcolor: '#4caf50' }}>
                              <Person fontSize="small" />
                            </Avatar>
                            {completion.cleaner?.name || 'N/A'}
                          </Box>
                        </TableCell>
                        <TableCell>{formatTime(completion.completedAt)}</TableCell>
                        <TableCell>
                          <Chip 
                            label="CONCLUÍDO" 
                            size="small" 
                            color="success"
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            
            {dashboardData?.recentCompletions.length === 0 && !loading && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="textSecondary">
                  Nenhuma limpeza concluída recentemente
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Status por Categoria */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
          Distribuição por Status
        </Typography>
        {loading ? (
          <LinearProgress sx={{ my: 2 }} />
        ) : (
          <Grid container spacing={2}>
            {dashboardData?.roomsByStatus.map((item) => (
              <Grid item xs={6} sm={3} key={item.status}>
                <Card sx={{ bgcolor: item.color + '10', border: `1px solid ${item.color}20` }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ color: item.color, fontWeight: 700 }}>
                      {item.count}
                    </Typography>
                    <Typography variant="body2" sx={{ color: item.color, fontWeight: 600 }}>
                      {item.status}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>
    </Box>
  );
};

export default Dashboard;
