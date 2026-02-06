// src/pages/QRManager.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  LinearProgress,
  Alert,
  Stack,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Badge,
} from '@mui/material';
import {
  QrCode,
  Download,
  Print,
  Refresh,
  Add,
  Delete,
  Edit,
  Visibility,
  CloudDownload,
  CloudUpload,
  BatchPrediction,
  Warning,
  CheckCircle,
  Error,
  Room,
  LocationOn,
  FilterList,
  Search,
  Sort,
  MoreVert,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import roomService from '../services/roomService';
import qrService from '../services/qrService';
import QRGeneratorModal from '../components/common/QRGeneratorModal';
import { useSnackbar } from 'notistack';

const QRManager = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [filter, setFilter] = useState('all'); // all, withQR, withoutQR
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [stats, setStats] = useState({
    total: 0,
    withQR: 0,
    withoutQR: 0,
    coverage: 0
  });
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // Carregar salas
  useEffect(() => {
    if (isAdmin) {
      fetchRooms();
    }
  }, [isAdmin]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await roomService.getRooms();
      if (response.success) {
        setRooms(response.data || []);
        updateStats(response.data || []);
      } else {
        setError(response.error || 'Erro ao carregar salas');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
      console.error('Erro ao carregar salas:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (roomsList) => {
    const total = roomsList.length;
    const withQR = roomsList.filter(r => r.qrCode && r.qrCode.trim() !== '').length;
    const withoutQR = total - withQR;
    const coverage = total > 0 ? Math.round((withQR / total) * 100) : 0;
    
    setStats({ total, withQR, withoutQR, coverage });
  };

  // Filtrar e ordenar salas
  const filteredRooms = rooms
    .filter(room => {
      // Filtro por QR Code
      if (filter === 'withQR' && !room.qrCode) return false;
      if (filter === 'withoutQR' && room.qrCode) return false;
      
      // Busca
      if (search.trim()) {
        const query = search.toLowerCase();
        return (
          room.name.toLowerCase().includes(query) ||
          room.location.toLowerCase().includes(query) ||
          room.type.toLowerCase().includes(query) ||
          (room.qrCode && room.qrCode.toLowerCase().includes(query))
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'location':
          comparison = a.location.localeCompare(b.location);
          break;
        case 'qrStatus':
          const aHasQR = !!(a.qrCode && a.qrCode.trim() !== '');
          const bHasQR = !!(b.qrCode && b.qrCode.trim() !== '');
          comparison = aHasQR === bHasQR ? 0 : aHasQR ? -1 : 1;
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Gerar QR Codes faltantes
  const handleGenerateMissing = async () => {
    if (!window.confirm(`Gerar QR Codes para ${stats.withoutQR} salas sem código?`)) {
      return;
    }

    try {
      setGenerating(true);
      setGenerateProgress(0);
      
      const roomsWithoutQR = rooms.filter(r => !r.qrCode || r.qrCode.trim() === '');
      const total = roomsWithoutQR.length;
      
      const results = [];
      for (let i = 0; i < roomsWithoutQR.length; i++) {
        const room = roomsWithoutQR[i];
        try {
          const response = await qrService.generateNewQRCodeForRoom(room.id);
          if (response.success) {
            results.push({ success: true, room: room.name });
          } else {
            results.push({ success: false, room: room.name, error: response.error });
          }
        } catch (err) {
          results.push({ success: false, room: room.name, error: err.message });
        }
        
        setGenerateProgress(Math.round(((i + 1) / total) * 100));
      }
      
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;
      
      enqueueSnackbar(
        `QR Codes gerados: ${successCount} sucessos, ${failedCount} falhas`,
        { variant: successCount > 0 ? 'success' : 'error' }
      );
      
      // Atualizar lista
      await fetchRooms();
    } catch (err) {
      enqueueSnackbar('Erro ao gerar QR Codes faltantes', { variant: 'error' });
      console.error('Erro:', err);
    } finally {
      setGenerating(false);
      setGenerateProgress(0);
    }
  };

  // Gerar QR Code para sala específica
  const handleGenerateForRoom = (room) => {
    setSelectedRoom(room);
    setQrModalOpen(true);
  };

  // Baixar QR Code
  const handleDownloadQR = async (room) => {
    try {
      await qrService.downloadQRCode(room.id, { roomName: room.name });
      enqueueSnackbar(`QR Code de ${room.name} baixado`, { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Erro ao baixar QR Code', { variant: 'error' });
    }
  };

  // Imprimir QR Code
  const handlePrintQR = async (room) => {
    try {
      await qrService.printQRCode(room.id, room);
      enqueueSnackbar(`Abrindo impressão de ${room.name}`, { variant: 'info' });
    } catch (err) {
      enqueueSnackbar('Erro ao abrir impressão', { variant: 'error' });
    }
  };

  // Gerar relatório
  const handleGenerateReport = async () => {
    try {
      await qrService.generateQRReport('csv');
      enqueueSnackbar('Relatório gerado com sucesso', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Erro ao gerar relatório', { variant: 'error' });
    }
  };

  // Selecionar todas as salas
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRooms(filteredRooms.map(r => r.id));
    } else {
      setSelectedRooms([]);
    }
  };

  // Selecionar sala específica
  const handleSelectRoom = (roomId, checked) => {
    if (checked) {
      setSelectedRooms(prev => [...prev, roomId]);
    } else {
      setSelectedRooms(prev => prev.filter(id => id !== roomId));
    }
  };

  // Gerar QR Codes em lote
  const handleGenerateBatch = async () => {
    if (selectedRooms.length === 0) {
      enqueueSnackbar('Selecione pelo menos uma sala', { variant: 'warning' });
      return;
    }

    try {
      setGenerating(true);
      setGenerateProgress(0);
      
      const total = selectedRooms.length;
      const results = [];
      
      for (let i = 0; i < selectedRooms.length; i++) {
        const roomId = selectedRooms[i];
        const room = rooms.find(r => r.id === roomId);
        
        if (room) {
          try {
            const response = await qrService.generateNewQRCodeForRoom(roomId);
            results.push({
              success: response.success,
              room: room.name,
              error: response.error
            });
          } catch (err) {
            results.push({
              success: false,
              room: room.name,
              error: err.message
            });
          }
        }
        
        setGenerateProgress(Math.round(((i + 1) / total) * 100));
      }
      
      const successCount = results.filter(r => r.success).length;
      enqueueSnackbar(
        `Lote concluído: ${successCount}/${total} QR Codes gerados`,
        { variant: successCount > 0 ? 'success' : 'error' }
      );
      
      // Atualizar lista
      await fetchRooms();
      setSelectedRooms([]);
      setBatchDialogOpen(false);
    } catch (err) {
      enqueueSnackbar('Erro ao gerar QR Codes em lote', { variant: 'error' });
    } finally {
      setGenerating(false);
      setGenerateProgress(0);
    }
  };

  if (!isAdmin) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">
          Acesso negado. Apenas administradores podem gerenciar QR Codes.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Cabeçalho */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Gerenciador de QR Codes
            </Typography>
            <Typography color="text.secondary">
              Gere, gerencie e acompanhe QR Codes das salas
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchRooms}
              disabled={loading}
            >
              Atualizar
            </Button>
            
            <Button
              variant="contained"
              startIcon={<BatchPrediction />}
              onClick={() => setBatchDialogOpen(true)}
              disabled={selectedRooms.length === 0}
            >
              Gerar Lote ({selectedRooms.length})
            </Button>
            
            <Button
              variant="contained"
              startIcon={<CloudDownload />}
              onClick={handleGenerateReport}
            >
              Relatório
            </Button>
          </Stack>
        </Stack>

        {/* Estatísticas */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total de Salas
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {stats.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Com QR Code
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {stats.withQR}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Sem QR Code
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="warning.main">
                  {stats.withoutQR}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Cobertura
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" sx={{ mr: 1 }}>
                    {stats.coverage}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={stats.coverage} 
                    sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Ações principais */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleGenerateMissing}
              disabled={stats.withoutQR === 0 || generating}
              color="primary"
            >
              Gerar QR Faltantes ({stats.withoutQR})
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<CloudUpload />}
              onClick={() => navigate('/rooms')}
            >
              Gerenciar Salas
            </Button>
            
            {generating && (
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                <Typography variant="body2">
                  Gerando... {generateProgress}%
                </Typography>
              </Box>
            )}
          </Stack>
        </Paper>

        {/* Filtros e busca */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Buscar por nome, localização ou QR..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />,
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Filtrar por QR</InputLabel>
                <Select
                  value={filter}
                  label="Filtrar por QR"
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <MenuItem value="all">Todas as salas</MenuItem>
                  <MenuItem value="withQR">Com QR Code</MenuItem>
                  <MenuItem value="withoutQR">Sem QR Code</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Ordenar por</InputLabel>
                <Select
                  value={sortBy}
                  label="Ordenar por"
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <MenuItem value="name">Nome</MenuItem>
                  <MenuItem value="type">Tipo</MenuItem>
                  <MenuItem value="location">Localização</MenuItem>
                  <MenuItem value="qrStatus">Status do QR</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSearch('');
                  setFilter('all');
                  setSortBy('name');
                  setSortOrder('asc');
                }}
              >
                Limpar
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Paper>

      {/* Lista de salas */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedRooms.length === filteredRooms.length}
                    indeterminate={selectedRooms.length > 0 && selectedRooms.length < filteredRooms.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
                <TableCell>Sala</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Localização</TableCell>
                <TableCell>QR Code</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredRooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      Nenhuma sala encontrada
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRooms.map((room) => (
                  <TableRow key={room.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedRooms.includes(room.id)}
                        onChange={(e) => handleSelectRoom(room.id, e.target.checked)}
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Room sx={{ color: 'action.active' }} />
                        <Typography fontWeight="medium">
                          {room.name}
                        </Typography>
                      </Stack>
                    </TableCell>
                    
                    <TableCell>
                      <Chip label={room.type} size="small" />
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {room.location}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      {room.qrCode ? (
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {room.qrCode.substring(0, 20)}...
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                          Não gerado
                        </Typography>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {room.qrCode ? (
                        <Chip
                          icon={<CheckCircle />}
                          label="Ativo"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      ) : (
                        <Chip
                          icon={<Warning />}
                          label="Faltando"
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Tooltip title="Gerar QR Code">
                          <IconButton
                            size="small"
                            onClick={() => handleGenerateForRoom(room)}
                            color="primary"
                          >
                            <QrCode />
                          </IconButton>
                        </Tooltip>
                        
                        {room.qrCode && (
                          <>
                            <Tooltip title="Baixar QR Code">
                              <IconButton
                                size="small"
                                onClick={() => handleDownloadQR(room)}
                              >
                                <Download />
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="Imprimir QR Code">
                              <IconButton
                                size="small"
                                onClick={() => handlePrintQR(room)}
                              >
                                <Print />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        
                        <Tooltip title="Ver detalhes">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/rooms/${room.id}`)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Modal de geração de QR Code */}
      <QRGeneratorModal
        open={qrModalOpen}
        onClose={() => {
          setQrModalOpen(false);
          setSelectedRoom(null);
        }}
        room={selectedRoom}
        onSuccess={() => {
          fetchRooms();
          enqueueSnackbar('QR Code gerado com sucesso', { variant: 'success' });
        }}
      />

      {/* Diálogo de geração em lote */}
      <Dialog open={batchDialogOpen} onClose={() => setBatchDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Gerar QR Codes em Lote
        </DialogTitle>
        
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Você selecionou <strong>{selectedRooms.length}</strong> salas para gerar QR Codes.
              Esta ação pode levar alguns minutos.
            </Typography>
          </Alert>
          
          <Typography variant="body2" color="text.secondary">
            Deseja continuar?
          </Typography>
          
          {generating && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Progresso: {generateProgress}%
              </Typography>
              <LinearProgress variant="determinate" value={generateProgress} />
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setBatchDialogOpen(false)} disabled={generating}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleGenerateBatch}
            disabled={generating}
            startIcon={generating ? <CircularProgress size={20} /> : null}
          >
            {generating ? 'Gerando...' : 'Gerar QR Codes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de relatório */}
      <Dialog open={reportDialogOpen} onClose={() => setReportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Relatório de QR Codes
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body2" paragraph>
            Selecione as opções para gerar o relatório:
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Formato</InputLabel>
                <Select defaultValue="csv" label="Formato">
                  <MenuItem value="csv">CSV (Excel)</MenuItem>
                  <MenuItem value="pdf">PDF</MenuItem>
                  <MenuItem value="json">JSON</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Conteúdo</InputLabel>
                <Select defaultValue="all" label="Conteúdo">
                  <MenuItem value="all">Todas as salas</MenuItem>
                  <MenuItem value="withQR">Apenas com QR Code</MenuItem>
                  <MenuItem value="withoutQR">Apenas sem QR Code</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Incluir detalhes da sala"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Incluir histórico de geração"
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setReportDialogOpen(false)}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleGenerateReport}>
            Gerar Relatório
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default QRManager;