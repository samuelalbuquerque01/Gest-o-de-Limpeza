// 🔥 APAGUE TUDO e cole este código
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, CircularProgress, Alert,
  Stack, Paper, Chip, IconButton, TextField
} from '@mui/material';
import {
  QrCode, Download, Print, ContentCopy, Close, Refresh, Room
} from '@mui/icons-material';
import qrCore from '../../services/qrCore';
import { useSnackbar } from 'notistack';

const QRImageModal = ({ open, onClose, room }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [qrImage, setQrImage] = useState('');
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    if (open && room) generateQRCode();
  }, [open, room]);

  const generateQRCode = async () => {
    setLoading(true);
    try {
      const result = await qrCore.generateViaBackend(room.id);
      if (result.success) {
        setQrImage(result.image);
        setQrUrl(result.url);
      }
    } catch (error) {
      enqueueSnackbar('Erro: ' + error.message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>QR Code - {room?.name}</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : qrImage ? (
          <>
            <Box sx={{ textAlign: 'center' }}>
              <img src={qrImage} alt="QR Code" style={{ width: 200, height: 200 }} />
              <TextField fullWidth value={qrUrl} sx={{ mt: 2 }} size="small"
                InputProps={{ readOnly: true }} />
            </Box>
            <Alert severity="success" sx={{ mt: 2 }}>
              QR Code com URL! Escaneie para iniciar limpeza.
            </Alert>
          </>
        ) : (
          <Alert severity="error">Falha ao gerar QR Code</Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
        {qrImage && (
          <>
            <Button startIcon={<Download />} onClick={() => qrCore.downloadQRCode(room.id, room.name)}>
              Baixar
            </Button>
            <Button startIcon={<Print />} onClick={() => qrCore.printQRCode(room.id)} variant="contained">
              Imprimir
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default QRImageModal;