// src/components/common/QRScanner.jsx
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
  Card,
  CardContent,
  Chip,
  Avatar,
  Divider,
  TextField,
  Grid,
  Stack,
} from '@mui/material';
import {
  QrCodeScanner,
  CameraAlt,
  CheckCircle,
  Room,
  LocationOn,
  Person,
  AccessTime,
  Warning,
  ArrowBack,
} from '@mui/icons-material';
import roomService from '../../services/roomService';
import cleaningService from '../../services/cleaningService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const QRScanner = ({
  open,
  onClose,
  onScan,
  title = "Escanear QR Code da Sala",
  description = "Aponte a câmera para o QR Code colado na sala",
  autoStart = false,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [scannedRoom, setScannedRoom] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [cameraError, setCameraError] = useState('');

  // Iniciar scanner automaticamente se autoStart for true
  useEffect(() => {
    if (open && autoStart) {
      startScanner();
    }
  }, [open, autoStart]);

  const startScanner = () => {
    setScanning(true);
    setError('');
    setScannedRoom(null);
    setCameraError('');
    
    // Em produção, aqui integraria com uma biblioteca de câmera
    console.log('Iniciando scanner de QR Code...');
  };

  const handleQRScan = async (qrCode) => {
    if (!qrCode) return;
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      console.log('🔍 Escaneando QR Code:', qrCode);

      // Buscar sala pelo QR Code
      const response = await roomService.findRoomByQRCode(qrCode);
      
      if (response.success) {
        const data = response.data;
        setScannedRoom(data);
        setScanning(false);
        
        if (data.isBeingCleaned) {
          setError(`⚠️ Esta sala já está sendo limpa por ${data.currentCleaner?.name || 'outro funcionário'}`);
        } else {
          setSuccess('✅ Sala encontrada! Pronta para limpeza.');
          
          // Se onScan foi fornecido, chama com os dados
          if (onScan) {
            onScan(data);
          }
        }
      } else {
        setError(response.error || 'QR Code não reconhecido ou sala não encontrada');
        setScanning(false);
      }
    } catch (err) {
      console.error('Erro ao escanear QR Code:', err);
      setError('Erro ao conectar com o servidor. Verifique sua conexão.');
      setScanning(false);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCleaning = async () => {
    if (!scannedRoom?.room?.id || !user?.id) {
      setError('Dados insuficientes para iniciar limpeza');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Iniciar limpeza usando o cleaningService
      const response = await cleaningService.startCleaning(scannedRoom.room.id);

      if (response?.success) {
        setSuccess('✅ Limpeza iniciada com sucesso!');
        
        // Fechar modal após 2 segundos e redirecionar
        setTimeout(() => {
          onClose();
          navigate('/worker'); // Redireciona para a interface do worker
        }, 2000);
      } else {
        setError(response?.message || response?.error || 'Erro ao iniciar limpeza');
      }
    } catch (err) {
      setError('Erro ao iniciar limpeza. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualInput = () => {
    if (manualInput.trim()) {
      handleQRScan(manualInput.trim());
    } else {
      setError('Digite um QR Code válido');
    }
  };

  const handleClose = () => {
    setScanning(false);
    setLoading(false);
    setError('');
    setSuccess('');
    setScannedRoom(null);
    setManualInput('');
    onClose();
  };

  // Simulação para desenvolvimento/teste
  const simulateScan = () => {
    // Para teste durante desenvolvimento
    const testQRCodes = [
      'QR-ROOM-SALA101-ABC123',
      'QR-BATHROOM-BANHEIRO1-XYZ789',
      'QR-KITCHEN-COZINHA-DEF456'
    ];
    const randomQR = testQRCodes[Math.floor(Math.random() * testQRCodes.length)];
    handleQRScan(randomQR);
  };

  const getRoomTypeIcon = (type) => {
    switch (type) {
      case 'BATHROOM': return '🚽';
      case 'KITCHEN': return '🍳';
      case 'MEETING_ROOM': return '💼';
      default: return '🚪';
    }
  };

  const getRoomTypeLabel = (type) => {
    switch (type) {
      case 'BATHROOM': return 'Banheiro';
      case 'KITCHEN': return 'Cozinha';
      case 'MEETING_ROOM': return 'Sala de Reunião';
      default: return 'Sala';
    }
  };

  const getRoomStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'IN_PROGRESS': return 'info';
      case 'COMPLETED': return 'success';
      case 'NEEDS_ATTENTION': return 'error';
      default: return 'default';
    }
  };

  const getRoomStatusLabel = (status) => {
    switch (status) {
      case 'PENDING': return 'Pendente';
      case 'IN_PROGRESS': return 'Em Andamento';
      case 'COMPLETED': return 'Concluída';
      case 'NEEDS_ATTENTION': return 'Atenção';
      default: return status;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QrCodeScanner />
            <Typography variant="h6">{title}</Typography>
          </Box>
          <Button startIcon={<ArrowBack />} onClick={handleClose} size="small">
            Voltar
          </Button>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* Conteúdo baseado no estado */}
        {loading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6">
              {scannedRoom ? 'Iniciando limpeza...' : 'Processando QR Code...'}
            </Typography>
          </Box>
        ) : scannedRoom ? (
          // Tela de confirmação da sala encontrada
          <Box sx={{ py: 2 }}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Avatar sx={{ 
                    bgcolor: '#1aae96', 
                    mr: 2, 
                    fontSize: '1.5rem',
                    width: 56,
                    height: 56
                  }}>
                    {getRoomTypeIcon(scannedRoom.room.type)}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>
                      {scannedRoom.room.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center' }}>
                      <LocationOn fontSize="small" sx={{ mr: 0.5 }} />
                      {scannedRoom.room.location}
                    </Typography>
                  </Box>
                  <Chip 
                    label={getRoomTypeLabel(scannedRoom.room.type)}
                    color="primary"
                    sx={{ fontWeight: 700 }}
                  />
                </Box>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      QR Code:
                    </Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {scannedRoom.room.qrCode}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Status:
                    </Typography>
                    <Chip
                      label={getRoomStatusLabel(scannedRoom.room.status)}
                      color={getRoomStatusColor(scannedRoom.room.status)}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Grid>
                </Grid>

                {scannedRoom.isBeingCleaned && scannedRoom.currentCleaner && (
                  <Alert 
                    severity="warning" 
                    icon={<Person />}
                    sx={{ mb: 3 }}
                  >
                    <Typography variant="body2">
                      <strong>Em limpeza por:</strong> {scannedRoom.currentCleaner.name}
                    </Typography>
                    <Typography variant="caption">
                      Esta sala já está sendo higienizada no momento.
                    </Typography>
                  </Alert>
                )}

                {!scannedRoom.isBeingCleaned && (
                  <Alert 
                    severity="success" 
                    icon={<CheckCircle />}
                    sx={{ mb: 3 }}
                  >
                    <Typography variant="body2">
                      Esta sala está disponível para limpeza!
                    </Typography>
                  </Alert>
                )}

                <Divider sx={{ my: 2 }} />

                {/* Informações adicionais */}
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant="caption" color="textSecondary" display="block">
                      Prioridade
                    </Typography>
                    <Chip
                      label={scannedRoom.room.priority || 'MÉDIA'}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  
                  {scannedRoom.room.lastCleaned && (
                    <Box>
                      <Typography variant="caption" color="textSecondary" display="block">
                        Última limpeza
                      </Typography>
                      <Typography variant="body2">
                        {new Date(scannedRoom.room.lastCleaned).toLocaleDateString('pt-BR')}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>
        ) : scanning ? (
          // Tela de escaneamento ativo
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Box
              sx={{
                width: 300,
                height: 300,
                mx: 'auto',
                my: 3,
                border: '3px solid #1aae96',
                borderRadius: 2,
                position: 'relative',
                overflow: 'hidden',
                bgcolor: '#000',
              }}
            >
              {/* Simulação do viewfinder da câmera */}
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 250,
                  height: 250,
                  border: '2px solid rgba(26, 174, 150, 0.7)',
                  borderRadius: 1,
                }}
              />
              
              <QrCodeScanner 
                sx={{ 
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: 120, 
                  color: 'rgba(26, 174, 150, 0.3)',
                  animation: 'pulse 1.5s infinite',
                  '@keyframes pulse': {
                    '0%': { opacity: 0.3 },
                    '50%': { opacity: 0.7 },
                    '100%': { opacity: 0.3 },
                  }
                }} 
              />
            </Box>
            
            <Typography variant="h6" gutterBottom>
              Escaneando...
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Aponte a câmera para o QR Code da sala
            </Typography>
            <CircularProgress size={24} sx={{ mt: 3 }} />
            
            <Button
              variant="outlined"
              onClick={() => setScanning(false)}
              sx={{ mt: 3 }}
            >
              Cancelar Escaneamento
            </Button>
          </Box>
        ) : (
          // Tela inicial do scanner
          <Box sx={{ py: 2 }}>
            <Typography variant="body1" color="textSecondary" paragraph>
              {description}
            </Typography>
            
            <Box sx={{ textAlign: 'center', my: 4 }}>
              <CameraAlt sx={{ fontSize: 100, color: '#1aae96', mb: 2, opacity: 0.8 }} />
              <Typography variant="h6" gutterBottom>
                Como escanear:
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ maxWidth: 400, mx: 'auto' }}>
                1. Localize o QR Code colado na sala<br />
                2. Aponte a câmera do celular<br />
                3. Centralize o QR Code no quadro<br />
                4. Aguarde o reconhecimento automático
              </Typography>
            </Box>

            {/* Entrada manual para desenvolvimento/teste */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Para teste:</strong> Digite um QR Code manualmente ou use o botão de simulação.
              </Typography>
            </Alert>
            
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Digite o QR Code (para teste)"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Ex: QR-SALA-101"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleManualInput();
                  }
                }}
              />
              <Button
                variant="outlined"
                onClick={handleManualInput}
                disabled={!manualInput.trim()}
              >
                Buscar
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={handleClose} disabled={loading}>
          {scannedRoom ? 'Voltar' : 'Cancelar'}
        </Button>
        
        {!scannedRoom && !scanning && !loading && (
          <>
            <Button
              variant="outlined"
              startIcon={<QrCodeScanner />}
              onClick={simulateScan}
              sx={{ mr: 1 }}
            >
              Simular Scan (Teste)
            </Button>
            <Button
              variant="contained"
              startIcon={<CameraAlt />}
              onClick={startScanner}
              sx={{ bgcolor: '#1aae96', '&:hover': { bgcolor: '#128a78' } }}
            >
              Iniciar Scanner
            </Button>
          </>
        )}
        
        {scannedRoom && !scannedRoom.isBeingCleaned && (
          <Button
            variant="contained"
            startIcon={<CheckCircle />}
            onClick={handleStartCleaning}
            disabled={loading}
            sx={{ bgcolor: '#1aae96', '&:hover': { bgcolor: '#128a78' } }}
          >
            {loading ? 'Iniciando...' : 'Iniciar Limpeza'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default QRScanner;