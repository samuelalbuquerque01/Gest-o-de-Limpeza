// Front/src/components/common/QRScanner.jsx - VERSÃO COM TROCA DE CÂMERA FUNCIONAL
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
  const [availableCameras, setAvailableCameras] = useState([]);
  const [currentCameraId, setCurrentCameraId] = useState(null);

  // Detectar câmeras disponíveis
  const detectCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(videoDevices);
      console.log("📷 Câmeras detectadas:", videoDevices.length);
    } catch (err) {
      console.warn("Não foi possível listar câmeras:", err);
    }
  };

  // Iniciar câmera
  const startCamera = async (cameraId = null) => {
    try {
      setLoading(true);
      setError("");
      
      // Parar stream anterior
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Construir constraints
      let constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      // Se temos um ID específico, usar ele
      if (cameraId) {
        constraints.video.deviceId = { exact: cameraId };
      } else {
        // Senão, usar facingMode
        constraints.video.facingMode = facingMode;
      }
      
      console.log("🎬 Iniciando câmera com constraints:", constraints);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      // Encontrar o ID da câmera atual
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        setCurrentCameraId(videoTrack.getSettings().deviceId);
      }
      
      // Criar/atualizar elemento de vídeo
      let video = document.getElementById('camera-preview');
      if (!video) {
        video = document.createElement('video');
        video.id = 'camera-preview';
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';
      }
      
      video.srcObject = mediaStream;
      
      const container = document.getElementById('camera-container');
      if (container) {
        container.innerHTML = '';
        container.appendChild(video);
        videoRef.current = video;
      }
      
      setLoading(false);
      console.log("✅ Câmera iniciada com sucesso");
      
    } catch (err) {
      console.error("❌ Erro ao iniciar câmera:", err);
      setLoading(false);
      
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
          setTimeout(() => startCamera(), 100);
          return;
        }
        errorMsg = "Câmera não atende aos requisitos.";
      }
      
      setError(errorMsg);
    }
  };

  // Trocar entre câmeras
  const toggleCamera = async () => {
    if (availableCameras.length === 0) {
      // Se não detectou câmeras, alterna entre frontal/traseira
      const newMode = facingMode === 'environment' ? 'user' : 'environment';
      setFacingMode(newMode);
      startCamera();
      return;
    }
    
    if (availableCameras.length === 1) {
      alert("⚠️ Apenas uma câmera disponível neste dispositivo.");
      return;
    }
    
    // Encontrar índice da câmera atual
    let currentIndex = availableCameras.findIndex(cam => cam.deviceId === currentCameraId);
    if (currentIndex === -1) currentIndex = 0;
    
    // Próxima câmera
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCamera = availableCameras[nextIndex];
    
    console.log(`🔄 Alternando para câmera ${nextIndex}:`, nextCamera.label || 'Desconhecida');
    startCamera(nextCamera.deviceId);
  };

  // Inicializar quando abrir
  useEffect(() => {
    if (open) {
      console.log("🚀 Iniciando scanner...");
      detectCameras();
      startCamera();
    }
  }, [open]);

  // Cleanup
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    console.log("🧹 Limpando recursos...");
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleClose = () => {
    cleanup();
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
        <Box 
          id="camera-container"
          sx={{ 
            width: '100%', 
            height: 400, 
            backgroundColor: '#000',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {loading && (
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
          )}
        </Box>

        {/* Overlay com guias */}
        {!loading && !error && (
          <>
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
                zIndex: 5,
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
                zIndex: 5,
              }}
            >
              <Typography variant="caption" sx={{ fontSize: '0.8rem' }}>
                📱 Posicione o QR Code dentro do quadro
              </Typography>
            </Box>
          </>
        )}
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
        }}>
          {/* Botão grande para trocar câmera */}
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
          
          {/* Botão para entrada manual */}
          <Button
            variant="outlined"
            onClick={handleManualInput}
            sx={{
              minWidth: 180,
              py: 1.5,
            }}
            disabled={loading}
          >
            Digitar Código
          </Button>
        </Box>

        {/* Botões de ação */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          width: '100%',
          gap: 1,
        }}>
          <Button
            onClick={handleRetry}
            startIcon={<Refresh />}
            variant="outlined"
            size="small"
          >
            Reiniciar Câmera
          </Button>
          
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