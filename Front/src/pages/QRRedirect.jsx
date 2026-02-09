// src/pages/QRRedirect.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  CircularProgress,
  Typography,
  Button,
  Paper,
  Alert,
  Container,
  Stack,
  Card,
  CardContent,
  Chip,
} from "@mui/material";
import {
  Room,
  LocationOn,
  QrCodeScanner,
  Person,
  AccessTime,
  CheckCircle,
  Warning,
} from "@mui/icons-material";
import roomService from "../services/roomService";
import cleaningService from "../services/cleaningService";
import { useAuth } from "../contexts/AuthContext";

export default function QRRedirect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [room, setRoom] = useState(null);
  const [isBeingCleaned, setIsBeingCleaned] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const processQR = async () => {
      try {
        const qrCode = searchParams.get("qr");
        const roomId = searchParams.get("roomId");

        console.log("📱 Processando QR Code:", { qrCode, roomId });

        if (!qrCode && !roomId) {
          setError("QR Code inválido: parâmetros não encontrados");
          setLoading(false);
          return;
        }

        let roomData = null;
        let beingCleaned = false;

        // Buscar por QR Code
        if (qrCode) {
          const response = await roomService.findRoomByQRCode(qrCode);
          if (response.success && response.data?.room) {
            roomData = response.data.room;
            beingCleaned = response.data.isBeingCleaned || false;
          }
        }

        // Se não encontrou por QR Code, tentar por roomId
        if (!roomData && roomId) {
          const response = await roomService.getRoomById(roomId);
          if (response.success && response.room) {
            roomData = response.room;
          }
        }

        if (!roomData) {
          setError("Sala não encontrada. O QR Code pode estar desatualizado.");
          setLoading(false);
          return;
        }

        setRoom(roomData);
        setIsBeingCleaned(beingCleaned);
        setLoading(false);

      } catch (err) {
        console.error("Erro ao processar QR Code:", err);
        setError("Erro ao conectar com o servidor");
        setLoading(false);
      }
    };

    processQR();
  }, [searchParams]);

  const startCleaning = async (roomId) => {
    try {
      setProcessing(true);
      const response = await cleaningService.startCleaning(roomId);
      
      if (response.success) {
        navigate("/worker", { 
          state: { 
            message: "Limpeza iniciada com sucesso!",
            cleaningRecord: response.record 
          }
        });
      } else {
        setError(response.error || "Erro ao iniciar limpeza");
      }
    } catch (err) {
      setError("Erro ao iniciar limpeza");
    } finally {
      setProcessing(false);
    }
  };

  const handleStartCleaning = () => {
    if (!room) return;
    
    if (!isAuthenticated) {
      navigate("/worker/login", { 
        state: { 
          redirectTo: "/scan",
          qrCode: searchParams.get("qr"),
          roomId: room.id
        }
      });
      return;
    }
    
    if (user.role === "CLEANER") {
      startCleaning(room.id);
    } else {
      navigate(`/rooms/${room.id}`);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
          <CircularProgress size={60} />
          <Typography variant="h5" sx={{ mt: 3, fontWeight: 600 }}>
            Processando QR Code...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: "center" }}>
            Aguarde enquanto buscamos as informações da sala
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => navigate("/")}
          fullWidth
        >
          Voltar para o início
        </Button>
      </Container>
    );
  }

  if (!room) return null;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Stack spacing={3}>
          {/* Cabeçalho */}
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: "#1976d2" }}>
              QR CODE ESCANEADO
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Sala identificada com sucesso
            </Typography>
          </Box>

          {/* Informações da sala */}
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Room sx={{ fontSize: 40, color: "#1976d2" }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {room.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center" }}>
                    <LocationOn fontSize="small" sx={{ mr: 0.5 }} />
                    {room.location}
                  </Typography>
                </Box>
                <Chip 
                  label={room.type} 
                  color="primary" 
                  sx={{ fontWeight: 700 }}
                />
              </Stack>

              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    QR Code
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                    {room.qrCode || "Não gerado"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={room.status}
                    color={
                      room.status === "PENDING" ? "warning" :
                      room.status === "IN_PROGRESS" ? "info" :
                      room.status === "COMPLETED" ? "success" : "error"
                    }
                    size="small"
                  />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Prioridade
                  </Typography>
                  <Chip
                    label={room.priority || "MÉDIA"}
                    variant="outlined"
                    size="small"
                    color={
                      room.priority === "HIGH" ? "error" :
                      room.priority === "MEDIUM" ? "warning" : "success"
                    }
                  />
                </Box>
              </Stack>

              {room.lastCleaned && (
                <Typography variant="body2" sx={{ display: "flex", alignItems: "center" }}>
                  <AccessTime fontSize="small" sx={{ mr: 1 }} />
                  Última limpeza: {new Date(room.lastCleaned).toLocaleDateString("pt-BR")}
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Status da limpeza */}
          {isBeingCleaned ? (
            <Alert severity="warning" icon={<Person />}>
              <Typography variant="body2">
                <strong>Esta sala está sendo limpa no momento.</strong>
              </Typography>
              <Typography variant="caption">
                Aguarde a conclusão da limpeza atual ou verifique com o supervisor.
              </Typography>
            </Alert>
          ) : (
            <Alert severity="success" icon={<CheckCircle />}>
              <Typography variant="body2">
                <strong>Sala disponível para limpeza!</strong>
              </Typography>
              <Typography variant="caption">
                Você pode iniciar a limpeza agora mesmo.
              </Typography>
            </Alert>
          )}

          {/* Ações */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => navigate("/")}
              disabled={processing}
            >
              Voltar
            </Button>
            
            {isAuthenticated && user?.role === "ADMIN" && (
              <Button
                variant="outlined"
                fullWidth
                onClick={() => navigate(`/rooms/${room.id}`)}
                disabled={processing}
              >
                Ver Detalhes
              </Button>
            )}

            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleStartCleaning}
              disabled={isBeingCleaned || processing}
              startIcon={processing ? <CircularProgress size={20} /> : <QrCodeScanner />}
              sx={{
                bgcolor: "#1976d2",
                "&:hover": { bgcolor: "#1565c0" }
              }}
            >
              {processing ? "Processando..." : 
               !isAuthenticated ? "Fazer Login para Limpar" :
               user?.role === "CLEANER" ? "Iniciar Limpeza" :
               "Ver Sala"}
            </Button>
          </Stack>

          {/* Instruções */}
          <Alert severity="info">
            <Typography variant="caption">
              <strong>Instruções:</strong> Este QR Code foi configurado para abrir automaticamente 
              esta página quando escaneado. Funcionários podem iniciar limpeza diretamente, 
              enquanto administradores podem ver detalhes da sala.
            </Typography>
          </Alert>
        </Stack>
      </Paper>
    </Container>
  );
}