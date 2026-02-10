// Front/src/components/common/QRScanner.jsx - VERSÃO SIMPLIFICADA E FUNCIONAL
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
} from "@mui/icons-material";

// Tentar importar html5-qrcode dinamicamente
let Html5QrcodeScanner;
try {
  const html5qrcode = require('html5-qrcode');
  Html5QrcodeScanner = html5qrcode.Html5QrcodeScanner;
} catch (err) {
  console.warn("html5-qrcode não disponível, usando modo simples:", err);
}

const QRScanner = ({ open, onClose, onScan }) => {
  const scannerRef = useRef(null);
  const videoRef = useRef(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [useSimpleMode, setUseSimpleMode] = useState(false);

  // Limpar recursos
  const cleanup = () => {
    console.log("🧹 Limpando recursos...");
    
    // Parar scanner da biblioteca
    if (scannerRef.current) {
      try {
        scannerRef.current.clear && scannerRef.current.clear();
      } catch (err) {
        console.log("ℹ️ Scanner já limpo");
      }
      scannerRef.current = null;
    }
    
    // Parar stream de vídeo
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setCameraActive(false);
  };

  // Inicializar scanner
  const initScanner = async () => {
    try {
      setLoading(true);
      setError("");
      cleanup();
      
      console.log("🎬 Iniciando scanner...");
      
      // Verificar se temos a biblioteca
      if (!Html5QrcodeScanner) {
        console.log("📦 Usando modo simples (sem biblioteca)");
        setUseSimpleMode(true);
        await initSimpleCamera();
        return;
      }
      
      // Criar container se não existir
      let container = document.getElementById('qr-scanner-container');
      if (!container) {
        console.log("🆕 Criando container...");
        container = document.createElement('div');
        container.id = 'qr-scanner-container';
        container.style.width = '100%';
        container.style.height = '400px';
        container.style.position = 'relative';
        
        const dialogContent = document.querySelector('.MuiDialogContent-root');
        if (dialogContent) {
          // Limpar conteúdo anterior
          while (dialogContent.firstChild) {
            dialogContent.removeChild(dialogContent.firstChild);
          }
          dialogContent.appendChild(container);
          console.log("✅ Container criado");
        } else {
          throw new Error("Não foi possível encontrar o container do dialog");
        }
      }
      
      // Configuração MÍNIMA
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
      };
      
      console.log("⚙️ Criando scanner...");
      
      // Criar scanner
      const scanner = new Html5QrcodeScanner('qr-scanner-container', config, false);
      
      // Salvar referência
      scannerRef.current = scanner;
      
      // Renderizar
      scanner.render(
        (decodedText) => {
          console.log("✅ QR Code detectado:", decodedText);
          
          // Parar scanner
          scanner.clear().catch(() => {});
          
          // Processar
          let scanData;
          try {
            scanData = JSON.parse(decodedText);
          } catch {
            scanData = decodedText;
          }
          
          // Chamar callback
          if (onScan) {
            setTimeout(() => onScan(scanData), 100);
          }
        },
        (errorMessage) => {
          // Ignorar erros de QR não encontrado
          if (!errorMessage.includes('NotFoundException')) {
            console.log("ℹ️ Scanner:", errorMessage);
          }
        }
      );
      
      setCameraActive(true);
      console.log("🎉 Scanner inicializado!");
      
    } catch (err) {
      console.error("❌ Erro ao iniciar scanner:", err);
      
      // Tentar modo simples
      if (!useSimpleMode) {
        console.log("🔄 Tentando modo simples...");
        setUseSimpleMode(true);
        await initSimpleCamera();
      } else {
        setError(`Não foi possível iniciar a câmera: ${err.message || 'Erro desconhecido'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Modo simples: apenas mostrar a câmera
  const initSimpleCamera = async () => {
    try {
      console.log("📸 Iniciando câmera simples...");
      
      // Solicitar permissão
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      // Criar elemento de vídeo
      const container = document.getElementById('simple-camera-container');
      if (container) {
        const video = document.createElement('video');
        video.id = 'camera-video';
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';
        
        // Limpar container
        container.innerHTML = '';
        container.appendChild(video);
        
        // Atribuir stream
        video.srcObject = stream;
        video.play().catch(e => console.log("⚠️ Erro ao reproduzir:", e));
        
        // Salvar referência
        videoRef.current = video;
        
        setCameraActive(true);
        console.log("✅ Câmera simples iniciada");
      }
      
    } catch (err) {
      console.error("❌ Erro na câmera simples:", err);
      setError(`Não foi possível acessar a câmera: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Efeito para iniciar quando abrir
  useEffect(() => {
    if (open) {
      console.log("🚀 Modal aberto - Iniciando scanner");
      // Pequeno delay para garantir que o modal está renderizado
      setTimeout(() => {
        initScanner();
      }, 300);
    }
  }, [open]);

  // Cleanup ao fechar
  useEffect(() => {
    return () => {
      console.log("🔚 Componente desmontado");
      cleanup();
    };
  }, []);

  const handleClose = () => {
    console.log("❌ Fechando scanner");
    cleanup();
    if (onClose) onClose();
  };

  const handleRetry = () => {
    console.log("🔄 Tentando novamente");
    setError("");
    setUseSimpleMode(false);
    initScanner();
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
          overflow: 'hidden',
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
          position: 'relative',
          minHeight: 400,
          backgroundColor: '#000',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {error ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography>{error}</Typography>
            </Alert>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={handleRetry}
            >
              Tentar Novamente
            </Button>
          </Box>
        ) : loading ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            height: 400,
            gap: 2
          }}>
            <CircularProgress size={60} sx={{ color: 'white' }} />
            <Typography color="white">
              Inicializando scanner...
            </Typography>
          </Box>
        ) : cameraActive ? (
          <>
            {/* Container para o scanner html5-qrcode */}
            {!useSimpleMode && (
              <Box 
                id="qr-scanner-wrapper"
                sx={{
                  width: '100%',
                  height: 400,
                  position: 'relative',
                }}
              >
                {/* O scanner será renderizado aqui */}
              </Box>
            )}
            
            {/* Container para câmera simples */}
            {useSimpleMode && (
              <Box 
                id="simple-camera-container"
                sx={{
                  width: '100%',
                  height: 400,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              />
            )}
            
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
                  border: '3px solid #1976d2',
                  borderRadius: 2,
                  backgroundColor: 'transparent',
                  position: 'relative',
                }}
              >
                {/* Cantos */}
                {[
                  { top: -3, left: -3, borderTop: true, borderLeft: true },
                  { top: -3, right: -3, borderTop: true, borderRight: true },
                  { bottom: -3, left: -3, borderBottom: true, borderLeft: true },
                  { bottom: -3, right: -3, borderBottom: true, borderRight: true },
                ].map((corner, i) => (
                  <Box
                    key={i}
                    sx={{
                      position: 'absolute',
                      ...corner,
                      width: 30,
                      height: 30,
                      ...(corner.borderTop && { borderTop: '3px solid #1976d2' }),
                      ...(corner.borderRight && { borderRight: '3px solid #1976d2' }),
                      ...(corner.borderBottom && { borderBottom: '3px solid #1976d2' }),
                      ...(corner.borderLeft && { borderLeft: '3px solid #1976d2' }),
                    }}
                  />
                ))}
              </Paper>
            </Box>
            
            {/* Instrução */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                p: 2,
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: 'white',
                textAlign: 'center',
              }}
            >
              <Typography variant="body2">
                {useSimpleMode 
                  ? '📷 Câmera ativa - Use um leitor externo de QR Code' 
                  : '📱 Posicione o QR Code dentro do quadro'}
              </Typography>
            </Box>
          </>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CameraAlt sx={{ fontSize: 64, color: 'white', mb: 2 }} />
            <Typography variant="h6" gutterBottom color="white">
              Câmera não disponível
            </Typography>
            <Typography color="rgba(255,255,255,0.8)" sx={{ mb: 3 }}>
              Não foi possível acessar a câmera.
            </Typography>
            <Button
              variant="contained"
              startIcon={<CameraAlt />}
              onClick={handleRetry}
            >
              Tentar Novamente
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
        <Button onClick={handleRetry} startIcon={<Refresh />} sx={{ mr: 1 }}>
          Reiniciar
        </Button>
        <Button onClick={handleClose} variant="contained">
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QRScanner;