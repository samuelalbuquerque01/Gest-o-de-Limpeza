// Front/src/components/common/QRScanner.jsx - VERSÃO CORRIGIDA
import React, { useEffect, useRef, useState, useCallback } from "react";
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
import { Html5QrcodeScanner } from "html5-qrcode";

const QRScanner = ({ open, onClose, onScan, autoStart = true, scanning = true }) => {
  const qrReaderRef = useRef(null);
  const [scanner, setScanner] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Função para inicializar o scanner
  const initScanner = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      console.log("🔄 Inicializando scanner...");

      // Limpar scanner anterior se existir
      if (scanner) {
        try {
          await scanner.clear();
          console.log("✅ Scanner anterior limpo");
        } catch (cleanError) {
          console.log("ℹ️ Não havia scanner anterior ou já estava limpo");
        }
      }

      // Aguardar um pouco para garantir que o DOM está pronto
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verificar se o elemento existe
      const qrReaderElement = document.getElementById("qr-reader");
      console.log("🔍 Procurando elemento qr-reader:", qrReaderElement);
      
      if (!qrReaderElement) {
        throw new Error("Elemento qr-reader não encontrado no DOM. Aguarde um pouco e tente novamente.");
      }

      // Verificar se o elemento está visível
      const style = window.getComputedStyle(qrReaderElement);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        console.warn("⚠️ Elemento qr-reader não está visível");
      }

      // Configurar scanner
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        supportedScanTypes: [2], // SCAN_TYPE_CAMERA
        showTorchButtonIfSupported: false,
      };

      console.log("⚙️ Criando Html5QrcodeScanner...");
      const html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", config, false);

      // Renderizar scanner
      console.log("🎬 Renderizando scanner...");
      html5QrcodeScanner.render(
        (decodedText) => {
          console.log("✅ QR Code detectado:", decodedText);
          
          // Parar scanner
          html5QrcodeScanner.clear().catch(() => {});
          
          // Processar resultado
          let scanData;
          try {
            scanData = JSON.parse(decodedText);
          } catch {
            scanData = decodedText;
          }
          
          // Chamar callback com pequeno delay
          setTimeout(() => {
            if (onScan) onScan(scanData);
          }, 100);
        },
        (errorMessage) => {
          // Ignorar erros de "não encontrado"
          if (!errorMessage.includes("NotFoundException")) {
            console.log("ℹ️ Scanner status:", errorMessage);
          }
        }
      );

      setScanner(html5QrcodeScanner);
      setIsInitialized(true);
      console.log("🎉 Scanner inicializado com sucesso!");
      
    } catch (err) {
      console.error("🔥 Erro ao inicializar scanner:", err);
      setError(`Erro: ${err.message || "Falha ao inicializar scanner"}`);
    } finally {
      setLoading(false);
    }
  }, [scanner, onScan]);

  // Função para limpar scanner
  const clearScanner = useCallback(async () => {
    if (scanner) {
      try {
        console.log("🧹 Limpando scanner...");
        await scanner.clear();
        setScanner(null);
        setIsInitialized(false);
        console.log("✅ Scanner limpo");
      } catch (err) {
        console.log("ℹ️ Erro ao limpar scanner (pode já estar limpo):", err);
      }
    }
  }, [scanner]);

  // Efeito principal
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (open && scanning && mounted) {
        console.log("🚀 Scanner: Iniciando...");
        
        // Pequeno delay para garantir que o modal está completamente aberto
        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (mounted) {
          await initScanner();
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
      console.log("🔚 Scanner: Limpando efeito");
      clearScanner();
    };
  }, [open, scanning, initScanner, clearScanner]);

  // Função para lidar com o fechamento
  const handleClose = () => {
    console.log("❌ Fechando scanner...");
    clearScanner();
    if (onClose) onClose();
  };

  // Função para tentar novamente
  const handleRetry = async () => {
    console.log("🔄 Tentando novamente...");
    setError("");
    await clearScanner();
    await new Promise(resolve => setTimeout(resolve, 200));
    await initScanner();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={window.innerWidth < 768}
      onEntered={() => {
        console.log("✅ Modal completamente aberto");
      }}
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

      <DialogContent sx={{ p: 0, position: "relative", minHeight: 400 }}>
        {error ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Alert 
              severity="error" 
              sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small" onClick={handleRetry}>
                  Tentar
                </Button>
              }
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
                startIcon={<Refresh />}
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
            gap: 2
          }}>
            <CircularProgress size={60} />
            <Typography variant="body1" color="text.secondary">
              Inicializando scanner...
            </Typography>
          </Box>
        ) : (
          <>
            {/* Container principal para o scanner */}
            <Box
              id="qr-reader"
              ref={qrReaderRef}
              sx={{
                width: "100%",
                height: 400,
                position: "relative",
                overflow: "hidden",
                backgroundColor: "#000",
                display: "block !important", // Forçar exibição
                visibility: "visible !important",
                opacity: "1 !important",
              }}
            >
              {/* Placeholder enquanto carrega */}
              {!isInitialized && (
                <Box sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "#000",
                }}>
                  <Typography variant="body2" color="white">
                    Inicializando câmera...
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Overlay com guias */}
            {isInitialized && (
              <>
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
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: "#f5f5f5", borderTop: "1px solid #e0e0e0" }}>
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
      </DialogActions>
    </Dialog>
  );
};

export default QRScanner;