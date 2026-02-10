// Front/src/components/common/QRScanner.jsx - VERSÃO DEFINITIVA
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
import { Html5QrcodeScanner } from "html5-qrcode";

const QRScanner = ({ open, onClose, onScan, autoStart = true, scanning = true }) => {
  const scannerRef = useRef(null);
  const qrReaderRef = useRef(null);
  const [scanner, setScanner] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  // Criar elemento qr-reader manualmente se não existir
  const ensureQRReaderElement = () => {
    let qrReaderElement = document.getElementById("qr-reader");
    
    if (!qrReaderElement) {
      console.log("🆕 Criando elemento qr-reader manualmente...");
      qrReaderElement = document.createElement("div");
      qrReaderElement.id = "qr-reader";
      qrReaderElement.style.width = "100%";
      qrReaderElement.style.height = "400px";
      qrReaderElement.style.position = "relative";
      qrReaderElement.style.overflow = "hidden";
      qrReaderElement.style.backgroundColor = "#000";
      qrReaderElement.style.display = "block";
      qrReaderElement.style.visibility = "visible";
      qrReaderElement.style.opacity = "1";
      
      // Encontrar o container no DialogContent
      const dialogContent = document.querySelector('[data-testid="qr-scanner-content"]');
      if (dialogContent) {
        dialogContent.appendChild(qrReaderElement);
        console.log("✅ Elemento qr-reader criado no DialogContent");
      } else {
        // Fallback: criar em um lugar visível
        const body = document.body;
        body.appendChild(qrReaderElement);
        qrReaderElement.style.position = "fixed";
        qrReaderElement.style.top = "50%";
        qrReaderElement.style.left = "50%";
        qrReaderElement.style.transform = "translate(-50%, -50%)";
        qrReaderElement.style.zIndex = "9999";
        console.log("⚠️ Elemento qr-reader criado no body (fallback)");
      }
    }
    
    return qrReaderElement;
  };

  // Solicitar permissão da câmera
  const requestCameraPermission = async () => {
    try {
      setLoading(true);
      setError("");
      
      console.log("📱 Solicitando permissão da câmera...");
      
      // Primeiro, garantir que temos o elemento
      ensureQRReaderElement();
      
      // Testar se podemos acessar a câmera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      // Parar o stream imediatamente (só queríamos a permissão)
      stream.getTracks().forEach(track => track.stop());
      
      setPermissionGranted(true);
      console.log("✅ Permissão da câmera concedida");
      
      // Pequeno delay antes de inicializar o scanner
      setTimeout(() => {
        initScanner();
      }, 300);
      
    } catch (err) {
      console.error("❌ Erro na permissão:", err);
      setPermissionGranted(false);
      setLoading(false);
      
      let errorMsg = "Não foi possível acessar a câmera.";
      if (err.name === 'NotAllowedError') {
        errorMsg = "Permissão da câmera negada. Por favor, permita o acesso nas configurações do navegador.";
      } else if (err.name === 'NotFoundError') {
        errorMsg = "Nenhuma câmera encontrada no dispositivo.";
      }
      
      setError(errorMsg);
    }
  };

  // Inicializar o scanner
  const initScanner = async () => {
    try {
      setLoading(true);
      setError("");
      setCameraReady(false);
      
      console.log("🔄 Inicializando scanner...");
      
      // Limpar scanner anterior
      if (scanner) {
        try {
          await scanner.clear();
          console.log("✅ Scanner anterior limpo");
        } catch (err) {
          console.log("ℹ️ Nenhum scanner anterior para limpar");
        }
      }
      
      // Garantir que o elemento existe
      const qrReaderElement = ensureQRReaderElement();
      
      // Verificar se o elemento está realmente no DOM
      if (!document.body.contains(qrReaderElement)) {
        throw new Error("Elemento qr-reader não está no DOM");
      }
      
      // Verificar se o elemento está visível
      const style = window.getComputedStyle(qrReaderElement);
      console.log("🔍 Estilo do elemento qr-reader:", {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        width: style.width,
        height: style.height
      });
      
      // Pequeno delay para garantir que o DOM está estável
      await new Promise(resolve => setTimeout(resolve, 100));
      
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
      
      setScanner(html5QrcodeScanner);
      setCameraReady(true);
      console.log("🎉 Scanner inicializado com sucesso!");
      
    } catch (err) {
      console.error("🔥 Erro ao inicializar scanner:", err);
      setError(`Erro: ${err.message || "Falha ao inicializar scanner"}`);
      
      // Tentar método alternativo se o erro for "element not found"
      if (err.message.includes("not found") || err.message.includes("not exist")) {
        console.log("🔄 Tentando método alternativo...");
        setTimeout(() => initScannerAlternative(), 500);
      }
    } finally {
      setLoading(false);
    }
  };

  // Método alternativo para inicializar scanner
  const initScannerAlternative = () => {
    console.log("🔄 Tentando método alternativo de inicialização...");
    
    try {
      // Usar um container diferente
      const alternativeContainer = document.createElement("div");
      alternativeContainer.id = "qr-reader-alt";
      alternativeContainer.style.width = "100%";
      alternativeContainer.style.height = "400px";
      alternativeContainer.style.backgroundColor = "#000";
      alternativeContainer.style.position = "relative";
      
      // Adicionar ao DialogContent
      const dialogContent = document.querySelector('[data-testid="qr-scanner-content"]');
      if (dialogContent) {
        // Remover elemento antigo se existir
        const oldElement = document.getElementById("qr-reader");
        if (oldElement) oldElement.remove();
        
        dialogContent.appendChild(alternativeContainer);
        
        // Criar scanner com ID alternativo
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
          supportedScanTypes: [2],
        };
        
        const altScanner = new Html5QrcodeScanner("qr-reader-alt", config, false);
        
        altScanner.render(
          (decodedText) => {
            console.log("✅ QR Code detectado (método alternativo):", decodedText);
            altScanner.clear().catch(() => {});
            
            let scanData;
            try {
              scanData = JSON.parse(decodedText);
            } catch {
              scanData = decodedText;
            }
            
            if (onScan) onScan(scanData);
          },
          (errorMessage) => {
            if (!errorMessage.includes("NotFoundException")) {
              console.log("ℹ️ Scanner (alt):", errorMessage);
            }
          }
        );
        
        setScanner(altScanner);
        setCameraReady(true);
        console.log("🎉 Scanner alternativo inicializado!");
      }
    } catch (err) {
      console.error("❌ Método alternativo também falhou:", err);
      setError("Não foi possível iniciar a câmera. Tente recarregar a página.");
    }
  };

  // Limpar scanner
  const clearScanner = async () => {
    if (scanner) {
      try {
        console.log("🧹 Limpando scanner...");
        await scanner.clear();
        console.log("✅ Scanner limpo");
      } catch (err) {
        console.log("ℹ️ Erro ao limpar scanner (pode já estar limpo):", err);
      }
    }
    
    // Remover elementos criados
    const qrReaderElement = document.getElementById("qr-reader");
    if (qrReaderElement) {
      qrReaderElement.remove();
    }
    
    const altElement = document.getElementById("qr-reader-alt");
    if (altElement) {
      altElement.remove();
    }
    
    setScanner(null);
    setCameraReady(false);
    setPermissionGranted(false);
  };

  // Efeito principal
  useEffect(() => {
    if (open && scanning) {
      console.log("🚀 Scanner: Modal aberto, iniciando...");
      
      // Pequeno delay para o modal abrir completamente
      const timer = setTimeout(() => {
        requestCameraPermission();
      }, 500);
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [open, scanning]);

  // Cleanup quando fechar
  useEffect(() => {
    return () => {
      console.log("🔚 Scanner: Componente desmontado, limpando...");
      clearScanner();
    };
  }, []);

  // Fechar modal
  const handleClose = () => {
    console.log("❌ Fechando scanner...");
    clearScanner();
    if (onClose) onClose();
  };

  // Tentar novamente
  const handleRetry = async () => {
    console.log("🔄 Tentando novamente...");
    setError("");
    await clearScanner();
    await requestCameraPermission();
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
        data-testid="qr-scanner-content"
        sx={{ 
          p: 0, 
          position: "relative", 
          minHeight: 400,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {error ? (
          <Box sx={{ p: 3, textAlign: "center", width: "100%" }}>
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
            width: "100%",
            gap: 2
          }}>
            <CircularProgress size={60} />
            <Typography variant="body1" color="text.secondary">
              {permissionGranted ? "Inicializando câmera..." : "Solicitando permissão..."}
            </Typography>
          </Box>
        ) : cameraReady ? (
          <>
            {/* O elemento qr-reader será inserido aqui pelo JavaScript */}
            <Box sx={{ width: "100%", height: 400, position: "relative" }}>
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
                  zIndex: 1000,
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
                zIndex: 1000,
              }}>
                <Typography variant="body2">
                  📱 Posicione o QR Code dentro do quadro
                </Typography>
              </Box>
            </Box>
          </>
        ) : (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <CameraAlt sx={{ fontSize: 64, color: "#1976d2", mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Permissão da Câmera Necessária
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Para escanear QR Codes, precisamos acessar sua câmera.
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