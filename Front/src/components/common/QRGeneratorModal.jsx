// src/components/common/QRGeneratorModal.jsx - VERSÃO FINAL CORRIGIDA
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  IconButton,
  Snackbar,
  Divider,
  Paper,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
  RadioGroup,
  Radio,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Tooltip,
  Badge,
  Avatar,
} from '@mui/material';
import {
  QrCode,
  Download,
  Print,
  ContentCopy,
  Close,
  Refresh,
  CheckCircle,
  Warning,
  Image,
  ListAlt,
  BatchPrediction,
  Room,
  LocationOn,
  TypeSpecimen,
  Check,
  Error,
  PhotoCamera,
  CloudDownload,
  CloudUpload,
  Share,
  ZoomIn,
  ZoomOut,
  ColorLens,
  TextFields,
} from '@mui/icons-material';
import QRCode from 'qrcode';
import roomService from '../../services/roomService';
import qrService from '../../services/qrService';
import { useSnackbar } from 'notistack';

const QRGeneratorModal = ({ 
  open, 
  onClose, 
  room, 
  rooms = [], 
  title = "Gerar QR Code",
  onSuccess,
  mode = 'single'
}) => {
  const { enqueueSnackbar } = useSnackbar();
  
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [qrData, setQrData] = useState(null);
  const [size, setSize] = useState(300);
  const [format, setFormat] = useState('png');
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [generatedBatch, setGeneratedBatch] = useState([]);
  const [toast, setToast] = useState({ open: false, message: '', type: 'success' });
  const [options, setOptions] = useState({
    includeLogo: false,
    includeText: true,
    color: '#1976d2',
    backgroundColor: '#ffffff',
    margin: 2,
    errorCorrection: 'H',
  });
  const [progress, setProgress] = useState(0);
  const [allRooms, setAllRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [search, setSearch] = useState('');
  const [roomFilter, setRoomFilter] = useState('all');

  useEffect(() => {
    if (open && mode === 'batch') {
      fetchAllRooms();
    }
  }, [open, mode]);

  const fetchAllRooms = async () => {
    try {
      setLoading(true);
      const response = await roomService.getRooms();
      if (response.success) {
        setAllRooms(response.data || []);
        setFilteredRooms(response.data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar salas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!allRooms.length) return;
    let filtered = [...allRooms];
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter(room =>
        room.name.toLowerCase().includes(query) ||
        room.location.toLowerCase().includes(query) ||
        room.type.toLowerCase().includes(query) ||
        (room.qrCode && room.qrCode.toLowerCase().includes(query))
      );
    }
    if (roomFilter !== 'all') {
      filtered = filtered.filter(room => 
        roomFilter === 'withQR' ? room.qrCode : !room.qrCode
      );
    }
    setFilteredRooms(filtered);
  }, [allRooms, search, roomFilter]);

  // ======================================================================
  // ✅ FUNÇÃO CORRIGIDA - GERA QR CODE COM URL (NÃO JSON!)
  // ======================================================================
  const generateQRForRoom = async (roomData) => {
    try {
      setGenerating(true);
      setError('');
      setQrImage('');

      console.log(`🔳 Gerando QR Code para: ${roomData.name}`);

      // ✅ URL CORRETA que vai no QR Code
      const baseUrl = process.env.REACT_APP_FRONTEND_URL || 'https://gest-o-de-limpeza.onrender.com';
      const qrCodeValue = roomData.qrCode || `QR-${roomData.type}-${roomData.name}-${Date.now()}`;
      const qrContent = `${baseUrl}/scan?roomId=${roomData.id}&qr=${encodeURIComponent(qrCodeValue)}`;
      
      console.log(`✅ URL GERADA: ${qrContent}`);

      const qrOptions = {
        errorCorrectionLevel: options.errorCorrection,
        margin: options.margin,
        width: size,
        color: {
          dark: options.color,
          light: options.backgroundColor
        }
      };

      // ✅ Gerar QR Code com a URL
      const image = await QRCode.toDataURL(qrContent, qrOptions);

      setQrImage(image);
      setQrData({
        url: qrContent,
        roomId: roomData.id,
        roomName: roomData.name,
        qrCode: qrCodeValue,
        generatedAt: new Date().toISOString()
      });

      setSuccess(`QR Code gerado com sucesso para ${roomData.name}!`);
      enqueueSnackbar(`QR Code gerado para ${roomData.name}`, { variant: 'success' });
      
      if (onSuccess) {
        onSuccess({
          room: roomData,
          qrImage: image,
          qrData: { url: qrContent }
        });
      }
    } catch (err) {
      console.error('Erro ao gerar QR Code:', err);
      setError('Erro ao gerar QR Code: ' + err.message);
      enqueueSnackbar('Erro ao gerar QR Code', { variant: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  // ======================================================================
  // ✅ FUNÇÃO CORRIGIDA - GERA LOTE COM URL (NÃO JSON!)
  // ======================================================================
  const generateBatchQRCodes = async () => {
    if (selectedRooms.length === 0) {
      setError('Selecione pelo menos uma sala');
      return;
    }

    try {
      setGenerating(true);
      setError('');
      setGeneratedBatch([]);
      setProgress(0);

      const results = [];
      const total = selectedRooms.length;
      const baseUrl = process.env.REACT_APP_FRONTEND_URL || 'https://gest-o-de-limpeza.onrender.com';

      for (let i = 0; i < selectedRooms.length; i++) {
        const roomId = selectedRooms[i];
        const roomData = allRooms.find(r => r.id === roomId);
        
        if (roomData) {
          try {
            const qrCodeValue = roomData.qrCode || `QR-${roomData.type}-${roomData.name}-${Date.now()}`;
            const qrContent = `${baseUrl}/scan?roomId=${roomData.id}&qr=${encodeURIComponent(qrCodeValue)}`;

            const image = await QRCode.toDataURL(qrContent, {
              errorCorrectionLevel: 'H',
              margin: 1,
              width: 200,
              color: {
                dark: '#1976d2',
                light: '#ffffff'
              }
            });

            results.push({
              success: true,
              room: roomData,
              qrImage: image,
              url: qrContent
            });
          } catch (roomError) {
            results.push({
              success: false,
              room: roomData,
              error: roomError.message
            });
          }
        }
        setProgress(Math.round(((i + 1) / total) * 100));
      }

      setGeneratedBatch(results);
      
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;
      
      setSuccess(`Lote concluído: ${successCount} sucessos, ${failedCount} falhas`);
      enqueueSnackbar(`QR Codes gerados: ${successCount} sucessos`, { variant: 'success' });
    } catch (err) {
      setError('Erro ao gerar QR Codes em lote: ' + err.message);
      enqueueSnackbar('Erro ao gerar QR Codes', { variant: 'error' });
    } finally {
      setGenerating(false);
      setProgress(0);
    }
  };

  const handleDownload = async () => {
    if (!qrImage) {
      setError('Gere um QR Code primeiro');
      return;
    }

    try {
      const roomName = room?.name || 'sala';
      const fileName = `QR-${roomName.replace(/\s+/g, '-')}-${Date.now()}.png`;
      
      const link = document.createElement('a');
      link.href = qrImage;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      enqueueSnackbar('QR Code baixado com sucesso', { variant: 'success' });
    } catch (err) {
      setError('Erro ao baixar QR Code');
      enqueueSnackbar('Erro ao baixar QR Code', { variant: 'error' });
    }
  };

  const handleCopy = async () => {
    if (!qrImage) {
      setError('Gere um QR Code primeiro');
      return;
    }

    try {
      const response = await fetch(qrImage);
      const blob = await response.blob();
      
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      
      enqueueSnackbar('QR Code copiado para área de transferência', { variant: 'success' });
    } catch (err) {
      console.error('Erro ao copiar QR Code:', err);
      enqueueSnackbar('Erro ao copiar QR Code', { variant: 'error' });
    }
  };

  const handlePrint = () => {
    if (!qrImage) {
      setError('Gere um QR Code primeiro');
      return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${room?.name || 'Sala'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
            .qr-container { border: 2px solid #1976d2; padding: 30px; border-radius: 15px; display: inline-block; margin: 20px auto; }
            .room-name { font-size: 24px; font-weight: bold; color: #1976d2; margin-bottom: 10px; }
            .room-info { color: #666; margin-bottom: 20px; font-size: 14px; }
            .qr-image { width: 300px; height: 300px; }
            .instructions { font-size: 12px; color: #888; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
            @media print { body { padding: 0; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="room-name">${room?.name || 'Sala'}</div>
            <div class="room-info">${room?.type || ''} • ${room?.location || ''}</div>
            <img src="${qrImage}" alt="QR Code" class="qr-image" />
            <div class="instructions">
              Escaneie este código para iniciar a limpeza<br>
              Sistema Neuropsicocentro • ${new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
          <div class="no-print" style="margin-top: 30px;">
            <button onclick="window.print(); window.close()" style="padding: 10px 20px; background: #1976d2; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
              Imprimir QR Code
            </button>
          </div>
          <script>window.onload = function() { setTimeout(() => { window.print(); }, 500); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRooms(filteredRooms.map(room => room.id));
    } else {
      setSelectedRooms([]);
    }
  };

  const handleRoomSelect = (roomId, checked) => {
    if (checked) {
      setSelectedRooms(prev => [...prev, roomId]);
    } else {
      setSelectedRooms(prev => prev.filter(id => id !== roomId));
    }
  };

  const handleGenerate = async () => {
    if (mode === 'single' && room) {
      await generateQRForRoom(room);
    } else if (mode === 'batch') {
      await generateBatchQRCodes();
    }
  };

  const handleClose = () => {
    setQrImage('');
    setQrData(null);
    setError('');
    setSuccess('');
    setSelectedRooms([]);
    setGeneratedBatch([]);
    setProgress(0);
    onClose();
  };

  const renderSingleMode = () => (
    <Box>
      {room && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ bgcolor: '#1976d2' }}>
              <Room />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {room.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {room.type} • {room.location}
              </Typography>
              {room.qrCode && (
                <Chip 
                  size="small" 
                  label={`QR: ${room.qrCode}`} 
                  sx={{ mt: 1 }}
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
          </Stack>
        </Paper>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Tamanho (px)"
            type="number"
            value={size}
            onChange={(e) => setSize(Math.min(1000, Math.max(100, parseInt(e.target.value) || 300)))}
            InputProps={{ inputProps: { min: 100, max: 1000 } }}
          />
        </Grid>
        <Grid item xs={6}>
          <FormControl fullWidth>
            <InputLabel>Formato</InputLabel>
            <Select value={format} label="Formato" onChange={(e) => setFormat(e.target.value)}>
              <MenuItem value="png">PNG</MenuItem>
              <MenuItem value="svg">SVG</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {qrImage ? (
        <Box sx={{ textAlign: 'center', my: 3 }}>
          <Paper sx={{ p: 2, display: 'inline-block', border: '1px solid #ddd' }}>
            <img src={qrImage} alt="QR Code" style={{ width: '200px', height: '200px' }} />
          </Paper>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            QR Code gerado com URL
          </Typography>
          <Typography variant="caption" color="primary" display="block" sx={{ mt: 1, wordBreak: 'break-all' }}>
            {qrData?.url}
          </Typography>
        </Box>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center', my: 3, bgcolor: '#fafafa' }}>
          <QrCode sx={{ fontSize: 60, color: '#ddd', mb: 2 }} />
          <Typography color="text.secondary">
            Clique em "Gerar QR Code" para criar
          </Typography>
        </Paper>
      )}
    </Box>
  );

  const renderBatchMode = () => (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar salas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          
          <Stack direction="row" spacing={2}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Filtrar por</InputLabel>
              <Select
                value={roomFilter}
                label="Filtrar por"
                onChange={(e) => setRoomFilter(e.target.value)}
              >
                <MenuItem value="all">Todas as salas</MenuItem>
                <MenuItem value="withQR">Com QR Code</MenuItem>
                <MenuItem value="withoutQR">Sem QR Code</MenuItem>
              </Select>
            </FormControl>
            
            <Button size="small" onClick={() => { setSearch(''); setRoomFilter('all'); }}>
              Limpar
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ maxHeight: 300, overflow: 'auto', mb: 2 }}>
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : filteredRooms.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">Nenhuma sala encontrada</Typography>
          </Box>
        ) : (
          <List dense>
            <ListItem>
              <ListItemIcon>
                <Checkbox
                  edge="start"
                  checked={selectedRooms.length === filteredRooms.length}
                  indeterminate={selectedRooms.length > 0 && selectedRooms.length < filteredRooms.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </ListItemIcon>
              <ListItemText 
                primary={`Selecionar todas (${selectedRooms.length}/${filteredRooms.length})`}
                secondary={`${filteredRooms.length} salas encontradas`}
              />
            </ListItem>
            <Divider />
            {filteredRooms.map((roomItem) => (
              <ListItem key={roomItem.id}>
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={selectedRooms.includes(roomItem.id)}
                    onChange={(e) => handleRoomSelect(roomItem.id, e.target.checked)}
                  />
                </ListItemIcon>
                <ListItemIcon>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: roomItem.qrCode ? '#4caf50' : '#ff9800' }}>
                    {roomItem.qrCode ? <Check /> : <Warning />}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={roomItem.name}
                  secondary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip size="small" label={roomItem.type} />
                      <Typography variant="caption" color="text.secondary">
                        {roomItem.location}
                      </Typography>
                    </Stack>
                  }
                />
                <Chip 
                  size="small" 
                  label={roomItem.qrCode ? 'Tem QR' : 'Sem QR'} 
                  color={roomItem.qrCode ? 'success' : 'warning'}
                  variant="outlined"
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {generating && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            Gerando QR Codes... {progress}%
          </Typography>
          <LinearProgress variant="determinate" value={progress} />
        </Box>
      )}

      {generatedBatch.length > 0 && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Resultados do lote
          </Typography>
          <Grid container spacing={1}>
            {generatedBatch.slice(0, 5).map((result, index) => (
              <Grid item xs={12} key={index}>
                <Paper sx={{ p: 1, bgcolor: result.success ? '#e8f5e9' : '#ffebee' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {result.success ? (
                      <CheckCircle sx={{ color: '#4caf50' }} />
                    ) : (
                      <Error sx={{ color: '#f44336' }} />
                    )}
                    <Typography variant="body2">
                      {result.room.name} - {result.success ? 'Sucesso' : `Falha: ${result.error}`}
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>
            ))}
            {generatedBatch.length > 5 && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  ... e mais {generatedBatch.length - 5} resultados
                </Typography>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}
    </Box>
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <QrCode />
            <Typography variant="h6">{title}</Typography>
            {mode === 'batch' && (
              <Chip label={`${selectedRooms.length} selecionadas`} size="small" color="primary" />
            )}
          </Stack>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {mode === 'batch' && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
              <Tab label="Selecionar Salas" />
              <Tab label="Configurações" disabled={selectedRooms.length === 0} />
            </Tabs>
          </Box>
        )}

        {mode === 'batch' ? renderBatchMode() : renderSingleMode()}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 0 }}>
        <Button onClick={handleClose} variant="outlined">
          Cancelar
        </Button>
        
        {mode === 'single' && qrImage && (
          <>
            <Tooltip title="Copiar QR Code">
              <IconButton onClick={handleCopy} color="primary">
                <ContentCopy />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Baixar QR Code">
              <IconButton onClick={handleDownload} color="primary">
                <Download />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Imprimir QR Code">
              <IconButton onClick={handlePrint} color="primary">
                <Print />
              </IconButton>
            </Tooltip>
          </>
        )}

        <Button
          variant="contained"
          startIcon={generating ? <CircularProgress size={20} /> : <QrCode />}
          onClick={handleGenerate}
          disabled={generating || (mode === 'batch' && selectedRooms.length === 0)}
          sx={{ ml: 1 }}
        >
          {generating ? 'Gerando...' : 'Gerar QR Code'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QRGeneratorModal;