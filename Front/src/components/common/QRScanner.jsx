// Front/src/components/common/QRScanner.jsx - VERSÃO COM SOLUÇÃO DEFINITIVA PARA CELULAR
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Collapse,
} from "@mui/material";
import {
  QrCodeScanner,
  Close,
  CameraAlt,
  FlashOn,
  FlashOff,
  SwitchCamera,
  Info,
  Settings,
  Refresh,
  Smartphone,
  Warning,
  CheckCircle,
  ExpandMore,
  ExpandLess,
} from "@mui/icons-material";
import { Html5QrcodeScanner } from "html5-qrcode";

const QRScanner = ({ open, onClose, onScan, autoStart = true, scanning = true }) => {
  const scannerRef = useRef(null);
  const [scanner, setScanner] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({});
  const [permissionState, setPermissionState] = useState("prompt"); // prompt, granted, denied

  // Detectar dispositivo e informações
  useEffect(() => {
    const detectDevice = () => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isAndroid = /Android/i.test(navigator.userAgent);
      const isChrome = /Chrome/i.test(navigator.userAgent);
      const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent);
      
      setDeviceInfo({
        isMobile,
        isIOS,
        isAndroid,
        isChrome,
        isSafari,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      });
    };
    
    detectDevice();
  }, []);

  // Verificar status da permissão
  const checkPermission = async () => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const permission = await navigator.permissions.query({ name: 'camera' });
        setPermissionState(permission.state);
        
        permission.onchange = () => {
          setPermissionState(permission.state);
          if (permission.state === 'granted') {
            initScanner();
          }
        };
      }
    } catch (err) {
      console.log("API de permissões não disponível");
    }
  };

  const initScanner = async () => {
    try {
      setLoading(true);
      setError("");
      setShowTroubleshoot(false);

      // Limpar scanner anterior
      if (scanner) {
        await scanner.clear().catch(() => {});
      }

      // Verificar HTTPS
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isHttps = window.location.protocol === 'https:';
      
      if (!isLocalhost && !isHttps) {
        setError("❌ A câmera só funciona em HTTPS ou localhost.");
        setLoading(false);
        return;
      }

      // Verificar se está em iframe (bloqueia câmera)
      if (window.self !== window.top) {
        setError("❌ O scanner não funciona dentro de iframes. Abra em uma janela separada.");
        setLoading(false);
        return;
      }

      // Solicitar permissão da câmera de forma direta primeiro
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        // Parar stream imediatamente (só queríamos a permissão)
        stream.getTracks().forEach(track => track.stop());
        
        console.log("✅ Permissão da câmera concedida");
        setPermissionState("granted");
      } catch (permError) {
        console.error("❌ Erro na permissão:", permError);
        throw permError;
      }

      // Configurar e iniciar scanner
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        supportedScanTypes: [2],
      };

      const html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", config, false);

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
            setTimeout(() => onScan(scanData), 100);
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
      setError("");
      
    } catch (err) {
      console.error("🔥 Erro crítico no scanner:", err);
      
      let errorMessage = "Não foi possível acessar a câmera.";
      let showTroubleshoot = true;

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = `
          Permissão da câmera negada ou bloqueada.
          
          📱 **Para permitir no celular:**
          
          1. Toque no **ícone de cadeado 🔒** na barra de endereço
          2. Em "Permissões do site", procure por **"Câmera"**
          3. Mude para **"Permitir"**
          4. Recarregue esta página
          
          🔧 **Se não aparecer:**
          - Vá em Configurações do Navegador > Site Settings > Camera
          - Limpe cache e dados do navegador
          - Reinicie o navegador
        `;
        setPermissionState("denied");
      } else if (err.name === 'NotFoundError') {
        errorMessage = "Nenhuma câmera encontrada no dispositivo.";
        showTroubleshoot = false;
      } else if (err.name === 'NotReadableError') {
        errorMessage = "A câmera está sendo usada por outro aplicativo. Feche outros apps que usam câmera e tente novamente.";
      } else if (err.message && err.message.includes('iframe')) {
        errorMessage = "Não é possível usar câmera dentro de iframes. Por favor, abra o scanner em uma nova aba.";
        showTroubleshoot = false;
      }

      setError(errorMessage);
      setShowTroubleshoot(showTroubleshoot);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkPermission();
    
    if (open && scanning) {
      // Pequeno delay para o modal abrir completamente
      setTimeout(() => {
        initScanner();
      }, 500);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
  }, [open, scanning]);

  const handleClose = () => {
    if (scanner) {
      scanner.clear().catch(() => {});
    }
    setScanner(null);
    if (onClose) onClose();
  };

  const requestPermissionDirectly = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Técnica mais direta para forçar o prompt de permissão
      const constraints = {
        video: {
          facingMode: "environment",
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 }
        }
      };
      
      // Esta linha deve mostrar o prompt nativo do navegador
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Imediatamente parar o stream
      stream.getTracks().forEach(track => {
        track.stop();
      });
      
      // Pequeno delay para garantir que a permissão foi registrada
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reiniciar o scanner
      await initScanner();
      
    } catch (err) {
      console.error("Erro direto:", err);
      setError(`
        ❌ O navegador não mostrou o prompt de permissão.
        
        **Soluções:**
        
        1. **Limpar configurações do site:**
           - Toque no ícone de cadeado 🔒 > Configurações do site
           - Procure por "Câmera" e limpe as configurações
           - Recarregue a página
        
        2. **Permitir manualmente:**
           - Ajustes > ${deviceInfo.isChrome ? 'Chrome' : 'Safari'} > Câmera
           - Encontre este site e permita a câmera
        
        3. **Alternativas:**
           - Tente em modo anônimo/privado
           - Use outro navegador (Chrome funciona melhor)
           - Reinicie o celular
      `);
      setShowTroubleshoot(true);
      setLoading(false);
    }
  };

  const openBrowserSettings = () => {
    // Tenta abrir páginas de configuração baseadas no navegador
    let settingsUrl = '';
    
    if (deviceInfo.isChrome && deviceInfo.isAndroid) {
      settingsUrl = 'chrome://settings/content/camera';
    } else if (deviceInfo.isChrome && deviceInfo.isIOS) {
      settingsUrl = 'app-settings:';
    } else if (deviceInfo.isSafari) {
      // Safari não tem URL direta, mostra instruções
      setError(prev => prev + "\n\n📱 **Para Safari iOS:**\n1. Ajustes > Safari\n2. Câmera\n3. Permitir para este site");
      return;
    }
    
    if (settingsUrl) {
      window.open(settingsUrl, '_blank');
    } else {
      setError(prev => prev + "\n\n🔧 **Vá manualmente em:**\nConfigurações do celular > Navegador > Permissões de site > Câmera");
    }
  };

  const clearSiteData = () => {
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
        });
      });
    }
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister();
        });
      });
    }
    
    // Limpar localStorage e sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
    setError("Cache limpo! Por favor, RECARREGUE A PÁGINA (toque em F5 ou ícone de recarregar).");
  };

  const TestCameraButton = () => (
    <Button
      variant="outlined"
      startIcon={<CameraAlt />}
      onClick={() => {
        window.open('/test-camera', '_blank');
      }}
      sx={{ mt: 2 }}
    >
      Testar Câmera Separadamente
    </Button>
  );

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
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: "#1976d2", 
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        py: { xs: 1.5, sm: 2 },
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <QrCodeScanner sx={{ fontSize: { xs: 24, sm: 28 } }} />
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Scanner QR Code
          </Typography>
        </Box>
        <IconButton 
          onClick={handleClose} 
          sx={{ color: "white", p: { xs: 0.5, sm: 1 } }}
          size="small"
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, position: "relative", overflow: 'auto' }}>
        {error ? (
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Alert 
              severity="error" 
              icon={<Warning />}
              sx={{ mb: 2 }}
            >
              <Typography variant="body1" sx={{ fontWeight: 600, whiteSpace: 'pre-line' }}>
                {error.split('\n')[0]}
              </Typography>
            </Alert>
            
            <Paper sx={{ p: 2, bgcolor: '#fffde7', mb: 2 }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                {error}
              </Typography>
            </Paper>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<CameraAlt />}
                onClick={requestPermissionDirectly}
                size="large"
                fullWidth
              >
                Tentar Permitir Câmera Novamente
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<Settings />}
                onClick={openBrowserSettings}
                size="large"
                fullWidth
              >
                Abrir Configurações do Navegador
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={clearSiteData}
                size="large"
                fullWidth
                color="warning"
              >
                Limpar Cache e Dados do Site
              </Button>
              
              <Button
                variant="outlined"
                onClick={() => window.location.reload()}
                size="large"
                fullWidth
              >
                🔄 Recarregar Página
              </Button>

              <TestCameraButton />
            </Box>

            <Button
              fullWidth
              onClick={() => setShowTroubleshoot(!showTroubleshoot)}
              endIcon={showTroubleshoot ? <ExpandLess /> : <ExpandMore />}
              sx={{ mt: 2 }}
            >
              Solução de Problemas Detalhada
            </Button>

            <Collapse in={showTroubleshoot}>
              <Paper sx={{ p: 2, mt: 1, bgcolor: '#f5f5f5' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Guia Completo para Habilitar Câmera:
                </Typography>
                <List dense>
                  {deviceInfo.isAndroid && deviceInfo.isChrome && (
                    <>
                      <ListItem>
                        <ListItemIcon><Smartphone /></ListItemIcon>
                        <ListItemText 
                          primary="Chrome no Android" 
                          secondary="1. Toque nos 3 pontos ⋮ → Configurações → Configurações do site → Câmera → Permitir"
                        />
                      </ListItem>
                      <Divider />
                    </>
                  )}
                  {deviceInfo.isIOS && deviceInfo.isSafari && (
                    <>
                      <ListItem>
                        <ListItemIcon><Smartphone /></ListItemIcon>
                        <ListItemText 
                          primary="Safari no iPhone/iPad" 
                          secondary="1. Ajustes → Safari → Câmera → Permitir"
                        />
                      </ListItem>
                      <Divider />
                    </>
                  )}
                  <ListItem>
                    <ListItemIcon><Info /></ListItemIcon>
                    <ListItemText 
                      primary="Solução Geral" 
                      secondary="• Use modo anônimo/privado\n• Tente outro navegador (Chrome funciona melhor)\n• Reinicie o celular\n• Atualize o navegador"
                    />
                  </ListItem>
                </List>
              </Paper>
            </Collapse>
          </Box>
        ) : loading ? (
          <Box sx={{ 
            display: "flex", 
            flexDirection: "column",
            justifyContent: "center", 
            alignItems: "center", 
            height: 300,
            gap: 2
          }}>
            <CircularProgress size={50} />
            <Typography variant="body1" color="text.secondary">
              Preparando scanner...
            </Typography>
            {permissionState === "prompt" && (
              <Typography variant="caption" color="text.secondary">
                Aguardando permissão da câmera...
              </Typography>
            )}
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
                bgcolor: "#000",
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

            <Box sx={{ 
              textAlign: "center", 
              p: 2,
              bgcolor: "rgba(0,0,0,0.7)",
              color: "white",
            }}>
              <Typography variant="body2">
                📱 Posicione o QR Code dentro do quadro
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: "#f5f5f5", borderTop: "1px solid #e0e0e0" }}>
        <Button onClick={handleClose} variant="contained">
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QRScanner;