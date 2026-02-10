// Front/src/components/common/QRScanner.jsx - VERSÃO OTIMIZADA PARA CELULAR
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
  Snackbar,
} from "@mui/material";
import {
  QrCodeScanner,
  Close,
  CameraAlt,
  FlashOn,
  FlashOff,
  SwitchCamera,
  Info,
  Error as ErrorIcon,
  CheckCircle,
} from "@mui/icons-material";
import { Html5QrcodeScanner } from "html5-qrcode";

const QRScanner = ({ open, onClose, onScan, autoStart = true, scanning = true }) => {
  const scannerRef = useRef(null);
  const [scanner, setScanner] = useState(null);
  const [cameraId, setCameraId] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  const showSnackbar = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };

  // Verificar status da permissão da câmera
  const checkCameraPermission = async () => {
    try {
      // Verificar se a API de permissions está disponível
      if (navigator.permissions && navigator.permissions.query) {
        const permissionStatus = await navigator.permissions.query({ name: 'camera' });
        setPermissionStatus(permissionStatus.state);
        
        permissionStatus.onchange = () => {
          setPermissionStatus(permissionStatus.state);
        };
      }
    } catch (err) {
      console.log("API de permissions não disponível:", err.message);
    }
  };

  const initScanner = async () => {
    try {
      setLoading(true);
      setError("");
      setShowInstructions(false);

      // Limpar scanner anterior
      if (scanner) {
        await scanner.clear().catch(console.error);
      }

      // Verificar se estamos em ambiente HTTPS (necessário para câmera no navegador)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        setError("A câmera requer HTTPS. Por favor, acesse via HTTPS.");
        showSnackbar("A câmera requer conexão segura (HTTPS)", "warning");
        setLoading(false);
        return;
      }

      // Verificar se a API de mídia está disponível
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Seu navegador não suporta acesso à câmera. Tente usar Chrome, Firefox ou Safari.");
        showSnackbar("Navegador não suporta câmera", "error");
        setLoading(false);
        return;
      }

      // Tentar detectar câmeras disponíveis
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setCameras(videoDevices);
        
        if (videoDevices.length === 0) {
          setError("Nenhuma câmera detectada no dispositivo.");
          showSnackbar("Nenhuma câmera encontrada", "warning");
          setLoading(false);
          return;
        }
      } catch (deviceError) {
        console.log("Não foi possível listar dispositivos:", deviceError);
      }

      // Configurar scanner
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        supportedScanTypes: [2], // SCAN_TYPE_CAMERA
        showTorchButtonIfSupported: true,
      };

      const html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", config, false);

      // Sucesso na leitura
      html5QrcodeScanner.render(
        (decodedText, decodedResult) => {
          console.log("✅ QR Code lido:", decodedText);
          showSnackbar("QR Code detectado!", "success");
          
          // Parar scanner
          html5QrcodeScanner.clear().catch(console.error);
          
          // Processar resultado
          let scanData;
          try {
            scanData = JSON.parse(decodedText);
          } catch {
            scanData = decodedText;
          }
          
          // Chamar callback
          if (onScan) onScan(scanData);
        },
        (errorMessage) => {
          // Ignorar erros de "não encontrado"
          if (!errorMessage.includes("NotFoundException")) {
            console.log("ℹ️ Scanner:", errorMessage);
          }
        }
      );

      setScanner(html5QrcodeScanner);
      showSnackbar("Scanner iniciado. Posicione o QR Code.", "info");
    } catch (err) {
      console.error("🔥 Erro ao inicializar scanner:", err);
      
      // Mensagens de erro mais amigáveis
      let errorMsg = "Não foi possível acessar a câmera.";
      
      if (err.name === 'NotAllowedError') {
        errorMsg = "Permissão da câmera negada. Por favor, permita o acesso nas configurações do navegador.";
      } else if (err.name === 'NotFoundError') {
        errorMsg = "Nenhuma câmera encontrada no dispositivo.";
      } else if (err.name === 'NotReadableError') {
        errorMsg = "Câmera está sendo usada por outro aplicativo.";
      } else if (err.name === 'OverconstrainedError') {
        errorMsg = "Câmera não atende aos requisitos.";
      }
      
      setError(errorMsg);
      showSnackbar(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkCameraPermission();
    
    if (open && scanning) {
      // Pequeno delay para garantir que o modal está aberto
      setTimeout(() => {
        initScanner();
      }, 300);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [open, scanning]);

  const handleClose = () => {
    if (scanner) {
      scanner.clear().catch(console.error);
    }
    setScanner(null);
    setShowInstructions(true);
    if (onClose) onClose();
  };

  const requestCameraPermission = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Solicitar permissão de maneira mais direta
      const constraints = {
        video: {
          facingMode: { ideal: "environment" }, // Câmera traseira
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      // Primeiro, solicitar permissão com uma stream simples
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Parar a stream imediatamente (só queremos a permissão)
      stream.getTracks().forEach(track => {
        track.stop();
      });
      
      showSnackbar("Permissão concedida! Iniciando scanner...", "success");
      
      // Pequeno delay antes de reiniciar
      setTimeout(() => {
        initScanner();
      }, 500);
      
    } catch (err) {
      console.error("❌ Erro ao solicitar permissão:", err);
      
      let errorMsg = "Não foi possível acessar a câmera.";
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = `
          Permissão da câmera negada.
          
          Para permitir:
          1. Clique no ícone de cadeado na barra de endereço
          2. Em "Câmera", selecione "Permitir"
          3. Recarregue a página
          
          Ou vá para Configurações do Navegador > Privacidade > Câmera
        `;
      } else if (err.name === 'NotFoundError') {
        errorMsg = "Nenhuma câmera encontrada no dispositivo.";
      } else if (err.name === 'NotReadableError') {
        errorMsg = "Câmera está sendo usada por outro aplicativo. Feche outros apps que usam câmera.";
      }
      
      setError(errorMsg);
      showSnackbar("Erro na permissão da câmera", "error");
      setLoading(false);
    }
  };

  const toggleFlash = () => {
    setFlash(!flash);
    showSnackbar(flash ? "Flash desligado" : "Flash ligado", "info");
  };

  const switchCamera = async () => {
    if (scanner && cameras.length > 1) {
      try {
        const currentIndex = cameras.findIndex(cam => cam.id === cameraId);
        const nextIndex = (currentIndex + 1) % cameras.length;
        const nextCamera = cameras[nextIndex];
        
        await scanner.clear();
        setCameraId(nextCamera.id);
        showSnackbar(`Câmera alterada: ${nextCamera.label || 'Câmera ' + (nextIndex + 1)}`, "info");
        await initScanner();
      } catch (err) {
        console.error("Erro ao trocar câmera:", err);
        showSnackbar("Erro ao trocar câmera", "error");
      }
    }
  };

  const openCameraSettings = () => {
    // Tentar abrir as configurações do navegador (nem todos os navegadores suportam)
    if (navigator.userAgent.includes('Chrome')) {
      window.open('chrome://settings/content/camera');
    } else if (navigator.userAgent.includes('Firefox')) {
      window.open('about:preferences#privacy');
    } else if (navigator.userAgent.includes('Safari')) {
      showSnackbar("No Safari: Ajustes > Safari > Câmera", "info");
    }
    showSnackbar("Configure a permissão da câmera nas configurações do navegador", "info");
  };

  const retryScanner = () => {
    setError("");
    initScanner();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={window.innerWidth < 600} // Tela cheia em mobile
      PaperProps={{
        sx: {
          borderRadius: window.innerWidth >= 600 ? 3 : 0,
          overflow: "hidden",
          height: window.innerWidth < 600 ? "100vh" : "auto",
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

      <DialogContent sx={{ p: 0, position: "relative", flex: 1 }}>
        {showInstructions && !error && (
          <Box sx={{ p: 3, textAlign: "center", bgcolor: "#f5f5f5" }}>
            <CameraAlt sx={{ fontSize: 64, color: "#1976d2", mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Permissão da Câmera Necessária
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Para escanear QR Codes, precisamos acessar sua câmera.
              Clique no botão abaixo para permitir o acesso.
            </Typography>
            <Button
              variant="contained"
              startIcon={<CameraAlt />}
              onClick={requestCameraPermission}
              size="large"
            >
              Permitir Câmera
            </Button>
          </Box>
        )}

        {error ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <ErrorIcon sx={{ fontSize: 64, color: "#d32f2f", mb: 2 }} />
            <Alert 
              severity="error" 
              sx={{ mb: 2, textAlign: "left" }}
              action={
                <Button color="inherit" size="small" onClick={openCameraSettings}>
                  Configurações
                </Button>
              }
            >
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                Erro na Câmera
              </Typography>
              <Typography variant="body2">
                {error}
              </Typography>
            </Alert>
            
            <Box sx={{ display: "flex", gap: 2, justifyContent: "center", mt: 3 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setError("");
                  setShowInstructions(true);
                }}
              >
                Voltar
              </Button>
              <Button
                variant="contained"
                startIcon={<CameraAlt />}
                onClick={requestCameraPermission}
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
            gap: 2
          }}>
            <CircularProgress size={60} />
            <Typography variant="body1" color="text.secondary">
              Inicializando scanner...
            </Typography>
          </Box>
        ) : (
          <>
            <Box
              id="qr-reader"
              sx={{
                width: "100%",
                height: "100%",
                minHeight: 400,
                position: "relative",
                overflow: "hidden",
              }}
            />

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
              right: 0
            }}>
              <Typography variant="body2">
                📱 Posicione o QR Code dentro do quadro
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: "#f5f5f5", borderTop: "1px solid #e0e0e0" }}>
        <Box sx={{ display: "flex", gap: 1, flex: 1, flexWrap: "wrap" }}>
          {cameras.length > 1 && (
            <Button
              variant="outlined"
              startIcon={<SwitchCamera />}
              onClick={switchCamera}
              size="small"
            >
              Trocar Câmera
            </Button>
          )}
          
          <Button
            variant="outlined"
            startIcon={flash ? <FlashOff /> : <FlashOn />}
            onClick={toggleFlash}
            disabled={!scanner}
            size="small"
          >
            {flash ? "Flash Off" : "Flash"}
          </Button>
          
          <Box sx={{ flex: 1 }} />
          
          <Button 
            variant="outlined" 
            onClick={retryScanner}
            size="small"
          >
            Reiniciar
          </Button>
          
          <Button onClick={handleClose} variant="contained" size="small">
            Fechar
          </Button>
        </Box>
      </DialogActions>

      {/* Snackbar para feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default QRScanner;