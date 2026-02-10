// Front/src/components/common/QRScanner.jsx - VERSÃO CORRIGIDA
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
  Videocam,
  VideocamOff,
} from "@mui/icons-material";

// Importação condicional da biblioteca html5-qrcode
let Html5QrcodeScanner;
try {
  Html5QrcodeScanner = require('html5-qrcode').Html5QrcodeScanner;
} catch (err) {
  console.warn("html5-qrcode não disponível:", err);
}

const QRScanner = ({ open, onClose, onScan, autoStart = true, scanning = true }) => {
  const scannerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scanner, setScanner] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [stream, setStream] = useState(null);
  const [scanningActive, setScanningActive] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  // Limpar tudo
  const cleanup = () => {
    console.log("🧹 Limpando recursos...");
    
    // Parar stream de vídeo
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
    
    // Limpar scanner da biblioteca
    if (scanner) {
      try {
        scanner.clear && scanner.clear();
      } catch (err) {
        console.log("ℹ️ Scanner já limpo:", err.message);
      }
      setScanner(null);
    }
    
    // Limpar referências
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setCameraReady(false);
    setScanningActive(false);
  };

  // Solicitar permissão da câmera
  const requestCameraPermission = async () => {
    try {
      setLoading(true);
      setError("");
      cleanup();
      
      console.log("📱 Solicitando permissão da câmera...");
      
      // Verificar se a API está disponível
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("API de mídia não suportada pelo navegador");
      }
      
      // Solicitar permissão com configuração simples
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      setStream(mediaStream);
      setPermissionGranted(true);
      console.log("✅ Permissão da câmera concedida");
      
      // Iniciar visualização da câmera
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(err => {
          console.warn("Erro ao reproduzir vídeo:", err);
        });
      }
      
      // Pequeno delay antes de tentar inicializar o scanner
      setTimeout(() => {
        if (!Html5QrcodeScanner) {
          console.log("📦 html5-qrcode não disponível, usando fallback");
          setUseFallback(true);
          startFallbackScanner();
        } else {
          initHtml5QrScanner();
        }
      }, 500);
      
    } catch (err) {
      console.error("❌ Erro na permissão:", err);
      setPermissionGranted(false);
      setLoading(false);
      
      let errorMsg = "Não foi possível acessar a câmera.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = "Permissão da câmera negada. Clique em 'Permitir' quando solicitado.";
      } else if (err.name === 'NotFoundError') {
        errorMsg = "Nenhuma câmera encontrada no dispositivo.";
      } else if (err.name === 'NotReadableError') {
        errorMsg = "Câmera está sendo usada por outro aplicativo.";
      } else if (err.name === 'OverconstrainedError') {
        errorMsg = "Câmera não atende aos requisitos mínimos.";
      }
      
      setError(errorMsg);
    }
  };

  // Inicializar scanner com html5-qrcode
  const initHtml5QrScanner = async () => {
    try {
      console.log("🔄 Inicializando html5-qrcode scanner...");
      
      // Verificar se a biblioteca está disponível
      if (!Html5QrcodeScanner) {
        throw new Error("Biblioteca html5-qrcode não carregada");
      }
      
      // Configuração simplificada sem scanTypes
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        // Removido supportedScanTypes
      };
      
      // Criar container para o scanner
      const scannerContainer = document.getElementById('scanner-container');
      if (!scannerContainer) {
        throw new Error("Container do scanner não encontrado");
      }
      
      // Limpar container
      scannerContainer.innerHTML = '';
      
      // Criar novo scanner
      const qrScanner = new Html5QrcodeScanner(
        "scanner-container",
        config,
        false // verbose
      );
      
      // Renderizar scanner
      qrScanner.render(
        (decodedText, decodedResult) => {
          console.log("✅ QR Code detectado:", decodedText);
          
          // Parar scanner
          qrScanner.clear().catch(() => {});
          
          // Processar resultado
          let scanData;
          try {
            scanData = JSON.parse(decodedText);
          } catch {
            scanData = decodedText;
          }
          
          // Chamar callback
          if (onScan) {
            onScan(scanData);
          }
        },
        (errorMessage) => {
          // Ignorar erros de "não encontrado"
          if (!errorMessage.includes("NotFoundException")) {
            console.log("ℹ️ Scanner:", errorMessage);
          }
        }
      );
      
      setScanner(qrScanner);
      setCameraReady(true);
      setScanningActive(true);
      setLoading(false);
      console.log("🎉 Scanner html5-qrcode inicializado com sucesso!");
      
    } catch (err) {
      console.error("🔥 Erro ao inicializar html5-qrcode scanner:", err);
      
      // Tentar método fallback
      console.log("🔄 Tentando método fallback...");
      setUseFallback(true);
      startFallbackScanner();
    }
  };

  // Método fallback usando apenas vídeo
  const startFallbackScanner = () => {
    console.log("🎬 Iniciando scanner fallback...");
    
    if (!stream || !videoRef.current) {
      setError("Stream de vídeo não disponível para fallback");
      setLoading(false);
      return;
    }
    
    setCameraReady(true);
    setScanningActive(true);
    setLoading(false);
    console.log("✅ Scanner fallback pronto");
    
    // Aqui você pode adicionar lógica de leitura manual de QR code
    // ou simplesmente usar a visualização da câmera
  };

  // Efeito para iniciar quando o modal abrir
  useEffect(() => {
    if (open && scanning) {
      console.log("🚀 Scanner: Modal aberto, iniciando...");
      requestCameraPermission();
    }
  }, [open, scanning]);

  // Cleanup quando fechar
  useEffect(() => {
    return () => {
      console.log("🔚 Scanner: Componente desmontado");
      cleanup();
    };
  }, []);

  // Fechar modal
  const handleClose = () => {
    console.log("❌ Fechando scanner...");
    cleanup();
    if (onClose) onClose();
  };

  // Tentar novamente
  const handleRetry = async () => {
    console.log("🔄 Tentando novamente...");
    setError("");
    setUseFallback(false);
    await cleanup();
    await requestCameraPermission();
  };

  // Capturar imagem do vídeo para debug
  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      console.log("📸 Imagem capturada para debug");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={window.innerWidth < 768}
      PaperProps={{
        sx: {
          borderRadius: window.innerWidth >= 768 ? 3 : 0,
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: "#1976d2", 
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        py: 2,
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <QrCodeScanner />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Scanner QR Code
          </Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: "white" }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent 
        sx={{ 
          p: 0, 
          position: "relative", 
          minHeight: 400,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#000",
        }}
      >
        {error ? (
          <Box sx={{ p: 3, textAlign: "center", width: "100%" }}>
            <Alert 
              severity="error" 
              sx={{ mb: 2 }}
            >
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Erro no Scanner
              </Typography>
              <Typography variant="body2">
                {error}
              </Typography>
            </Alert>
            
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<CameraAlt />}
                onClick={handleRetry}
                size="large"
              >
                Tentar Novamente
              </Button>
            </Box>
          </Box>
        ) : loading ? (
          <Box sx={{ 
            display: "flex", 
            flexDirection: "column",
            justifyContent: "center", 
            alignItems: "center", 
            height: 400,
            width: "100%",
            gap: 2
          }}>
            <CircularProgress size={60} sx={{ color: "white" }} />
            <Typography variant="body1" color="white">
              {permissionGranted ? "Inicializando scanner..." : "Solicitando permissão..."}
            </Typography>
          </Box>
        ) : cameraReady ? (
          <>
            {/* Container principal */}
            <Box sx={{ 
              width: "100%", 
              height: 400, 
              position: "relative",
              overflow: "hidden",
            }}>
              {/* Container para o scanner html5-qrcode */}
              {!useFallback && Html5QrcodeScanner && (
                <div 
                  id="scanner-container"
                  style={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                  }}
                />
              )}
              
              {/* Fallback: Vídeo simples */}
              {useFallback && (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  
                  {/* Botão para capturar imagem (debug) */}
                  <Button
                    variant="contained"
                    size="small"
                    onClick={captureImage}
                    sx={{
                      position: 'absolute',
                      bottom: 10,
                      right: 10,
                      zIndex: 1000,
                    }}
                  >
                    Capturar
                  </Button>
                </>
              )}
              
              {/* Overlay com guias */}
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  pointerEvents: "none",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 100,
                }}
              >
                <Paper
                  sx={{
                    width: 250,
                    height: 250,
                    border: "3px solid #1976d2",
                    borderRadius: 2,
                    bgcolor: "transparent",
                    position: "relative",
                  }}
                >
                  {/* Cantos decorativos */}
                  {[ 
                    { top: -3, left: -3, borderTop: true, borderLeft: true },
                    { top: -3, right: -3, borderTop: true, borderRight: true },
                    { bottom: -3, left: -3, borderBottom: true, borderLeft: true },
                    { bottom: -3, right: -3, borderBottom: true, borderRight: true }
                  ].map((corner, index) => (
                    <Box
                      key={index}
                      sx={{
                        position: "absolute",
                        ...corner,
                        width: 30,
                        height: 30,
                        ...(corner.borderTop && { borderTop: "3px solid #1976d2" }),
                        ...(corner.borderRight && { borderRight: "3px solid #1976d2" }),
                        ...(corner.borderBottom && { borderBottom: "3px solid #1976d2" }),
                        ...(corner.borderLeft && { borderLeft: "3px solid #1976d2" }),
                      }}
                    />
                  ))}
                </Paper>
              </Box>

              {/* Instrução */}
              <Box sx={{ 
                textAlign: "center", 
                p: 2,
                bgcolor: "rgba(0,0,0,0.7)",
                color: "white",
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 100,
              }}>
                <Typography variant="body2">
                  {useFallback ? "📷 Câmera ativa - Use um leitor externo" : "📱 Posicione o QR Code dentro do quadro"}
                </Typography>
              </Box>
            </Box>
            
            {/* Canvas oculto para captura */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </>
        ) : (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <CameraAlt sx={{ fontSize: 64, color: "white", mb: 2 }} />
            <Typography variant="h6" gutterBottom color="white">
              Permissão da Câmera
            </Typography>
            <Typography variant="body2" color="rgba(255,255,255,0.8)" sx={{ mb: 3 }}>
              Para escanear QR Codes, precisamos acessar sua câmera.
            </Typography>
            <Button
              variant="contained"
              startIcon={<CameraAlt />}
              onClick={requestCameraPermission}
              size="large"
              sx={{ bgcolor: "#1976d2", '&:hover': { bgcolor: "#1565c0" } }}
            >
              Permitir Câmera
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: "#f5f5f5", borderTop: "1px solid #e0e0e0" }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Box>
            {cameraReady && (
              <Button 
                startIcon={scanningActive ? <VideocamOff /> : <Videocam />}
                onClick={() => setScanningActive(!scanningActive)}
                variant="outlined"
                size="small"
              >
                {scanningActive ? 'Pausar' : 'Retomar'}
              </Button>
            )}
          </Box>
          
          <Box>
            <Button 
              onClick={handleRetry} 
              startIcon={<Refresh />}
              variant="outlined"
              sx={{ mr: 1 }}
            >
              Reiniciar
            </Button>
            <Button onClick={handleClose} variant="contained">
              Fechar
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default QRScanner;