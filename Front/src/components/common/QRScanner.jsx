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
  FlashOn,
  FlashOff,
  SwitchCamera,
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

  const initScanner = async () => {
    try {
      setLoading(true);
      setError("");

      // Limpa scanner anterior
      if (scanner) {
        await scanner.clear();
      }

      // Configura novo scanner
      // CORREÇÃO: Substituído Html5QrcodeScanType.SCAN_TYPE_CAMERA por valor numérico
      const html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
          supportedScanTypes: [2], // CORREÇÃO: SCAN_TYPE_CAMERA = 2
        },
        false
      );

      // Sucesso na leitura
      html5QrcodeScanner.render(
        (decodedText, decodedResult) => {
          console.log("✅ QR Code lido:", decodedText);
          
          // Para scanner
          html5QrcodeScanner.clear();
          
          // Processa o resultado
          let scanData;
          try {
            // Tenta parsear como JSON (backward compatibility)
            scanData = JSON.parse(decodedText);
          } catch {
            // Se não for JSON, trata como string/URL
            scanData = decodedText;
          }
          
          // Chama callback
          if (onScan) onScan(scanData);
        },
        (errorMessage) => {
          // Ignora erros comuns de não encontrar QR
          if (!errorMessage.includes("NotFoundException")) {
            console.log("ℹ️ Scanner:", errorMessage);
          }
        }
      );

      setScanner(html5QrcodeScanner);
    } catch (err) {
      console.error("🔥 Erro ao inicializar scanner:", err);
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && scanning) {
      initScanner();
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
    if (onClose) onClose();
  };

  const toggleFlash = () => {
    setFlash(!flash);
    // Aqui você implementaria o controle do flash se a API da câmera permitir
  };

  const switchCamera = async () => {
    if (scanner && cameras.length > 1) {
      try {
        const currentIndex = cameras.findIndex(cam => cam.id === cameraId);
        const nextIndex = (currentIndex + 1) % cameras.length;
        const nextCamera = cameras[nextIndex];
        
        await scanner.clear();
        setCameraId(nextCamera.id);
        await initScanner();
      } catch (err) {
        console.error("Erro ao trocar câmera:", err);
      }
    }
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      stream.getTracks().forEach(track => track.stop());
      setError("");
      await initScanner();
    } catch (err) {
      setError("Permissão da câmera negada. Por favor, permita o acesso à câmera nas configurações do navegador.");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: "#1976d2", 
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <QrCodeScanner />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Scanner de QR Code
          </Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: "white" }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, position: "relative" }}>
        {error ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Button
              variant="contained"
              startIcon={<CameraAlt />}
              onClick={requestCameraPermission}
            >
              Permitir Câmera
            </Button>
          </Box>
        ) : loading ? (
          <Box sx={{ 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            height: 400 
          }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box
              id="qr-reader"
              sx={{
                width: "100%",
                height: 400,
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
                <Box
                  sx={{
                    position: "absolute",
                    top: -3,
                    left: -3,
                    width: 30,
                    height: 30,
                    borderTop: "3px solid #1976d2",
                    borderLeft: "3px solid #1976d2",
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    top: -3,
                    right: -3,
                    width: 30,
                    height: 30,
                    borderTop: "3px solid #1976d2",
                    borderRight: "3px solid #1976d2",
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    bottom: -3,
                    left: -3,
                    width: 30,
                    height: 30,
                    borderBottom: "3px solid #1976d2",
                    borderLeft: "3px solid #1976d2",
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    bottom: -3,
                    right: -3,
                    width: 30,
                    height: 30,
                    borderBottom: "3px solid #1976d2",
                    borderRight: "3px solid #1976d2",
                  }}
                />
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
                Posicione o QR Code dentro do quadro
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: "#f5f5f5" }}>
        <Box sx={{ display: "flex", gap: 1, flex: 1 }}>
          <Button
            variant="outlined"
            startIcon={flash ? <FlashOff /> : <FlashOn />}
            onClick={toggleFlash}
            disabled={!scanner}
          >
            {flash ? "Desligar" : "Ligar"}
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<SwitchCamera />}
            onClick={switchCamera}
            disabled={cameras.length <= 1}
          >
            Trocar
          </Button>
          
          <Box sx={{ flex: 1 }} />
          
          <Button onClick={handleClose} variant="contained">
            Fechar
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default QRScanner;