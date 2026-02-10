// Front/src/pages/QRScan.jsx - VERSÃO COMPLETA COM REDIRECIONAMENTO AUTOMÁTICO
import React, { useState, useEffect } from "react";
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Alert, 
  CircularProgress,
  Card,
  CardContent,
  Avatar,
  Chip,
  Divider,
  Container,
  Grid
} from "@mui/material";
import { 
  QrCodeScanner, 
  CleaningServices,
  LocationOn,
  Person,
  Warning,
  CheckCircle,
  CameraAlt,
  ArrowBack
} from "@mui/icons-material";
import { useNavigate, useSearchParams } from "react-router-dom";
import QRScanner from "../components/common/QRScanner";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export default function QRScan() {
  const [open, setOpen] = useState(true); // Scanner aberto por padrão
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roomData, setRoomData] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [redirectCountdown, setRedirectCountdown] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Efeito para verificar se usuário está logado
  useEffect(() => {
    if (!user) {
      navigate("/worker/login");
      return;
    }
  }, [user, navigate]);

  // Efeito para contagem regressiva de redirecionamento
  useEffect(() => {
    if (redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(redirectCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (redirectCountdown === 0 && roomData?.id) {
      // Redirecionar quando a contagem chegar a 0
      navigate(`/worker?room=${roomData.id}&action=start&fromScan=true`);
    }
  }, [redirectCountdown, roomData, navigate]);

  const handleScanResult = async (data) => {
    try {
      console.log("🔍 [QRScan] Dado recebido do scanner:", data);
      console.log("🔍 [QRScan] Tipo:", typeof data);
      
      setScanning(false);
      setLoading(true);
      setError("");
      
      let roomId = null;
      let qrCode = null;

      // CASO 1: Se for uma URL completa
      if (typeof data === 'string' && (data.includes('http://') || data.includes('https://'))) {
        console.log("📱 [QRScan] É uma URL");
        
        try {
          // Parse da URL
          const url = new URL(data);
          
          // Extrair parâmetros da query string
          roomId = url.searchParams.get('roomId') || url.searchParams.get('roomid');
          qrCode = url.searchParams.get('qr') || url.searchParams.get('qrcode');
          
          console.log("📱 [QRScan] Parâmetros extraídos:", { roomId, qrCode });
          
          // Se não encontrou roomId na query, verificar no path
          if (!roomId) {
            const pathParts = url.pathname.split('/');
            // Tentar encontrar ID no path (ex: /rooms/abc123)
            const possibleId = pathParts.find(part => part.length === 24 || part.length === 36); // IDs comuns
            if (possibleId) {
              roomId = possibleId;
              console.log("📱 [QRScan] ID encontrado no path:", roomId);
            }
          }
          
          // Se não encontrou QR Code na query, verificar no path
          if (!qrCode && url.pathname.includes('QR-')) {
            const qrFromPath = url.pathname.split('/').find(part => part.startsWith('QR-'));
            if (qrFromPath) {
              qrCode = qrFromPath;
              console.log("📱 [QRScan] QR Code encontrado no path:", qrCode);
            }
          }
        } catch (urlError) {
          console.warn("⚠️ [QRScan] Erro ao parsear URL:", urlError);
          // Pode ser apenas o código do QR Code sem URL completa
          if (data.startsWith('QR-')) {
            qrCode = data;
          }
        }
      }
      
      // CASO 2: Se for apenas o código do QR (formato: QR-TYPE-NAME-LOCATION-XXXX)
      else if (typeof data === 'string' && data.startsWith('QR-')) {
        console.log("🔑 [QRScan] É um código QR:", data.substring(0, 30));
        qrCode = data;
      }
      
      // CASO 3: Se for JSON string
      else if (typeof data === 'string' && (data.includes('{') || data.includes('roomId'))) {
        console.log("📝 [QRScan] É um JSON string");
        try {
          const parsedData = JSON.parse(data);
          roomId = parsedData.roomId || parsedData.id;
          qrCode = parsedData.qrCode;
          console.log("📝 [QRScan] JSON parseado:", { roomId, qrCode });
        } catch (parseError) {
          console.warn("⚠️ [QRScan] Não é JSON válido");
        }
      }
      
      console.log("🎯 [QRScan] Buscando sala com:", { roomId, qrCode });

      // PRIMEIRA TENTATIVA: Buscar pelo roomId (se disponível)
      if (roomId) {
        try {
          console.log(`🔍 [QRScan] Tentativa 1: Buscando por roomId: ${roomId}`);
          const response = await api.get(`/rooms/${roomId}`);
          
          if (response.success && response.room) {
            console.log(`✅ [QRScan] Sala encontrada via roomId: ${response.room.name}`);
            handleRoomFound(response.room);
            return;
          }
        } catch (err) {
          console.warn(`⚠️ [QRScan] Erro ao buscar por roomId:`, err.message);
        }
      }
      
      // SEGUNDA TENTATIVA: Buscar pelo QR Code
      if (qrCode) {
        try {
          console.log(`🔍 [QRScan] Tentativa 2: Buscando por QR Code: ${qrCode.substring(0, 20)}...`);
          const response = await api.get(`/rooms/qr/${encodeURIComponent(qrCode)}`);
          
          if (response.success && response.data?.room) {
            console.log(`✅ [QRScan] Sala encontrada via QR Code: ${response.data.room.name}`);
            handleRoomFound(response.data.room);
            return;
          }
        } catch (err) {
          console.warn(`⚠️ [QRScan] Erro ao buscar por QR Code:`, err.message);
          
          // TENTATIVA 2.1: Buscar todas as salas e filtrar pelo QR Code
          try {
            console.log(`🔍 [QRScan] Tentativa 2.1: Buscando todas as salas para encontrar QR Code`);
            const allRoomsResponse = await api.get('/rooms/available');
            
            if (allRoomsResponse.success && allRoomsResponse.rooms) {
              const foundRoom = allRoomsResponse.rooms.find(room => room.qrCode === qrCode);
              if (foundRoom) {
                console.log(`✅ [QRScan] Sala encontrada via busca em todas: ${foundRoom.name}`);
                handleRoomFound(foundRoom);
                return;
              }
            }
          } catch (fallbackErr) {
            console.error("🔥 [QRScan] Fallback também falhou:", fallbackErr);
          }
        }
      }
      
      // TERCEIRA TENTATIVA: Buscar por todas as salas e tentar encontrar por qualquer critério
      if (!roomId && !qrCode && data) {
        try {
          console.log(`🔍 [QRScan] Tentativa 3: Buscando em todas as salas`);
          const allRoomsResponse = await api.get('/rooms/available');
          
          if (allRoomsResponse.success && allRoomsResponse.rooms) {
            // Tentar encontrar sala por qualquer parte do dado
            const searchString = String(data).toLowerCase();
            const foundRoom = allRoomsResponse.rooms.find(room => 
              room.name.toLowerCase().includes(searchString) ||
              room.qrCode?.toLowerCase().includes(searchString) ||
              room.location.toLowerCase().includes(searchString)
            );
            
            if (foundRoom) {
              console.log(`✅ [QRScan] Sala encontrada via busca textual: ${foundRoom.name}`);
              handleRoomFound(foundRoom);
              return;
            }
          }
        } catch (err) {
          console.error("🔥 [QRScan] Erro na busca textual:", err);
        }
      }
      
      // Se não encontrou nada
      console.error("❌ [QRScan] Nenhuma sala encontrada para os dados:", data);
      setError("QR Code não reconhecido. Sala não encontrada no sistema.");
      setLoading(false);
      
    } catch (err) {
      console.error("🔥 [QRScan] Erro geral ao processar scan:", err);
      setError("Erro ao processar QR Code: " + (err.message || "Erro desconhecido"));
      setLoading(false);
    }
  };

  const handleRoomFound = async (room) => {
    setRoomData(room);
    setScanResult({ 
      room, 
      success: true,
      message: 'Sala encontrada com sucesso' 
    });
    setLoading(false);
    
    // Verificar se sala já está sendo limpa
    try {
      const cleaningResponse = await api.get('/cleaning/active');
      if (cleaningResponse.success && cleaningResponse.data) {
        const isBeingCleaned = cleaningResponse.data.some(
          cleaning => cleaning.roomId === room.id || cleaning.room?.id === room.id
        );
        
        if (isBeingCleaned) {
          setError("⚠️ Esta sala já está sendo limpa por outro funcionário.");
          return;
        }
      }
    } catch (cleaningErr) {
      console.warn("⚠️ [QRScan] Não foi possível verificar se sala está sendo limpa:", cleaningErr);
    }
    
    // Iniciar contagem regressiva para redirecionamento automático (5 segundos)
    setRedirectCountdown(5);
  };

  const handleStartCleaning = () => {
    if (roomData?.id) {
      navigate(`/worker?room=${roomData.id}&action=start&fromScan=true`);
    }
  };

  const handleRetry = () => {
    setOpen(true);
    setScanning(true);
    setRoomData(null);
    setScanResult(null);
    setError("");
    setRedirectCountdown(null);
  };

  const handleBackToDashboard = () => {
    navigate("/worker");
  };

  const getRoomIcon = (type) => {
    switch (type) {
      case "BATHROOM":
        return "🚽";
      case "KITCHEN":
        return "🍳";
      case "MEETING_ROOM":
        return "📊";
      default:
        return "🚪";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "COMPLETED":
        return "success";
      case "IN_PROGRESS":
        return "warning";
      case "PENDING":
        return "info";
      case "NEEDS_ATTENTION":
        return "error";
      default:
        return "default";
    }
  };

  const renderScannerSection = () => {
    return (
      <>
        <QRScanner
          open={open}
          onClose={() => setOpen(false)}
          onScan={handleScanResult}
          scanning={scanning}
        />
        
        {scanning && !roomData && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Box sx={{ 
              display: 'inline-block',
              position: 'relative',
              mb: 3
            }}>
              <QrCodeScanner sx={{ 
                fontSize: 80, 
                color: "#1976d2",
                animation: "pulse 2s infinite"
              }} />
              <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 60,
                height: 2,
                backgroundColor: '#1976d2',
                animation: 'scanLine 2s linear infinite'
              }} />
            </Box>
            <Typography variant="h6" gutterBottom>
              Aguardando leitura do QR Code...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Aponte a câmera para o QR Code na porta da sala
            </Typography>
          </Box>
        )}
      </>
    );
  };

  const renderRoomInfo = () => {
    if (!roomData) return null;

    return (
      <Card sx={{ 
        border: "2px solid #1976d2", 
        borderRadius: 3,
        animation: "fadeIn 0.5s ease-in",
        mt: 3
      }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
            <Avatar sx={{ 
              bgcolor: "#1976d2", 
              width: 60, 
              height: 60,
              fontSize: "2rem",
              mr: 2 
            }}>
              {getRoomIcon(roomData.type)}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                {roomData.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <LocationOn fontSize="small" />
                {roomData.location}
              </Typography>
            </Box>
            <Chip 
              label={roomData.status} 
              color={getStatusColor(roomData.status)}
              sx={{ fontWeight: 700 }}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Tipo
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {roomData.type === "BATHROOM" ? "Banheiro" :
                 roomData.type === "KITCHEN" ? "Cozinha" :
                 roomData.type === "MEETING_ROOM" ? "Sala de Reunião" : "Sala"}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                QR Code
              </Typography>
              <Typography variant="body1" sx={{ 
                fontWeight: 600,
                fontFamily: "monospace",
                fontSize: "0.9rem"
              }}>
                {roomData.qrCode ? `${roomData.qrCode.substring(0, 20)}...` : 'Não gerado'}
              </Typography>
            </Grid>
          </Grid>

          {redirectCountdown !== null && (
            <Alert 
              severity="success" 
              icon={<CheckCircle />}
              sx={{ mb: 3 }}
            >
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                ✅ Sala encontrada!
              </Typography>
              <Typography variant="body2">
                Redirecionando para página de limpeza em {redirectCountdown} segundos...
              </Typography>
            </Alert>
          )}

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              startIcon={<CleaningServices />}
              onClick={handleStartCleaning}
              sx={{ 
                flex: 1,
                minWidth: 200,
                bgcolor: "#1976d2"
              }}
              size="large"
            >
              Iniciar Limpeza Agora
            </Button>

            <Button
              variant="outlined"
              startIcon={<QrCodeScanner />}
              onClick={handleRetry}
              sx={{ flex: 1, minWidth: 200 }}
              size="large"
            >
              Escanear Outro
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar sx={{ bgcolor: "#1976d2", width: 56, height: 56 }}>
              <QrCodeScanner />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "#1976d2" }}>
                Scanner de QR Code
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Escaneie o QR Code da sala para iniciar a limpeza
              </Typography>
            </Box>
          </Box>
          
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={handleBackToDashboard}
          >
            Voltar
          </Button>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }} 
            onClose={() => setError("")}
            action={
              <Button color="inherit" size="small" onClick={handleRetry}>
                Tentar Novamente
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* Scanner */}
        <Box sx={{ mb: 3 }}>
          {renderScannerSection()}
        </Box>

        {/* Loading */}
        {loading && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6">Processando QR Code...</Typography>
            <Typography variant="body2" color="text.secondary">
              Buscando informações da sala
            </Typography>
          </Box>
        )}

        {/* Resultado do Scan */}
        {renderRoomInfo()}

        {/* Instruções */}
        {!roomData && !loading && !scanning && (
          <Paper sx={{ p: 3, bgcolor: "#f5f5f5", borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              📋 Como usar:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 20, color: "#666" }}>
              <li><Typography variant="body2">Aponte a câmera para o QR Code na porta da sala</Typography></li>
              <li><Typography variant="body2">Mantenha o QR Code dentro do quadro da câmera</Typography></li>
              <li><Typography variant="body2">A leitura é automática - não precisa tirar foto</Typography></li>
              <li><Typography variant="body2">O sistema redirecionará automaticamente para a página de limpeza</Typography></li>
            </ul>
            
            <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/worker')}
              >
                Ir para Dashboard
              </Button>
              <Button
                variant="contained"
                onClick={() => setOpen(true)}
                startIcon={<QrCodeScanner />}
              >
                Abrir Scanner
              </Button>
            </Box>
          </Paper>
        )}
      </Paper>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
        @keyframes scanLine {
          0% { transform: translate(-50%, -50%) translateY(-30px); }
          100% { transform: translate(-50%, -50%) translateY(30px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Container>
  );
}