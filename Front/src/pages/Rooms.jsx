// src/pages/Rooms.jsx - CÓimplementa??o atual
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  LinearProgress,
  Stack,
  IconButton,
  InputAdornment,
  Snackbar,
  Tooltip,
  Badge,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList,
  Print,
  Download,
  Search,
  QrCode as QrCodeIcon,
  ContentCopy,
  Close,
  Refresh,
  PendingActions,
  AccessTime,
  CheckCircle,
  Warning,
  MeetingRoom,
  Bathroom,
  Kitchen,
  CleaningServices,
  Room as RoomIcon,
  LocationOn,
  TypeSpecimen,
  Check,
  Error as ErrorIcon,
  PhotoCamera,
  CloudDownload,
  Share,
  ZoomIn,
  ZoomOut,
  ColorLens,
  TextFields,
  BatchPrediction,
  Image,
  Edit,
  Delete,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import roomService from '../services/roomService';
import QRImageModal from '../components/common/QRImageModal'; // ✅ NOVO COMPONENTE

// ----
// Modal de confirmação (delete)
// ----
const DeleteConfirmationModal = ({ open, onClose, onConfirm, room }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ color: 'error.main' }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Warning />
          Confirmar Exclusão
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body1" gutterBottom>
          Tem certeza que deseja excluir permanentemente o ambiente:
        </Typography>

        <Alert severity="warning" sx={{ my: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {room?.name}
          </Typography>
          <Typography variant="body2">
            {room?.location} • {room?.type}
          </Typography>
        </Alert>

        {room?.stats?.totalCleanings > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Atenção:</strong> Este ambiente possui {room.stats.totalCleanings} registro(s) histórico(s) de limpeza.
              <br />
              <strong>Como administrador, você pode deletá-lo mesmo com registros.</strong>
            </Typography>
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary">
          Esta ação não pode ser desfeita.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="outlined">
          Cancelar
        </Button>
        <Button onClick={onConfirm} variant="contained" color="error">
          Confirmar Exclusão
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ----
// Modal QR (copiar + imprimir) - ATUALIZADO
// ----
const QRModal = ({ open, onClose, room }) => {
  const [qrImage, setQrImage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const qr = room?.qrCode || room?.qr || room?.code || '';

  const generateQRImage = async () => {
    try {
      setLoading(true);
      // Aqui você poderia chamar o backend para gerar a imagem
      // Por enquanto vamos usar um placeholder
      setQrImage(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qr)}`);
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && room?.qrCode) {
      generateQRImage();
    }
  }, [open, room]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(qr);
      alert('QR Code copiado para a área de transferência!');
    } catch {
      const el = document.createElement('textarea');
      el.value = qr;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      alert('QR Code copiado para a área de transferência!');
    }
  };

  const printQR = () => {
    const title = `${room?.name || 'Ambiente'} — QR`;
    const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px; 
              text-align: center;
            }
            .box { 
              border: 2px solid #1976d2; 
              padding: 30px; 
              border-radius: 15px; 
              max-width: 500px;
              margin: 0 auto;
            }
            .name { 
              font-size: 24px; 
              font-weight: 800; 
              margin-bottom: 8px; 
              color: #1976d2;
            }
            .meta { 
              color: #444; 
              margin-bottom: 18px; 
              font-size: 14px;
            }
            .qr-code { 
              font-family: monospace; 
              font-size: 18px; 
              background: #f5f5f5; 
              padding: 10px; 
              border-radius: 5px; 
              word-break: break-all; 
              margin: 20px 0;
            }
            .instructions { 
              margin-top: 18px; 
              font-size: 12px; 
              color: #666; 
              border-top: 1px solid #eee; 
              padding-top: 10px;
            }
            .qr-image {
              width: 200px;
              height: 200px;
              margin: 20px auto;
              display: block;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="box">
            <div class="name">${room?.name || 'Ambiente'}</div>
            <div class="meta">${room?.location || ''} • ${room?.type || ''}</div>
            
            ${qrImage ? `<img src="${qrImage}" alt="QR Code" class="qr-image" />` : ''}
            
            <div class="qr-code">
              ${qr || 'SEM QR'}
            </div>
            <div class="instructions">
              Escaneie este código com o aplicativo para iniciar a limpeza<br>
              Sistema Neuropsicocentro • ${new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
          <div class="no-print" style="margin-top: 30px;">
            <button onclick="window.print(); window.close()" style="
              padding: 10px 20px;
              background: #1976d2;
              color: white;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-size: 16px;
            ">
              Imprimir QR Code
            </button>
          </div>
          <script>
            // Auto-print on page load
            window.onload = function() {
              setTimeout(() => {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) {
      alert('Permita pop-ups para imprimir o QR Code');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <QrCodeIcon />
            <Typography sx={{ fontWeight: 900 }}>QR do Ambiente</Typography>
          </Stack>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Paper sx={{ p: 2.2, borderRadius: 3 }}>
          <Typography sx={{ fontWeight: 900 }}>{room?.name || 'Ambiente'}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {room?.location || '—'} • {room?.type || '—'}
          </Typography>

          <Paper
            sx={{
              p: 2,
              borderRadius: 3,
              border: '1px dashed rgba(0,0,0,0.20)',
              bgcolor: 'rgba(0,0,0,0.02)',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Código QR
            </Typography>
            <Typography
              sx={{
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: 1,
                mt: 0.5,
                wordBreak: 'break-word',
              }}
            >
              {qr || '—'}
            </Typography>

            {loading ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <CircularProgress size={24} />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Gerando imagem do QR Code...
                </Typography>
              </Box>
            ) : qrImage ? (
              <Box sx={{ textAlign: 'center', my: 2 }}>
                <img 
                  src={qrImage} 
                  alt="QR Code" 
                  style={{ 
                    width: '150px', 
                    height: '150px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px'
                  }} 
                />
              </Box>
            ) : null}

            <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
              <Button variant="contained" startIcon={<ContentCopy />} onClick={copy} sx={{ borderRadius: 3 }}>
                Copiar
              </Button>
              <Button variant="outlined" startIcon={<Print />} onClick={printQR} sx={{ borderRadius: 3 }}>
                Imprimir
              </Button>
            </Stack>
          </Paper>

          <Alert severity="info" sx={{ mt: 2 }}>
            Este código ajuda a localizar o ambiente rapidamente e manter rastreabilidade para auditoria.
          </Alert>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 3 }}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ----
// Página Rooms - ATUALIZADA
// ----
const Rooms = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, room: null });
  const [qrModal, setQrModal] = useState({ open: false, room: null });
  const [qrImageModal, setQrImageModal] = useState({ open: false, room: null }); // ✅ NOVO MODAL

  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [showOnlyNeedsCleaning, setShowOnlyNeedsCleaning] = useState(false);
  const [search, setSearch] = useState('');

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [toast, setToast] = useState({ open: false, msg: '', type: 'success' });

  const [selectedRoom, setSelectedRoom] = useState(null);

  //  Estado da nova sala
  const [newRoom, setNewRoom] = useState({
    name: '',
    type: 'ROOM',
    location: '',
    qrCode: '',
    priority: 'MEDIUM',
    description: '',
  });

  useEffect(() => {
    fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterType, showOnlyNeedsCleaning, tabValue]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError('');

      let params = {};

      if (filterStatus !== 'ALL') params.status = filterStatus;
      if (filterType !== 'ALL') params.type = filterType;

      if (showOnlyNeedsCleaning) {
        params.status = 'PENDING';
        params.needsCleaning = true;
      }

      if (tabValue > 0) {
        const types = ['ROOM', 'BATHROOM', 'KITCHEN', 'MEETING_ROOM'];
        params.type = types[tabValue - 1];
      }

      const response = await roomService.getRooms(params);

      if (response.success) {
        setRooms(response.data || []);
      } else {
        setError(response.error || 'Erro ao carregar ambientes');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
      console.error('Erro ao carregar salas:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateQrCode = () => {
    // QR simples e consistente
    const base = `${newRoom.type}-${newRoom.name}-${newRoom.location}`
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '-')
      .replace(/[^A-Z0-9\-]/g, '');
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `QR-${base}-${suffix}`.slice(0, 48);
  };

  const handleOpenDialog = (room = null) => {
    setSelectedRoom(room);

    if (room) {
      setNewRoom({
        name: room.name || '',
        type: room.type || 'ROOM',
        location: room.location || '',
        qrCode: room.qrCode || '',
        priority: room.priority || 'MEDIUM',
        description: room.notes || room.description || '',
      });
    } else {
      setNewRoom({
        name: '',
        type: 'ROOM',
        location: '',
        qrCode: '', // Deixa vazio, o backend gera automaticamente
        priority: 'MEDIUM',
        description: '',
      });
    }

    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedRoom(null);
  };

  //  FUNÇÃO ajustada PARA SALVAR SALA
  const handleSaveRoom = async () => {
    try {
      setSubmitting(true);
      setError('');

      //  validação local
      if (!newRoom.name?.trim() || !newRoom.type?.trim() || !newRoom.location?.trim()) {
        setError('Preencha Nome, Tipo e Localização.');
        return;
      }

      //  Se não tiver QR Code, gera automaticamente
      const qrCodeToSave = newRoom.qrCode?.trim() || generateQrCode();

      //  backend usa notes (não description)
      const payload = {
        name: newRoom.name.trim(),
        type: newRoom.type,
        location: newRoom.location.trim(),
        qrCode: qrCodeToSave, // ✅ Garante que sempre tem QR Code
        priority: newRoom.priority,
        notes: newRoom.description?.trim() || null,
      };

      console.log('📤 Enviando sala com QR Code:', qrCodeToSave);

      let response;
      if (selectedRoom) {
        response = await roomService.updateRoom(selectedRoom.id, payload);
      } else {
        response = await roomService.createRoom(payload);
      }

      if (response.success) {
        //  VERIFICA SE RETORNOU IMAGEM DO QR CODE
        if (response.qrImage) {
          console.log('✅ QR Code IMAGEM gerada com sucesso!');
          // Você pode exibir a imagem aqui se quiser
        }
        
        handleCloseDialog();
        setToast({
          open: true,
          type: 'success',
          msg: selectedRoom ? 'Ambiente atualizado com sucesso!' : 'Ambiente criado com sucesso! QR Code gerado automaticamente.',
        });
        fetchRooms();
      } else {
        setError(response.error || 'Erro ao salvar ambiente');
      }
    } catch (err) {
      setError('Erro ao salvar ambiente: ' + (err.message || 'Erro desconhecido'));
      console.error('Erro ao salvar sala:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoom = async (room) => {
    setDeleteModal({ open: true, room });
  };

  const confirmDelete = async () => {
    try {
      const { room } = deleteModal;
      setError('');

      const response = await roomService.deleteRoom(room.id);

      if (response.success) {
        setDeleteModal({ open: false, room: null });
        fetchRooms();

        const message =
          room.stats?.totalCleanings > 0
            ? `Ambiente "${room.name}" e seus ${room.stats.totalCleanings} registros foram excluídos!`
            : `Ambiente "${room.name}" excluído com sucesso!`;

        setToast({ open: true, type: 'success', msg: message });
      } else {
        setError(response.error || 'Erro ao excluir ambiente');
      }
    } catch (err) {
      console.error('Erro ao excluir sala:', err);
      setError('Erro ao excluir ambiente. Verifique sua conexão.');
    }
  };

  const handleStartCleaning = (roomId) => {
    navigate(`/worker?room=${roomId}&action=start`);
  };

  const handleCompleteCleaning = (roomId) => {
    navigate(`/worker?room=${roomId}&action=complete`);
  };

  const openQR = (room) => setQrModal({ open: true, room });
  const openQRImage = (room) => setQrImageModal({ open: true, room }); // ✅ NOVA FUNÇÃO

  const exportJson = () => {
    const dataStr = JSON.stringify(rooms, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `ambientes-${format(new Date(), 'yyyy-MM-dd')}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const countByStatus = useMemo(() => {
    const base = { PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0, NEEDS_ATTENTION: 0 };
    (rooms || []).forEach((r) => {
      if (base[r.status] !== undefined) base[r.status] += 1;
    });
    return base;
  }, [rooms]);

  const statusCards = useMemo(() => {
    return [
      { key: 'PENDING', label: 'Pendentes', icon: <PendingActions />, color: 'warning', value: countByStatus.PENDING },
      { key: 'IN_PROGRESS', label: 'Em andamento', icon: <AccessTime />, color: 'info', value: countByStatus.IN_PROGRESS },
      { key: 'COMPLETED', label: 'Concluídos', icon: <CheckCircle />, color: 'success', value: countByStatus.COMPLETED },
      { key: 'NEEDS_ATTENTION', label: 'Atenção', icon: <Warning />, color: 'error', value: countByStatus.NEEDS_ATTENTION },
    ];
  }, [countByStatus]);

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();

    return (rooms || []).filter((room) => {
      if (filterStatus !== 'ALL' && room.status !== filterStatus) return false;
      if (filterType !== 'ALL' && room.type !== filterType) return false;
      if (showOnlyNeedsCleaning && room.status !== 'PENDING') return false;

      if (!q) return true;

      const hay = `${room.name || ''} ${room.location || ''} ${room.type || ''} ${room.qrCode || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rooms, filterStatus, filterType, showOnlyNeedsCleaning, search]);

  const empty = !loading && filteredRooms.length === 0;

  const tabIcon = (idx) => {
    switch (idx) {
      case 1:
        return <CleaningServices />;
      case 2:
        return <Bathroom />;
      case 3:
        return <Kitchen />;
      case 4:
        return <MeetingRoom />;
      default:
        return null;
    }
  };

  if (loading && rooms.length === 0) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Paper sx={{ p: 2.5, borderRadius: 3, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              Ambientes
            </Typography>
            <Typography color="text.secondary">
              {isAdmin
                ? 'Cadastre, gerencie e acompanhe status de limpeza com rastreabilidade.'
                : 'Visualize ambientes e status para execução da limpeza.'}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchRooms} disabled={loading} sx={{ borderRadius: 3 }}>
              Atualizar
            </Button>

            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setShowOnlyNeedsCleaning((v) => !v)}
              sx={{ borderRadius: 3 }}
            >
              {showOnlyNeedsCleaning ? 'Mostrar todos' : 'Apenas pendentes'}
            </Button>

            <Button startIcon={<Print />} variant="outlined" onClick={() => window.print()} sx={{ borderRadius: 3 }}>
              Imprimir
            </Button>

            <Button startIcon={<Download />} variant="outlined" onClick={exportJson} sx={{ borderRadius: 3 }}>
              Exportar
            </Button>

            {isAdmin && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} sx={{ borderRadius: 3 }}>
                Novo ambiente
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {statusCards.map((c) => (
          <Grid item xs={6} md={3} key={c.key}>
            <Paper sx={{ p: 2, borderRadius: 3, border: '1px solid rgba(0,0,0,0.06)' }}>
              <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 800 }}>
                    {c.label}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900 }}>
                    {c.value}
                  </Typography>
                </Box>
                <Chip icon={c.icon} label={c.key} color={c.color} sx={{ fontWeight: 900 }} />
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2.2, borderRadius: 3, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar por nome, localização ou QR..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
                <MenuItem value="ALL">Todos</MenuItem>
                <MenuItem value="PENDING">Pendentes</MenuItem>
                <MenuItem value="IN_PROGRESS">Em andamento</MenuItem>
                <MenuItem value="COMPLETED">Concluídos</MenuItem>
                <MenuItem value="NEEDS_ATTENTION">Atenção</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo</InputLabel>
              <Select value={filterType} label="Tipo" onChange={(e) => setFilterType(e.target.value)}>
                <MenuItem value="ALL">Todos</MenuItem>
                <MenuItem value="ROOM">Salas</MenuItem>
                <MenuItem value="BATHROOM">Banheiros</MenuItem>
                <MenuItem value="KITCHEN">Cozinhas</MenuItem>
                <MenuItem value="MEETING_ROOM">Reunião</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                setSearch('');
                setFilterStatus('ALL');
                setFilterType('ALL');
                setShowOnlyNeedsCleaning(false);
                setTabValue(0);
              }}
              sx={{ borderRadius: 3 }}
            >
              Limpar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ mb: 2, borderRadius: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} variant="scrollable" scrollButtons="auto" sx={{ px: 2 }}>
          <Tab label="Todos" />
          <Tab label="Salas" icon={tabIcon(1)} iconPosition="start" />
          <Tab label="Banheiros" icon={tabIcon(2)} iconPosition="start" />
          <Tab label="Cozinhas" icon={tabIcon(3)} iconPosition="start" />
          <Tab label="Reunião" icon={tabIcon(4)} iconPosition="start" />
        </Tabs>
      </Paper>

      {loading ? <LinearProgress sx={{ my: 2 }} /> : null}

      <Grid container spacing={2.2}>
        {filteredRooms.map((room) => (
          <Grid item xs={12} md={6} lg={4} key={room.id}>
            <Paper sx={{ 
              p: 2, 
              borderRadius: 2, 
              height: '100%',
              border: room.qrCode ? '1px solid #e0e0e0' : '2px dashed #ff9800',
              position: 'relative',
              '&:hover': {
                boxShadow: 3,
                borderColor: room.qrCode ? '#1976d2' : '#ff9800'
              }
            }}>
              {/* Indicador de QR Code */}
              {!room.qrCode && (
                <Box sx={{ 
                  position: 'absolute', 
                  top: 8, 
                  right: 8,
                  bgcolor: '#fff8e1',
                  borderRadius: '50%',
                  p: 0.5
                }}>
                  <Warning color="warning" fontSize="small" />
                </Box>
              )}
              
              <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <Avatar sx={{ 
                  bgcolor: room.qrCode ? '#4caf50' : '#ff9800',
                  width: 56,
                  height: 56
                }}>
                  {room.type === 'BATHROOM' ? <Bathroom /> :
                   room.type === 'KITCHEN' ? <Kitchen /> :
                   room.type === 'MEETING_ROOM' ? <MeetingRoom /> :
                   <CleaningServices />}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" fontWeight="bold">
                    {room.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LocationOn fontSize="small" />
                    {room.location}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1} mb={2}>
                <Chip label={room.type} size="small" />
                <Chip 
                  label={room.status} 
                  size="small"
                  color={
                    room.status === 'COMPLETED' ? 'success' :
                    room.status === 'IN_PROGRESS' ? 'info' :
                    room.status === 'NEEDS_ATTENTION' ? 'error' : 'warning'
                  }
                />
                {room.qrCode && (
                  <Chip 
                    label="QR" 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                    icon={<QrCodeIcon fontSize="small" />}
                  />
                )}
              </Stack>

              {/* QR Code Info */}
              <Paper sx={{ 
                p: 1, 
                mb: 2, 
                bgcolor: '#f5f5f5',
                borderRadius: 1
              }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  QR Code:
                </Typography>
                <Typography variant="body2" sx={{ 
                  fontFamily: 'monospace',
                  fontWeight: room.qrCode ? 'bold' : 'normal',
                  color: room.qrCode ? 'text.primary' : 'text.secondary'
                }}>
                  {room.qrCode ? `${room.qrCode.substring(0, 20)}...` : 'Não gerado'}
                </Typography>
              </Paper>

              {/* Ações */}
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {isAdmin && (
                  <>
                    <Tooltip title="Ver QR Code">
                      <IconButton 
                        size="small" 
                        onClick={() => openQR(room)}
                        color="primary"
                      >
                        <QrCodeIcon />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Imagem QR Code">
                      <IconButton 
                        size="small" 
                        onClick={() => openQRImage(room)}
                        color="secondary"
                      >
                        <Image />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Editar ambiente">
                      <IconButton 
                        size="small" 
                        onClick={() => handleOpenDialog(room)}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Excluir ambiente">
                      <IconButton 
                        size="small" 
                        onClick={() => handleDeleteRoom(room)}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
                
                <Box sx={{ flexGrow: 1 }} />
                
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => handleStartCleaning(room.id)}
                  disabled={room.status === 'IN_PROGRESS'}
                >
                  {room.status === 'IN_PROGRESS' ? 'Em limpeza' : 'Iniciar limpeza'}
                </Button>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {empty && (
        <Paper sx={{ p: 4, textAlign: 'center', mt: 2, borderRadius: 3 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontWeight: 900 }}>
            Nenhum ambiente encontrado
          </Typography>
          <Typography color="text.secondary">Ajuste filtros ou pesquisa para encontrar o que precisa.</Typography>
        </Paper>
      )}

      {/* Modal QR Simples */}
      <QRModal open={qrModal.open} onClose={() => setQrModal({ open: false, room: null })} room={qrModal.room} />

      {/* ✅ NOVO Modal QR Image */}
      <QRImageModal 
        open={qrImageModal.open} 
        onClose={() => setQrImageModal({ open: false, room: null })} 
        room={qrImageModal.room}
        title="Imagem do QR Code"
      />

      <DeleteConfirmationModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, room: null })}
        onConfirm={confirmDelete}
        room={deleteModal.room}
      />

      {/* Modal de Edição/Criação */}
      {isAdmin && (
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 900 }}>{selectedRoom ? 'Editar Ambiente' : 'Novo Ambiente'}</DialogTitle>

          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField 
                fullWidth 
                label="Nome do Ambiente" 
                value={newRoom.name} 
                onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })} 
                required
              />

              <FormControl fullWidth required>
                <InputLabel>Tipo</InputLabel>
                <Select value={newRoom.type} label="Tipo" onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value })}>
                  <MenuItem value="ROOM">Sala</MenuItem>
                  <MenuItem value="BATHROOM">Banheiro</MenuItem>
                  <MenuItem value="KITCHEN">Cozinha</MenuItem>
                  <MenuItem value="MEETING_ROOM">Sala de Reunião</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Localização"
                value={newRoom.location}
                onChange={(e) => setNewRoom({ ...newRoom, location: e.target.value })}
                placeholder="Ex: 1º Andar - Ala Leste"
                required
              />

              {/* ✅ CAMPO QR CODE (OPCIONAL - Se vazio, o backend gera automaticamente) */}
              <TextField
                fullWidth
                label="QR Code do Ambiente"
                value={newRoom.qrCode}
                onChange={(e) => setNewRoom({ ...newRoom, qrCode: e.target.value })}
                placeholder="Ex: QR-SALA-102 (deixe em branco para gerar automaticamente)"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <QrCodeIcon />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        size="small"
                        variant="outlined"
                        sx={{ borderRadius: 2, fontWeight: 900 }}
                        onClick={() => setNewRoom((prev) => ({ ...prev, qrCode: prev.qrCode?.trim() ? prev.qrCode : generateQrCode() }))}
                      >
                        Gerar
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />

              <FormControl fullWidth>
                <InputLabel>Prioridade</InputLabel>
                <Select value={newRoom.priority} label="Prioridade" onChange={(e) => setNewRoom({ ...newRoom, priority: e.target.value })}>
                  <MenuItem value="LOW">Baixa</MenuItem>
                  <MenuItem value="MEDIUM">Média</MenuItem>
                  <MenuItem value="HIGH">Alta</MenuItem>
                  <MenuItem value="URGENT">Urgente</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Descrição/Observações"
                value={newRoom.description}
                onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                multiline
                rows={3}
                placeholder="Observações sobre o ambiente..."
              />
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleCloseDialog} disabled={submitting} variant="outlined" sx={{ borderRadius: 3 }}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRoom} variant="contained" disabled={submitting} sx={{ borderRadius: 3 }}>
              {submitting ? <CircularProgress size={24} /> : selectedRoom ? 'Atualizar' : 'Salvar'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <Snackbar 
        open={toast.open} 
        autoHideDuration={3500} 
        onClose={() => setToast((t) => ({ ...t, open: false }))} 
        message={toast.msg} 
      />
    </Box>
  );
};

export default Rooms;