// src/components/common/QRImageModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Stack,
  Paper,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  Divider,
  TextField,
} from '@mui/material';
import {
  Close,
  Download,
  Print,
  QrCode,
  ContentCopy,
  Refresh,
  Room,
  LocationOn,
} from '@mui/icons-material';
import QRCode from 'qrcode';
import { useSnackbar } from 'notistack';

const QRImageModal = ({ 
  open, 
  onClose, 
  room,
  title = "QR Code da Sala"
}) => {
  const { enqueueSnackbar } = useSnackbar();
  
  const [loading, setLoading] = useState(false);
  const [qrImage, setQrImage] = useState('');
  const [error, setError] = useState('');
  const [size, setSize] = useState(300);
  const [manualQR, setManualQR] = useState('');

  // Gerar QR Code quando o modal abrir
  useEffect(() => {
    if (open && room) {
      generateQRCode();
      setManualQR(room.qrCode || '');
    }
  }, [open, room]);

  const generateQRCode = async () => {
    try {
      setLoading(true);
      setError('');
      
      const qrData = {
        type: 'ROOM',
        roomId: room.id,
        roomName: room.name,
        roomType: room.type,
        location: room.location,
        qrCode: room.qrCode || `QR-${room.type}-${room.name}`,
        timestamp: Date.now(),
        system: 'Neuropsicocentro Cleaning System'
      };

      const qrImage = await QRCode.toDataURL(JSON.stringify(qrData), {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: size,
        color: {
          dark: '#1976d2',
          light: '#ffffff'
        }
      });

      setQrImage(qrImage);
    } catch (err) {
      setError('Erro ao gerar QR Code: ' + err.message);
      console.error('Erro ao gerar QR Code:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrImage) return;

    try {
      const link = document.createElement('a');
      link.href = qrImage;
      link.download = `QR-${room.name.replace(/\s+/g, '-')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      enqueueSnackbar('QR Code baixado com sucesso!', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Erro ao baixar QR Code', { variant: 'error' });
    }
  };

  const handlePrint = () => {
    if (!qrImage) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${room.name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px; 
              text-align: center;
              background: white;
            }
            .container { 
              border: 2px solid #1976d2;
              padding: 30px;
              border-radius: 15px;
              max-width: 500px;
              margin: 0 auto;
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
              width: 250px; 
              height: 250px;
              margin: 20px auto;
              display: block;
            }
            .qr-code-text {
              font-family: monospace;
              font-size: 16px;
              background: #f5f5f5;
              padding: 10px;
              border-radius: 5px;
              margin: 20px 0;
              word-break: break-all;
            }
            .instructions {
              font-size: 12px;
              color: #888;
              margin-top: 20px;
              border-top: 1px solid #eee;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="room-name">${room.name}</div>
            <div class="room-info">
              ${room.type} • ${room.location}
            </div>
            
            <img src="${qrImage}" alt="QR Code" class="qr-image" />
            
            <div class="qr-code-text">
              ${room.qrCode || 'QR CODE NÃO GERADO'}
            </div>
            
            <div class="instructions">
              Escaneie este código com o aplicativo para iniciar a limpeza<br>
              Sistema Neuropsicocentro • ${new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
          <script>
            setTimeout(() => {
              window.print();
              setTimeout(() => window.close(), 1000);
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(room.qrCode || '')
      .then(() => enqueueSnackbar('QR Code copiado!', { variant: 'success' }))
      .catch(() => enqueueSnackbar('Erro ao copiar', { variant: 'error' }));
  };

  const handleRegenerate = () => {
    generateQRCode();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <QrCode />
            <Typography variant="h6">{title}</Typography>
          </Stack>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        {room && (
          <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Room sx={{ color: '#1976d2' }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight="bold">
                  {room.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <LocationOn fontSize="small" sx={{ mr: 0.5 }} />
                  {room.location}
                </Typography>
              </Box>
              <Chip label={room.type} size="small" color="primary" />
            </Stack>
          </Paper>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2 }}>
          {loading ? (
            <Box sx={{ py: 4 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Gerando QR Code...
              </Typography>
            </Box>
          ) : qrImage ? (
            <>
              <img 
                src={qrImage} 
                alt="QR Code" 
                style={{ 
                  width: '200px', 
                  height: '200px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px'
                }} 
              />
              
              <TextField
                fullWidth
                label="Código QR"
                value={manualQR}
                onChange={(e) => setManualQR(e.target.value)}
                sx={{ mt: 3 }}
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={handleCopy} size="small">
                      <ContentCopy />
                    </IconButton>
                  ),
                }}
              />
              
              <Alert severity="info" sx={{ mt: 2 }}>
                Este QR Code contém todas as informações da sala para escaneamento rápido.
              </Alert>
            </>
          ) : (
            <Box sx={{ py: 4 }}>
              <QrCode sx={{ fontSize: 80, color: '#ccc', mb: 2 }} />
              <Typography color="text.secondary">
                Não foi possível gerar o QR Code
              </Typography>
            </Box>
          )}
        </Paper>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Tamanho do QR:
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button 
              size="small" 
              variant={size === 200 ? "contained" : "outlined"}
              onClick={() => setSize(200)}
            >
              Pequeno
            </Button>
            <Button 
              size="small" 
              variant={size === 300 ? "contained" : "outlined"}
              onClick={() => setSize(300)}
            >
              Médio
            </Button>
            <Button 
              size="small" 
              variant={size === 400 ? "contained" : "outlined"}
              onClick={() => setSize(400)}
            >
              Grande
            </Button>
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={onClose} variant="outlined">
          Fechar
        </Button>
        
        <Button
          startIcon={<Refresh />}
          onClick={handleRegenerate}
          disabled={loading}
        >
          Regenerar
        </Button>
        
        {qrImage && (
          <>
            <Button
              startIcon={<ContentCopy />}
              onClick={handleCopy}
              variant="outlined"
            >
              Copiar
            </Button>
            
            <Button
              startIcon={<Download />}
              onClick={handleDownload}
              variant="outlined"
            >
              Baixar
            </Button>
            
            <Button
              startIcon={<Print />}
              onClick={handlePrint}
              variant="contained"
              color="primary"
            >
              Imprimir
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default QRImageModal;