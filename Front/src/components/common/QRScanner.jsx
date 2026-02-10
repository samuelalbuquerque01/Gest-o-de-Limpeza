// Front/src/components/common/QRScanner.jsx - VERSÃO REACT PURA
import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Alert,
  Paper,
} from "@mui/material";
import {
  QrCodeScanner,
  Close,
  CameraAlt,
  Refresh,
  FlipCameraAndroid,
} from "@mui/icons-material";

const QRScanner = ({ open, onClose, onScan }) => {
  const videoRef = useRef(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState("environment"); // "environment" ou "user"
  const [showVideo, setShowVideo] = useState(false);

  // Iniciar câmera
  const startCamera = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Parar stream anterior
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      
      console.log("🎬 Iniciando câmera...");
      
      // Solicitar acesso à câmera
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      setShowVideo(true);
      setLoading(false);
      
      console.log("✅ Câmera iniciada com sucesso");
      
    } catch (err) {
      console.error("❌ Erro ao iniciar câmera:", err);
      setLoading(false);
      setShowVideo(false);
      
      let errorMsg = "Não foi possível acessar a câmera.";
      if (err.name === 'NotAllowedError') {
        errorMsg = "Permissão da câmera negada. Por favor, permita o acesso.";
      } else if (err.name === 'NotFoundError') {
        errorMsg = "Nenhuma câmera encontrada.";
      } else if (err.name === 'OverconstrainedError') {
        // Tentar a câmera frontal se a traseira falhar
        if (facingMode === 'environment') {
          console.log("🔄 Tentando câmera frontal...");
          setFacingMode('user');
          setTimeout(() => startCamera(), 300);
          return;
        }
        errorMsg = "Câmera não atende aos requisitos.";
      }
      
      setError(errorMsg);
    }
  };

  // Trocar entre câmeras frontal/traseira
  const toggleCamera = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    startCamera();
  };

  // Configurar o elemento de vídeo quando stream mudar
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => {
        console.warn("⚠️ Erro ao reproduzir vídeo:", e);
      });
    }
  }, [stream, showVideo]);

  // Inicializar quando abrir
  useEffect(() => {
    if (open) {
      console.log("🚀 Iniciando scanner...");
      startCamera();
    }
  }, [open]);

  // Cleanup quando fechar
  useEffect(() => {
    return () => {
      if (stream) {
        console.log("🧹 Limpando recursos...");
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setShowVideo(false);
    if (onClose) onClose();
  };

  const handleRetry = () => {
    setError("");
    startCamera();
  };

  // Entrada manual de QR Code
  const handleManualInput = () => {
    const qrCode = prompt("Digite ou cole o código do QR Code:");
    if (qrCode && qrCode.trim() && onScan) {
      onScan(qrCode.trim());
    }
  };

  // Capturar imagem para leitura manual
  const captureImage = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Aqui você poderia enviar a imagem para análise de QR Code
    // Por enquanto, apenas mostra um alerta
    alert('Imagem capturada! Em uma versão futura, isso poderia ser enviado para análise de QR Code.');
    
    // Para debug: salvar a imagem
    // const imageData = canvas.toDataURL('image/jpeg');
    // console.log('📸 Imagem capturada');
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={window.innerWidth < 600}
      PaperProps={{
        sx: {
          borderRadius: window.innerWidth >= 600 ? 2 : 0,
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: '#1976d2', 
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 1.5,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <QrCodeScanner sx={{ fontSize: 24 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
            Scanner QR Code
          </Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'white', p: 0.5 }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, position: 'relative' }}>
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              m: 2,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 10,
            }}
          >
            {error}
          </Alert>
        )}

        {/* Container da câmera */}
        <Box sx={{ 
          width: '100%', 
          height: 400, 
          backgroundColor: '#000',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {loading ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              gap: 2,
            }}>
              <CircularProgress sx={{ color: 'white' }} />
              <Typography color="white" variant="body2">
                Iniciando câmera...
              </Typography>
            </Box>
          ) : showVideo && stream ? (
            <>
              {/* Elemento de vídeo do React */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                }}
              />
              
              {/* Overlay com guias */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  pointerEvents: 'none',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Paper
                  sx={{
                    width: 250,
                    height: 250,
                    border: '2px solid #1976d2',
                    borderRadius: 1,
                    backgroundColor: 'transparent',
                    position: 'relative',
                  }}
                >
                  {/* Cantos decorativos */}
                  {[
                    { top: -2, left: -2, borderTop: true, borderLeft: true },
                    { top: -2, right: -2, borderTop: true, borderRight: true },
                    { bottom: -2, left: -2, borderBottom: true, borderLeft: true },
                    { bottom: -2, right: -2, borderBottom: true, borderRight: true },
                  ].map((corner, i) => (
                    <Box
                      key={i}
                      sx={{
                        position: 'absolute',
                        ...corner,
                        width: 20,
                        height: 20,
                        ...(corner.borderTop && { borderTop: '2px solid #1976d2' }),
                        ...(corner.borderRight && { borderRight: '2px solid #1976d2' }),
                        ...(corner.borderBottom && { borderBottom: '2px solid #1976d2' }),
                        ...(corner.borderLeft && { borderLeft: '2px solid #1976d2' }),
                      }}
                    />
                  ))}
                </Paper>
              </Box>
              
              {/* Instruções */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  p: 1.5,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  textAlign: 'center',
                }}
              >
                <Typography variant="caption" sx={{ fontSize: '0.8rem' }}>
                  📱 Posicione o QR Code dentro do quadro
                </Typography>
              </Box>
            </>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              gap: 2,
              p: 3,
            }}>
              <CameraAlt sx={{ fontSize: 64, color: 'white' }} />
              <Typography color="white" variant="h6" textAlign="center">
                Câmera não disponível
              </Typography>
              <Typography color="rgba(255,255,255,0.8)" textAlign="center">
                Não foi possível acessar a câmera do dispositivo.
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      {/* Controles */}
      <DialogActions sx={{ 
        p: 2, 
        bgcolor: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}>
        {/* Botões principais */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center',
          gap: 2,
          width: '100%',
          flexWrap: 'wrap',
        }}>
          {/* Botão para trocar câmera */}
          <Button
            variant="contained"
            startIcon={<FlipCameraAndroid />}
            onClick={toggleCamera}
            sx={{
              minWidth: 180,
              py: 1.5,
              bgcolor: '#1976d2',
              '&:hover': { bgcolor: '#1565c0' }
            }}
            disabled={loading}
          >
            {facingMode === 'environment' ? 'Câmera Frontal' : 'Câmera Traseira'}
          </Button>
          
          {/* Botão para capturar imagem */}
          <Button
            variant="outlined"
            startIcon={<CameraAlt />}
            onClick={captureImage}
            sx={{
              minWidth: 180,
              py: 1.5,
            }}
            disabled={loading || !showVideo}
          >
            Capturar Imagem
          </Button>
        </Box>

        {/* Botões de ação */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          width: '100%',
          gap: 1,
        }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={handleManualInput}
              variant="outlined"
              size="small"
            >
              Digitar Código
            </Button>
            
            <Button
              onClick={handleRetry}
              startIcon={<Refresh />}
              variant="outlined"
              size="small"
            >
              Reiniciar
            </Button>
          </Box>
          
          <Button
            onClick={handleClose}
            variant="contained"
            size="small"
            sx={{ bgcolor: '#1976d2' }}
          >
            Fechar
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default QRScanner;