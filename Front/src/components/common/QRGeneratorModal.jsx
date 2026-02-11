// 🔥 APAGUE TUDO e cole este código
import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, CircularProgress, Alert,
  Grid, TextField, FormControl, InputLabel, Select, MenuItem,
  Chip, Stack, IconButton, Paper, Avatar
} from '@mui/material';
import {
  QrCode, Download, Print, ContentCopy, Close,
  Refresh, Room, LocationOn, ColorLens
} from '@mui/icons-material';
import qrCore from '../../services/qrCore';
import { useSnackbar } from 'notistack';

const QRGeneratorModal = ({ open, onClose, room, onSuccess }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [qrImage, setQrImage] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [size, setSize] = useState(300);
  const [format, setFormat] = useState('png');
  const [color, setColor] = useState('#1976d2');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');

  const handleGenerate = async () => {
    if (!room) return;
    
    setLoading(true);
    try {
      const result = await qrCore.generateViaBackend(room.id, {
        size, format, color, backgroundColor
      });
      
      if (result.success) {
        setQrImage(result.image);
        setQrUrl(result.url);
        enqueueSnackbar('QR Code gerado com sucesso!', { variant: 'success' });
        onSuccess?.(result);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      enqueueSnackbar('Erro: ' + error.message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!room) return;
    await qrCore.downloadQRCode(room.id, room.name, format);
    enqueueSnackbar('Download iniciado!', { variant: 'success' });
  };

  const handlePrint = async () => {
    if (!room) return;
    await qrCore.printQRCode(room.id);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(qrUrl);
    enqueueSnackbar('URL copiada!', { variant: 'success' });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <QrCode /> <Typography variant="h6">QR Code - {room?.name}</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        {room && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: '#1976d2' }}><Room /></Avatar>
              <Box>
                <Typography variant="h6">{room.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {room.type} • {room.location}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        )}

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <TextField fullWidth label="Tamanho" type="number" 
              value={size} onChange={(e) => setSize(Number(e.target.value))} />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Formato</InputLabel>
              <Select value={format} onChange={(e) => setFormat(e.target.value)}>
                <MenuItem value="png">PNG</MenuItem>
                <MenuItem value="svg">SVG</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth label="Cor" type="color" 
              value={color} onChange={(e) => setColor(e.target.value)} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth label="Fundo" type="color" 
              value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
          </Grid>
        </Grid>

        {qrImage ? (
          <Box sx={{ textAlign: 'center', my: 2 }}>
            <img src={qrImage} alt="QR Code" style={{ width: 200, height: 200 }} />
            <TextField fullWidth value={qrUrl} sx={{ mt: 2 }} size="small"
              InputProps={{ readOnly: true, endAdornment: (
                <IconButton onClick={handleCopy}><ContentCopy /></IconButton>
              )}} />
          </Box>
        ) : (
          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#fafafa' }}>
            <QrCode sx={{ fontSize: 60, color: '#ccc', mb: 2 }} />
            <Typography color="text.secondary">Clique em GERAR</Typography>
          </Paper>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button startIcon={<Refresh />} onClick={handleGenerate} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Gerar'}
        </Button>
        {qrImage && (
          <>
            <Button startIcon={<Download />} onClick={handleDownload}>Baixar</Button>
            <Button startIcon={<Print />} onClick={handlePrint} variant="contained">
              Imprimir
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default QRGeneratorModal;