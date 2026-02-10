// Front/src/components/common/QRScanner.jsx - VERSÃO COM LEITURA DE QR CODE
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
import { BrowserQRCodeReader } from '@zxing/library';

const QRScanner = ({ open, onClose, onScan }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");
  const [showVideo, setShowVideo] = useState(false);
  const [scanningActive, setScanningActive] = useState(true);
  const codeReaderRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Iniciar câmera
  const startCamera = async () => {
    try {
      setLoading(true);
      setError("");
      setScanningActive(true);
      
      // Parar stream anterior
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      
      // Parar animação anterior
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      console.log("🎬 Iniciando câmera para leitura de QR Code...");
      
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

  // Inicializar leitor de QR Code
  const initQRCodeReader = () => {
    if (!codeReaderRef.current) {
      codeReaderRef.current = new BrowserQRCodeReader();
      console.log("📖 Leitor de QR Code inicializado");
    }
  };

  // Função para capturar e analisar o vídeo
  const captureAndDecode = () => {
    if (!videoRef.current || !canvasRef.current || !scanningActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Configurar canvas com mesmo tamanho do vídeo
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Desenhar frame do vídeo no canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Tentar decodificar QR Code usando jsQR (alternativa mais leve)
    try {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Usar jsQR para decodificar
      import('jsqr').then(({ default: jsQR }) => {
        const code = jsQR(
          imageData.data,
          imageData.width,
          imageData.height,
          {
            inversionAttempts: "dontInvert",
          }
        );

        if (code) {
          console.log("✅ QR Code detectado:", code.data);
          
          // Parar animação
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          
          // Parar câmera
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          
          setScanningActive(false);
          
          // Chamar callback com resultado
          if (onScan) {
            onScan(code.data);
          }
          
          // Fechar scanner
          if (onClose) {
            onClose();
          }
        } else if (scanningActive) {
          // Continuar scanning
          animationFrameRef.current = requestAnimationFrame(captureAndDecode);
        }
      }).catch(err => {
        console.error("Erro ao carregar jsQR:", err);
        // Continuar mesmo com erro
        if (scanningActive) {
          animationFrameRef.current = requestAnimationFrame(captureAndDecode);
        }
      });
    } catch (err) {
      console.warn("Erro na decodificação:", err);
      if (scanningActive) {
        animationFrameRef.current = requestAnimationFrame(captureAndDecode);
      }
    }
  };

  // Configurar o elemento de vídeo quando stream mudar
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => {
        console.warn("⚠️ Erro ao reproduzir vídeo:", e);
      });
      
      // Iniciar leitura quando o vídeo estiver pronto
      videoRef.current.onplaying = () => {
        console.log("🎥 Vídeo rodando, iniciando leitura de QR Code...");
        initQRCodeReader();
        
        // Iniciar loop de captura
        if (scanningActive) {
          animationFrameRef.current = requestAnimationFrame(captureAndDecode);
        }
      };
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
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [stream]);

  // Efeito para re-iniciar scanning quando scanningActive mudar
  useEffect(() => {
    if (scanningActive && videoRef.current && videoRef.current.readyState >= 2) {
      animationFrameRef.current = requestAnimationFrame(captureAndDecode);
    }
  }, [scanningActive]);

  const handleClose = () => {
    setScanningActive(false);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setShowVideo(false);
    if (onClose) onClose();
  };

  const handleRetry = () => {
    setError("");
    setScanningActive(true);
    startCamera();
  };

  const toggleCamera = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    setScanningActive(true);
    startCamera();
  };

  // Entrada manual de QR Code
  const handleManualInput = () => {
    const qrCode = prompt("Digite ou cole o código do QR Code:");
    if (qrCode && qrCode.trim() && onScan) {
      setScanningActive(false);
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
          {scanningActive && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              ml: 2,
              gap: 0.5 
            }}>
              <Box sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: '#4caf50',
                animation: 'pulse 1.5s infinite'
              }} />
              <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                Escaneando...
              </Typography>
            </Box>
          )}
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
              {/* Elemento de vídeo */}
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
              
              {/* Canvas escondido para processamento */}
              <canvas
                ref={canvasRef}
                style={{
                  display: 'none',
                  position: 'absolute',
                  top: 0,
                  left: 0,
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
                  
                  {/* Animação de scanning */}
                  {scanningActive && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 2,
                        background: 'linear-gradient(90deg, transparent, #4caf50, transparent)',
                        animation: 'scan 2s linear infinite',
                      }}
                    />
                  )}
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
                  {scanningActive 
                    ? '📱 Posicione o QR Code dentro do quadro' 
                    : '✅ QR Code detectado!'}
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
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center',
          gap: 2,
          width: '100%',
          flexWrap: 'wrap',
        }}>
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
          
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRetry}
            sx={{
              minWidth: 180,
              py: 1.5,
            }}
            disabled={loading}
          >
            Reiniciar Scanner
          </Button>
        </Box>

        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          width: '100%',
          gap: 1,
        }}>
          <Button
            onClick={handleManualInput}
            variant="outlined"
            size="small"
          >
            Digitar Código Manualmente
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

      {/* CSS para animações */}
      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(250px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </Dialog>
  );
};

export default QRScanner;