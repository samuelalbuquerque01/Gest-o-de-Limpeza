// src/components/common/QRImageModal.jsx - VERSÃO CORRIGIDA
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
  const [qrUrl, setQrUrl] = useState('');

  // Gerar QR Code quando o modal abrir
  useEffect(() => {
    if (open && room) {
      generateQRCode();
    }
  }, [open, room]);

  // ======================================================================
  // ✅ FUNÇÃO CORRIGIDA - GERA QR CODE COM URL (NÃO JSON!)
  // ======================================================================
  const generateQRCode = async () => {
    try {
      setLoading(true);
      setError('');
      
      // ✅ URL CORRETA que vai no QR Code
      const baseUrl = process.env.REACT_APP_FRONTEND_URL || 'https://gest-o-de-limpeza.onrender.com';
      const qrCodeValue = room.qrCode || `QR-${room.type}-${room.name}-${Date.now()}`;
      const qrContent = `${baseUrl}/scan?roomId=${room.id}&qr=${encodeURIComponent(qrCodeValue)}`;
      
      console.log('✅ URL do QR Code:', qrContent);
      
      // ✅ Gerar QR Code com a URL, NÃO com JSON!
      const qrImage = await QRCode.toDataURL(qrContent, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: size,
        color: {
          dark: '#1976d2',
          light: '#ffffff'
        }
      });

      setQrImage(qrImage);
      setQrUrl(qrContent); // ✅ Salvar a URL completa
      
      enqueueSnackbar('QR Code gerado com sucesso!', { variant: 'success' });
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

  // ======================================================================
  // ✅ FUNÇÃO CORRIGIDA - IMPRESSÃO COM URL CORRETA
  // ======================================================================
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
            .qr-url {
              font-family: monospace;
              font-size: 12px;
              background: #f5f5f5;
              padding: 10px;
              border-radius: 5px;
              margin: 20px 0;
              word-break: break-all;
              color: #1976d2;
            }
            .instructions {
              font-size: 12px;
              color: #888;
              margin-top: 20px;
              border-top: 1px solid #eee;
              padding-top: 10px;
            }
            @media print {
              .no-print { display: none; }
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
            
            <div class="qr-url">
              ${qrUrl}
            </div>
            
            <div class="instructions">
              📱 ESCANEIE ESTE QR CODE PARA INICIAR A LIMPEZA<br>
              Sistema Neuropsicocentro • ${new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
          <div class="no-print" style="margin-top: 30px;">
            <button onclick="window.print();" style="
              padding: 10px 20px;
              background: #1976d2;
              color: white;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-size: 16px;
            ">
              🖨️ Imprimir QR Code
            </button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCopy = () => {
    // ✅ Copiar a URL, não o código
    navigator.clipboard.writeText(qrUrl || '')
      .then(() => enqueueSnackbar('URL copiada!', { variant: 'success' }))
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
          <Paper sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: '#f5f5f5' }}>
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
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
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
                label="URL do QR Code (escaneie esta URL)"
                value={qrUrl || ''}
                onChange={(e) => setQrUrl(e.target.value)}
                sx={{ mt: 3 }}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <IconButton onClick={handleCopy} size="small" color="primary">
                      <ContentCopy />
                    </IconButton>
                  ),
                }}
                variant="outlined"
                size="small"
              />
              
              <Alert severity="success" sx={{ mt: 2, textAlign: 'left' }}>
                <strong>✅ QR Code gerado com URL!</strong>
                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                  Escaneie este QR Code para abrir diretamente a página da sala.
                </Typography>
              </Alert>
            </>
          ) : (
            <Box sx={{ py: 4 }}>
              <QrCode sx={{ fontSize: 80, color: '#ccc', mb: 2 }} />
              <Typography color="text.secondary">
                Clique em "Regenerar" para gerar o QR Code
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
              disabled={loading}
            >
              Pequeno
            </Button>
            <Button 
              size="small" 
              variant={size === 300 ? "contained" : "outlined"}
              onClick={() => setSize(300)}
              disabled={loading}
            >
              Médio
            </Button>
            <Button 
              size="small" 
              variant={size === 400 ? "contained" : "outlined"}
              onClick={() => setSize(400)}
              disabled={loading}
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
          variant="outlined"
        >
          {loading ? 'Gerando...' : 'Regenerar'}
        </Button>
        
        {qrImage && (
          <>
            <Button
              startIcon={<ContentCopy />}
              onClick={handleCopy}
              variant="outlined"
            >
              Copiar URL
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