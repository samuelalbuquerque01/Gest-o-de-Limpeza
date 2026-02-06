// src/components/common/QRGeneratorModal.jsx
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
  mode = 'single' // 'single', 'batch', 'user'
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
  const [selectedUserId, setSelectedUserId] = useState('');
  const [users, setUsers] = useState([]);

  // Carregar salas quando modal abrir
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

  // Filtrar salas
  useEffect(() => {
    if (!allRooms.length) return;

    let filtered = [...allRooms];

    // Filtrar por busca
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter(room =>
        room.name.toLowerCase().includes(query) ||
        room.location.toLowerCase().includes(query) ||
        room.type.toLowerCase().includes(query) ||
        (room.qrCode && room.qrCode.toLowerCase().includes(query))
      );
    }

    // Filtrar por tipo
    if (roomFilter !== 'all') {
      filtered = filtered.filter(room => 
        roomFilter === 'withQR' ? room.qrCode : !room.qrCode
      );
    }

    setFilteredRooms(filtered);
  }, [allRooms, search, roomFilter]);

  // Gerar QR Code para uma sala
  const generateQRForRoom = async (roomData) => {
    try {
      setGenerating(true);
      setError('');
      setQrImage('');

      console.log(`🔳 Gerando QR Code para: ${roomData.name}`);

      // Gerar payload do QR Code
      const qrPayload = {
        type: 'ROOM',
        roomId: roomData.id,
        roomName: roomData.name,
        roomType: roomData.type,
        location: roomData.location,
        qrCode: roomData.qrCode || `QR-${roomData.type}-${roomData.name}-${Date.now()}`,
        timestamp: Date.now(),
        clinic: 'Neuropsicocentro',
        system: 'Cleaning Management System',
        action: 'scan_to_clean'
      };

      // Opções para o QR Code
      const qrOptions = {
        errorCorrectionLevel: options.errorCorrection,
        margin: options.margin,
        width: size,
        color: {
          dark: options.color,
          light: options.backgroundColor
        }
      };

      // Gerar imagem do QR Code
      const image = await QRCode.toDataURL(JSON.stringify(qrPayload), qrOptions);

      setQrImage(image);
      setQrData({
        ...qrPayload,
        image: image,
        options: qrOptions,
        generatedAt: new Date().toISOString()
      });

      setSuccess(`QR Code gerado com sucesso para ${roomData.name}!`);
      
      // Notificação
      enqueueSnackbar(`QR Code gerado para ${roomData.name}`, { variant: 'success' });
      
      // Chamar callback de sucesso
      if (onSuccess) {
        onSuccess({
          room: roomData,
          qrImage: image,
          qrData: qrPayload
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

  // Gerar QR Codes em lote
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

      for (let i = 0; i < selectedRooms.length; i++) {
        const roomId = selectedRooms[i];
        const roomData = allRooms.find(r => r.id === roomId);
        
        if (roomData) {
          try {
            const qrPayload = {
              type: 'ROOM',
              roomId: roomData.id,
              roomName: roomData.name,
              roomType: roomData.type,
              location: roomData.location,
              qrCode: roomData.qrCode || `QR-${roomData.type}-${roomData.name}-${Date.now()}`,
              timestamp: Date.now()
            };

            const image = await QRCode.toDataURL(JSON.stringify(qrPayload), {
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
              qrData: qrPayload
            });
          } catch (roomError) {
            results.push({
              success: false,
              room: roomData,
              error: roomError.message
            });
          }
        }

        // Atualizar progresso
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

  // Baixar QR Code
  const handleDownload = async () => {
    if (!qrImage) {
      setError('Gere um QR Code primeiro');
      return;
    }

    try {
      const roomName = room?.name || 'sala';
      const fileName = `QR-${roomName.replace(/\s+/g, '-')}-${Date.now()}.png`;
      
      // Criar link para download
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

  // Copiar QR Code para área de transferência
  const handleCopy = async () => {
    if (!qrImage) {
      setError('Gere um QR Code primeiro');
      return;
    }

    try {
      // Converter data URL para blob
      const response = await fetch(qrImage);
      const blob = await response.blob();
      
      // Copiar para área de transferência
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

  // Imprimir QR Code
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
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px; 
              text-align: center;
            }
            .qr-container {
              border: 2px solid #1976d2;
              padding: 30px;
              border-radius: 15px;
              display: inline-block;
              margin: 20px auto;
            }
            .room-name {
              font-size: 24px;
              font-weight: bold;
              color: #1976d2;
              margin-bottom: 10px;
            }
            .room-info {
              color: #666;
              margin-bottom: 20px;
              font-size: 14px;
            }
            .qr-image {
              width: 300px;
              height: 300px;
            }
            .instructions {
              font-size: 12px;
              color: #888;
              margin-top: 20px;
              border-top: 1px solid #eee;
              padding-top: 10px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="room-name">${room?.name || 'Sala'}</div>
            <div class="room-info">
              ${room?.type || ''} • ${room?.location || ''}
            </div>
            <img src="${qrImage}" alt="QR Code" class="qr-image" />
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
    `);
    printWindow.document.close();
  };

  // Selecionar/deselecionar todas as salas
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRooms(filteredRooms.map(room => room.id));
    } else {
      setSelectedRooms([]);
    }
  };

  // Selecionar/deselecionar uma sala
  const handleRoomSelect = (roomId, checked) => {
    if (checked) {
      setSelectedRooms(prev => [...prev, roomId]);
    } else {
      setSelectedRooms(prev => prev.filter(id => id !== roomId));
    }
  };

  // Gerar QR Code
  const handleGenerate = async () => {
    if (tabValue === 0 && room) {
      await generateQRForRoom(room);
    } else if (tabValue === 1) {
      await generateBatchQRCodes();
    }
  };

  // Fechar modal
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

  // Renderizar conteúdo baseado no modo
  const renderContent = () => {
    if (mode === 'batch') {
      return renderBatchMode();
    }
    
    return renderSingleMode();
  };

  const renderSingleMode = () => (
    <Box>
      {/* Informações da sala */}
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

      {/* Opções de personalização */}
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        Personalizar QR Code
      </Typography>

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
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Cor do QR"
            type="color"
            value={options.color}
            onChange={(e) => setOptions({ ...options, color: e.target.value })}
            InputProps={{
              startAdornment: <ColorLens sx={{ mr: 1, color: options.color }} />,
            }}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Cor de fundo"
            type="color"
            value={options.backgroundColor}
            onChange={(e) => setOptions({ ...options, backgroundColor: e.target.value })}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Margem"
            type="number"
            value={options.margin}
            onChange={(e) => setOptions({ ...options, margin: Math.min(10, Math.max(0, parseInt(e.target.value) || 2)) })}
            InputProps={{ inputProps: { min: 0, max: 10 } }}
          />
        </Grid>
        <Grid item xs={6}>
          <FormControl fullWidth>
            <InputLabel>Correção de erro</InputLabel>
            <Select 
              value={options.errorCorrection} 
              label="Correção de erro"
              onChange={(e) => setOptions({ ...options, errorCorrection: e.target.value })}
            >
              <MenuItem value="L">Baixa (7%)</MenuItem>
              <MenuItem value="M">Média (15%)</MenuItem>
              <MenuItem value="Q">Alta (25%)</MenuItem>
              <MenuItem value="H">Máxima (30%)</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <FormControlLabel
        control={
          <Switch
            checked={options.includeText}
            onChange={(e) => setOptions({ ...options, includeText: e.target.checked })}
          />
        }
        label="Incluir texto da sala"
      />

      {/* Pré-visualização do QR Code */}
      {qrImage ? (
        <Box sx={{ textAlign: 'center', my: 3 }}>
          <Paper sx={{ p: 2, display: 'inline-block', border: '1px solid #ddd' }}>
            <img src={qrImage} alt="QR Code" style={{ width: '200px', height: '200px' }} />
          </Paper>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Pré-visualização (200px)
          </Typography>
        </Box>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center', my: 3, bgcolor: '#fafafa' }}>
          <QrCode sx={{ fontSize: 60, color: '#ddd', mb: 2 }} />
          <Typography color="text.secondary">
            Gere o QR Code para ver a pré-visualização
          </Typography>
        </Paper>
      )}

      {/* Dados do QR Code */}
      {qrData && (
        <Paper sx={{ p: 2, mt: 3, bgcolor: '#f8f9fa' }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Dados do QR Code:
          </Typography>
          <Typography variant="caption" component="pre" sx={{ 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-all',
            fontSize: '10px',
            fontFamily: 'monospace'
          }}>
            {JSON.stringify(qrData, null, 2)}
          </Typography>
        </Paper>
      )}
    </Box>
  );

  const renderBatchMode = () => (
    <Box>
      {/* Filtros e busca */}
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
            
            <Button
              size="small"
              onClick={() => {
                setSearch('');
                setRoomFilter('all');
              }}
            >
              Limpar
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Lista de salas */}
      <Paper sx={{ maxHeight: 300, overflow: 'auto', mb: 2 }}>
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : filteredRooms.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              Nenhuma sala encontrada
            </Typography>
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

      {/* Progresso do lote */}
      {generating && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            Gerando QR Codes... {progress}%
          </Typography>
          <LinearProgress variant="determinate" value={progress} />
        </Box>
      )}

      {/* Resultados do lote */}
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
          
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button
              size="small"
              startIcon={<Download />}
              onClick={() => {
                // Implementar download do lote
                enqueueSnackbar('Download do lote em desenvolvimento', { variant: 'info' });
              }}
            >
              Baixar todos ({generatedBatch.filter(r => r.success).length})
            </Button>
          </Box>
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

        {/* Abas para modo batch */}
        {mode === 'batch' && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
              <Tab label="Selecionar Salas" />
              <Tab label="Configurações" disabled={selectedRooms.length === 0} />
            </Tabs>
          </Box>
        )}

        {renderContent()}
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

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        message={toast.message}
      />
    </Dialog>
  );
};

export default QRGeneratorModal;