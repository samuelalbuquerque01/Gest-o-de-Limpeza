// Front/src/pages/QRScan.jsx - VERSÃO CORRIGIDA COMPLETA
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
  Container
} from "@mui/material";
import { 
  QrCodeScanner, 
  CleaningServices,
  LocationOn,
  AccessTime,
  Person,
  Warning,
  CheckCircle,
  CameraAlt,
  ArrowBack
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import QRScanner from "../components/common/QRScanner";
import api from "../services/api";

export default function QRScan() {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roomData, setRoomData] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const navigate = useNavigate();

  // Efeito para auto-start quando a página carrega
  useEffect(() => {
    setOpen(true);
    setScanning(true);
  }, []);

  const handleScanResult = async (data) => {
    try {
      console.log("🔍 Scan result recebido:", data);
      setScanning(false);
      setLoading(true);
      setError("");

      // Se data for uma URL string (o QR Code contém URL)
      if (typeof data === 'string' && data.includes('https://')) {
        // Extrai roomId e qrCode da URL
        const url = new URL(data);
        const roomId = url.searchParams.get('roomId');
        const qrCode = url.searchParams.get('qr');
        
        console.log("📱 Extraído da URL:", { roomId, qrCode });
        
        // Busca dados da sala usando roomId ou qrCode
        if (roomId) {
          const response = await api.get(`/rooms/${roomId}`);
          if (response.success) {
            setRoomData(response.room);
            setScanResult(response.room);
          } else {
            setError("Sala não encontrada");
          }
        } else if (qrCode) {
          const response = await api.get(`/rooms/qr/${encodeURIComponent(qrCode)}`);
          if (response.success) {
            setRoomData(response.room);
            setScanResult(response.room);
          } else {
            setError("QR Code não encontrado");
          }
        }
      }
      // Se data for um objeto (backward compatibility)
      else if (data && typeof data === 'object') {
        console.log("📦 Dados do scan (objeto):", data);
        
        if (data.isBeingCleaned) {
          setError(`⚠️ Esta sala já está sendo limpa por ${data.currentCleaner?.name || 'outro funcionário'}`);
          setRoomData(data.room);
          setScanResult(data);
          return;
        }
        
        if (data.room) {
          setRoomData(data.room);
          setScanResult(data);
          
          // Se pode iniciar limpeza, prepara para redirecionar
          if (data.scanInfo?.canStartCleaning) {
            setTimeout(() => {
              navigate(`/worker?room=${data.room.id}&action=start`);
            }, 3000);
          }
        } else {
          setError("QR Code não reconhecido");
        }
      } else {
        setError("Formato de QR Code não suportado");
      }
    } catch (err) {
      console.error("🔥 Erro ao processar scan:", err);
      setError("Erro ao processar QR Code: " + (err.message || "Erro desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  const handleStartCleaning = () => {
    if (roomData?.id) {
      navigate(`/worker?room=${roomData.id}&action=start`);
    } else if (scanResult?.room?.id) {
      navigate(`/worker?room=${scanResult.room.id}&action=start`);
    }
  };

  const handleRetry = () => {
    setOpen(true);
    setScanning(true);
    setRoomData(null);
    setScanResult(null);
    setError("");
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
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {/* Scanner */}
        <Box sx={{ mb: 3 }}>
          <QRScanner
            open={open}
            onClose={() => setOpen(false)}
            autoStart={true}
            onScan={handleScanResult}
            scanning={scanning}
          />
          
          {scanning && !roomData && (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <CameraAlt sx={{ fontSize: 80, color: "#1976d2", mb: 2, opacity: 0.7 }} />
              <Typography variant="h6" gutterBottom>
                Aguardando leitura do QR Code...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Aponte a câmera para o QR Code da sala
              </Typography>
            </Box>
          )}
        </Box>

        {/* Loading */}
        {loading && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6">Processando QR Code...</Typography>
            <Typography variant="body2" color="text.secondary">
              Aguarde enquanto buscamos as informações da sala
            </Typography>
          </Box>
        )}

        {/* Resultado do Scan */}
        {roomData && !loading && (
          <Card sx={{ border: "2px solid #1976d2", borderRadius: 3 }}>
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
                    {roomData.qrCode?.substring(0, 20)}...
                  </Typography>
                </Grid>
              </Grid>

              {scanResult?.isBeingCleaned ? (
                <Alert 
                  severity="warning" 
                  icon={<Warning />}
                  sx={{ mb: 3 }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    ⚠️ Sala em limpeza
                  </Typography>
                  <Typography variant="body2">
                    Esta sala está sendo limpa por <strong>{scanResult.currentCleaner?.name || 'um funcionário'}</strong>.
                  </Typography>
                </Alert>
              ) : (
                <Alert 
                  severity="success" 
                  icon={<CheckCircle />}
                  sx={{ mb: 3 }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    ✅ Pronto para limpeza!
                  </Typography>
                  <Typography variant="body2">
                    Esta sala está disponível para iniciar a limpeza.
                  </Typography>
                </Alert>
              )}

              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <Button
                  variant="contained"
                  startIcon={<CleaningServices />}
                  onClick={handleStartCleaning}
                  disabled={scanResult?.isBeingCleaned}
                  sx={{ 
                    flex: 1,
                    minWidth: 200,
                    bgcolor: scanResult?.isBeingCleaned ? "#ccc" : "#1976d2"
                  }}
                  size="large"
                >
                  {scanResult?.isBeingCleaned ? "Sala Ocupada" : "Iniciar Limpeza"}
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
        )}

        {/* Instruções */}
        {!roomData && !loading && !scanning && (
          <Paper sx={{ p: 3, bgcolor: "#f5f5f5", borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              📋 Como usar:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 20, color: "#666" }}>
              <li><Typography variant="body2">Aponte a câmera para o QR Code na porta da sala</Typography></li>
              <li><Typography variant="body2">Mantenha o QR Code dentro do quadro da câmera</Typography></li>
              <li><Typography variant="body2">Aguarde a leitura automática (não precisa tirar foto)</Typography></li>
              <li><Typography variant="body2">Clique em "Iniciar Limpeza" para começar</Typography></li>
            </ul>
          </Paper>
        )}
      </Paper>
    </Container>
  );
}