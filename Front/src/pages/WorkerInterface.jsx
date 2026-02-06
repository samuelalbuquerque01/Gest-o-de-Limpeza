// src/pages/WorkerInterface.jsx - VERSÃO COMPLETA COM COMPROVANTES APENAS VISUALIZAÇÃO
import React, { useEffect, useMemo, useState } from "react";
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Avatar,
  Alert,
  CircularProgress,
  Chip,
  TextField,
  FormControlLabel,
  Checkbox,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  AppBar,
  Toolbar,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CardActions,
  Tooltip,
  Fab,
  Menu,
  MenuItem,
  Modal,
  Fade,
  Backdrop,
} from "@mui/material";
import {
  Person,
  CleaningServices,
  Bathroom,
  Restaurant,
  MeetingRoom,
  LocationOn,
  CheckCircle,
  Refresh,
  AccessTime,
  History,
  Cancel,
  Timer,
  Schedule,
  Print,
  QrCode2,
  QrCodeScanner,
  CameraAlt,
  Logout,
  Dashboard,
  ListAlt,
  Assessment,
  Receipt,
  Download,
  FilterList,
  Search,
  CalendarToday,
  TrendingUp,
  Star,
  Check,
  Warning,
  MoreVert,
  Share,
  PictureAsPdf,
  Image,
  FileCopy,
  Visibility,
  Close,
} from "@mui/icons-material";
import { format, formatDistanceToNow, differenceInMinutes, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import QRCode from "qrcode";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import cleaningService from "../services/cleaningService";
import roomService from "../services/roomService";
import api from "../services/api";
import QRScanner from "../components/common/QRScanner";

// ✅ logo local
import logo from "../assets/logo.png";

// Checklists por tipo de sala
const CHECKLISTS = {
  ROOM: [
    { id: "floor", label: "Aspirar/limpar chão", category: "cleaning" },
    { id: "furniture", label: "Limpar móveis", category: "cleaning" },
    { id: "trash", label: "Esvaziar lixeiras", category: "cleaning" },
    { id: "windows", label: "Limpar janelas", category: "cleaning" },
    { id: "lights", label: "Verificar lâmpadas", category: "check" },
  ],
  BATHROOM: [
    { id: "toilet", label: "Limpar vaso sanitário", category: "cleaning" },
    { id: "sink", label: "Limpar pia", category: "cleaning" },
    { id: "mirror", label: "Limpar espelho", category: "cleaning" },
    { id: "floor", label: "Limpar chão", category: "cleaning" },
    { id: "soap", label: "Repor sabonete", category: "supply" },
    { id: "paper", label: "Repor papel", category: "supply" },
  ],
  KITCHEN: [
    { id: "counter", label: "Limpar bancadas", category: "cleaning" },
    { id: "sink", label: "Limpar pia", category: "cleaning" },
    { id: "appliances", label: "Limpar eletrodomésticos", category: "cleaning" },
    { id: "trash", label: "Esvaziar lixo", category: "cleaning" },
    { id: "floor", label: "Limpar chão", category: "cleaning" },
  ],
  MEETING_ROOM: [
    { id: "floor", label: "Aspirar chão", category: "cleaning" },
    { id: "table", label: "Limpar mesa", category: "cleaning" },
    { id: "chairs", label: "Limpar cadeiras", category: "cleaning" },
    { id: "trash", label: "Esvaziar lixeiras", category: "cleaning" },
    { id: "whiteboard", label: "Limpar quadro", category: "cleaning" },
  ],
};

// Helpers seguros
const getRoomNameSafe = (roomValue) => {
  if (!roomValue) return "N/A";
  if (typeof roomValue === "string") return roomValue;
  if (typeof roomValue === "object") return roomValue?.name || "N/A";
  return "N/A";
};

const normalizeRoom = (roomValue) => {
  if (!roomValue) return null;
  if (typeof roomValue === "object") {
    return {
      id: roomValue.id,
      name: roomValue.name || "Sala",
      type: roomValue.type || "ROOM",
      location: roomValue.location || "",
    };
  }
  return { id: null, name: String(roomValue), type: "ROOM", location: "" };
};

const roomTypeLabel = (type) => {
  switch (type) {
    case "BATHROOM":
      return "Banheiro";
    case "KITCHEN":
      return "Cozinha";
    case "MEETING_ROOM":
      return "Sala de Reunião";
    default:
      return "Sala";
  }
};

const WorkerInterface = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Estado principal
  const [activeTab, setActiveTab] = useState(0);
  const [step, setStep] = useState(2);

  const [rooms, setRooms] = useState([]);
  const [selectedCleaner, setSelectedCleaner] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [checklist, setChecklist] = useState({});
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // ✅ QR Scanner state
  const [qrScannerOpen, setQrScannerOpen] = useState(false);

  // ✅ protocolo = recordId (id do registro no backend)
  const [cleaningRecordId, setCleaningRecordId] = useState(null);
  const [todayCleanings, setTodayCleanings] = useState([]);
  const [allCleanings, setAllCleanings] = useState([]);
  const [activeCleaning, setActiveCleaning] = useState(null);

  // ✅ Modal de visualização de comprovante
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receiptQRCode, setReceiptQRCode] = useState("");

  // ✅ Filtros para histórico
  const [dateFilter, setDateFilter] = useState("today");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ Menu de ações
  const [anchorEl, setAnchorEl] = useState(null);

  // ✅ Verifica autenticação
  useEffect(() => {
    if (!user) {
      navigate("/worker/login", { replace: true });
      return;
    }
  }, [user, navigate]);

  const getRoomIcon = (type) => {
    switch (type) {
      case "BATHROOM":
        return <Bathroom />;
      case "KITCHEN":
        return <Restaurant />;
      case "MEETING_ROOM":
        return <MeetingRoom />;
      default:
        return <CleaningServices />;
    }
  };

  const getRoomColor = (type) => {
    switch (type) {
      case "BATHROOM":
        return "#2196f3";
      case "KITCHEN":
        return "#4caf50";
      case "MEETING_ROOM":
        return "#9c27b0";
      default:
        return "#1aae96";
    }
  };

  const checklistItems = useMemo(() => {
    const type = selectedRoom?.type || "ROOM";
    const items = CHECKLISTS[type] || CHECKLISTS.ROOM;
    return Array.isArray(items) ? items : [];
  }, [selectedRoom]);

  const completedItems = useMemo(
    () => Object.values(checklist || {}).filter(Boolean).length,
    [checklist]
  );

  const totalItems = checklistItems.length;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const initChecklistForRoom = (room) => {
    const r = normalizeRoom(room) || { type: "ROOM" };
    const items = CHECKLISTS[r.type] || CHECKLISTS.ROOM;
    const initial = {};
    (items || []).forEach((it) => (initial[it.id] = false));
    setChecklist(initial);
  };

  // ✅ Carrega salas disponíveis
  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/rooms/available");
      setRooms(res?.success ? (Array.isArray(res.rooms) ? res.rooms : []) : []);
    } catch (e) {
      setRooms([]);
      setError(e?.message || "Erro ao carregar salas disponíveis");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Histórico do funcionário logado hoje
  const fetchMyTodayCleanings = async () => {
    try {
      setHistoryLoading(true);
      const response = await cleaningService.getMyTodayCleanings();
      if (response?.success) {
        const list = Array.isArray(response.cleanings) ? response.cleanings : [];
        const sorted = list.sort(
          (a, b) => new Date(b.completedAt || b.startedAt || 0) - new Date(a.completedAt || a.startedAt || 0)
        );
        setTodayCleanings(sorted);
      } else {
        setTodayCleanings([]);
      }
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
      setTodayCleanings([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ✅ Histórico completo (últimos 30 dias)
  const fetchAllCleanings = async () => {
    try {
      setStatsLoading(true);
      // Buscar histórico com limite de 100 registros
      const response = await api.get(`/cleaning/history?limit=100`);
      
      if (response?.success) {
        // Filtrar apenas as limpezas deste funcionário
        const myCleanings = (response.data || []).filter(c => 
          c.cleanerId === user?.id || c.cleaner?.id === user?.id
        );
        setAllCleanings(myCleanings);
      }
    } catch (err) {
      console.error("Erro ao buscar histórico completo:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  // ✅ Estatísticas do funcionário
  const calculateStats = () => {
    const today = todayCleanings || [];
    const all = allCleanings || [];
    
    const completedToday = today.filter(c => c.status === 'COMPLETED').length;
    const completedAll = all.filter(c => c.status === 'COMPLETED').length;
    
    // Calcular média de duração
    let totalDuration = 0;
    let completedWithDuration = 0;
    
    all.forEach(c => {
      if (c.status === 'COMPLETED' && c.startedAt && c.completedAt) {
        const duration = differenceInMinutes(new Date(c.completedAt), new Date(c.startedAt));
        totalDuration += duration;
        completedWithDuration++;
      }
    });
    
    const avgDuration = completedWithDuration > 0 ? Math.round(totalDuration / completedWithDuration) : 0;
    
    // Calcular eficiência
    const efficiency = completedToday > 0 ? Math.round((completedToday / today.length) * 100) : 0;
    
    return {
      totalToday: today.length,
      completedToday,
      completedAll,
      avgDuration,
      efficiency
    };
  };

  // ✅ Checa limpeza ativa (pra retomar)
  const checkActiveCleaning = async () => {
    try {
      const response = await cleaningService.getMyActiveCleaning();
      if (!response?.success) return;

      const active = response.active;
      if (!active) return;

      setActiveCleaning(active);
      setCleaningRecordId(active.id);

      const room = normalizeRoom(active.room);
      if (room) {
        setSelectedRoom(room);
        setChecklist(active.checklist || {});
        setNotes(active.notes || "");
        setStep(3);
        setActiveTab(1);
      }
    } catch (err) {
      console.error("Erro ao verificar limpeza ativa:", err);
    }
  };

  // ✅ Boot
  useEffect(() => {
    if (!user) return;

    setSelectedCleaner(user);
    setActiveTab(0);

    fetchRooms();
    fetchMyTodayCleanings();
    fetchAllCleanings();
    checkActiveCleaning();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ✅ Handle QR Scan Result
  const handleQRScanResult = (data) => {
    if (data.room && !data.isBeingCleaned) {
      handleRoomSelect(data.room);
      setActiveTab(1);
    } else if (data.isBeingCleaned) {
      setError(`⚠️ Esta sala já está sendo limpa por ${data.currentCleaner?.name || 'outro funcionário'}`);
    }
    setQrScannerOpen(false);
  };

  const handleRoomSelect = async (room) => {
    if (!selectedCleaner?.id) {
      setError("Usuário não identificado. Faça login novamente.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const normalized = normalizeRoom(room);
      setSelectedRoom(normalized);

      const response = await cleaningService.startCleaning(room.id);

      if (response?.success) {
        const rid = response.record?.id || response?.recordId || null;
        setCleaningRecordId(rid);
        setActiveCleaning(response.record);
        
        const items = CHECKLISTS[normalized.type] || CHECKLISTS.ROOM;
        const initial = {};
        (items || []).forEach((it) => (initial[it.id] = false));
        setChecklist(initial);
        
        setStep(3);
        fetchMyTodayCleanings();
        fetchAllCleanings();
        return;
      }

      if (response?.status === 409 || response?.success === false) {
        if (response?.active?.id) {
          const act = response.active;
          setActiveCleaning(act);
          setCleaningRecordId(act.id);

          const r = normalizeRoom(act.room);
          if (r) {
            setSelectedRoom(r);
            setChecklist(act.checklist || {});
            setNotes(act.notes || "");
            setStep(3);
          }
          setError(response?.message || "Você já tem uma limpeza em andamento.");
          return;
        }
      }

      setError(response?.message || response?.error || "Erro ao iniciar limpeza");
    } catch (err) {
      setError(err?.message || err?.error || "Erro ao iniciar limpeza");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Função para visualizar comprovante
  const handleViewReceipt = async (cleaning) => {
    try {
      setSelectedReceipt(cleaning);
      
      const payload = {
        clinic: "Neuropsicocentro",
        type: "CLEANING_RECORD",
        recordId: cleaning.id,
        roomId: cleaning.room?.id || null,
        roomName: getRoomNameSafe(cleaning.room),
        roomType: cleaning.room?.type || cleaning.roomType || null,
        cleanerId: cleaning.cleanerId || cleaning.cleaner?.id,
        cleanerName: cleaning.cleaner?.name || user?.name,
        completedAt: cleaning.completedAt || cleaning.createdAt,
        startedAt: cleaning.startedAt,
        duration: cleaning.startedAt && cleaning.completedAt 
          ? differenceInMinutes(new Date(cleaning.completedAt), new Date(cleaning.startedAt))
          : null,
      };

      const qrCode = await QRCode.toDataURL(JSON.stringify(payload), {
        errorCorrectionLevel: "M",
        margin: 1,
        scale: 6,
      });
      
      setReceiptQRCode(qrCode);
      setReceiptModalOpen(true);
    } catch (error) {
      console.error("Erro ao gerar QR Code do comprovante:", error);
      setError("Erro ao carregar comprovante");
    }
  };

  const handleCancelCleaning = async () => {
    if (!activeCleaning || !cleaningRecordId) return;

    if (window.confirm("Deseja cancelar esta limpeza? A sala voltará para a lista de pendentes.")) {
      try {
        setLoading(true);
        setError("");

        const response = await cleaningService.cancelCleaning(cleaningRecordId);

        if (response?.success) {
          setActiveCleaning(null);
          setCleaningRecordId(null);
          setSelectedRoom(null);
          setChecklist({});
          setNotes("");
          setStep(2);

          await fetchRooms();
          fetchMyTodayCleanings();
          fetchAllCleanings();

          setSuccess(true);
          setTimeout(() => setSuccess(false), 2500);
        } else {
          setError(response?.message || response?.error || "Erro ao cancelar limpeza");
        }
      } catch {
        setError("Erro ao cancelar limpeza");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleChecklistChange = (itemId) => {
    setChecklist((prev) => ({
      ...(prev || {}),
      [itemId]: !(prev || {})[itemId],
    }));
  };

  const handleCompleteCleaning = async () => {
    if (!cleaningRecordId) {
      setError("Registro de limpeza não encontrado.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await cleaningService.completeCleaning({
        recordId: cleaningRecordId,
        checklist: checklist || {},
        notes: notes.trim() || null,
      });

      if (response?.success) {
        if (response?.record) setActiveCleaning(response.record);
        if (response?.record?.id) setCleaningRecordId(response.record.id);

        setSuccess(true);
        setStep(4);
        fetchMyTodayCleanings();
        fetchAllCleanings();
        fetchRooms();
      } else {
        setError(response?.message || response?.error || "Erro ao finalizar limpeza");
      }
    } catch (err) {
      setError(err?.message || err?.error || "Erro ao finalizar limpeza");
    } finally {
      setLoading(false);
    }
  };

  const handleNewCleaning = () => {
    setSelectedRoom(null);
    setChecklist({});
    setNotes("");
    setSuccess(false);
    setCleaningRecordId(null);
    setActiveCleaning(null);
    setStep(2);
    fetchRooms();
    fetchMyTodayCleanings();
    fetchAllCleanings();
  };

  // ✅ Modal de visualização de comprovante
  const renderReceiptModal = () => {
    if (!selectedReceipt) return null;

    const startedAt = selectedReceipt.startedAt ? new Date(selectedReceipt.startedAt) : null;
    const completedAt = selectedReceipt.completedAt ? new Date(selectedReceipt.completedAt) : null;
    const durationMin = startedAt && completedAt 
      ? differenceInMinutes(completedAt, startedAt)
      : null;

    return (
      <Modal
        open={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{ timeout: 500 }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Fade in={receiptModalOpen}>
          <Paper
            sx={{
              maxWidth: 800,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              p: 3,
              borderRadius: 3,
              position: 'relative',
            }}
          >
            <IconButton
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'rgba(0,0,0,0.04)',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.08)' }
              }}
              onClick={() => setReceiptModalOpen(false)}
            >
              <Close />
            </IconButton>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                pb: 2,
                borderBottom: "1px solid rgba(0,0,0,0.10)",
                mb: 3,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  component="img"
                  src={logo}
                  alt="Neuropsicocentro"
                  sx={{ width: 100, height: "auto" }}
                />
                <Box>
                  <Typography sx={{ fontWeight: 900, color: "#1aae96", lineHeight: 1.1 }} variant="h6">
                    Neuropsicocentro
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Comprovante de Limpeza
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ textAlign: "right" }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Protocolo
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  {selectedReceipt.id?.substring(0, 8).toUpperCase() || "-"}
                </Typography>
                <Chip
                  size="small"
                  label="REGISTRO CONCLUÍDO"
                  sx={{ bgcolor: "#1aae9620", color: "#1aae96", fontWeight: 800, mt: 0.5 }}
                />
              </Box>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Paper
                  variant="outlined"
                  sx={{ p: 2, borderRadius: 2, borderColor: "rgba(0,0,0,0.12)" }}
                >
                  <Typography sx={{ fontWeight: 900, mb: 2 }}>Dados do Registro</Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                        Ambiente
                      </Typography>
                      <Typography sx={{ fontWeight: 800 }}>
                        {getRoomNameSafe(selectedReceipt.room)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {selectedReceipt.room?.location || "-"}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                        Tipo
                      </Typography>
                      <Typography sx={{ fontWeight: 800 }}>
                        {roomTypeLabel(selectedReceipt.room?.type || selectedReceipt.roomType)}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                        Funcionário
                      </Typography>
                      <Typography sx={{ fontWeight: 800 }}>
                        {selectedReceipt.cleaner?.name || user?.name || "-"}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                        Data/Hora
                      </Typography>
                      <Typography sx={{ fontWeight: 800 }}>
                        {completedAt 
                          ? format(completedAt, "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "-"
                        }
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                        Início
                      </Typography>
                      <Typography sx={{ fontWeight: 800 }}>
                        {startedAt 
                          ? format(startedAt, "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "-"
                        }
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                        Duração
                      </Typography>
                      <Typography sx={{ fontWeight: 800 }}>
                        {durationMin != null ? `${durationMin} min` : "-"}
                      </Typography>
                    </Grid>

                    {selectedReceipt.notes && (
                      <Grid item xs={12}>
                        <Divider sx={{ my: 1.5 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                          Observações
                        </Typography>
                        <Typography sx={{ whiteSpace: "pre-wrap" }}>
                          {selectedReceipt.notes}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    borderColor: "rgba(0,0,0,0.12)",
                    height: "100%",
                  }}
                >
                  <Typography sx={{ fontWeight: 900, mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                    <QrCode2 sx={{ color: "#1aae96" }} /> QR Code do Registro
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      p: 2,
                      border: "1px dashed rgba(0,0,0,0.18)",
                      borderRadius: 2,
                      mb: 1.5,
                      bgcolor: "#f6f8fb",
                      minHeight: 200,
                    }}
                  >
                    {receiptQRCode ? (
                      <Box component="img" src={receiptQRCode} alt="QR Code" sx={{ width: 180, height: 180 }} />
                    ) : (
                      <Box sx={{ textAlign: "center" }}>
                        <CircularProgress size={20} />
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                          Gerando QR Code...
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    Este QR contém o protocolo e os dados do registro para auditoria interna.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid rgba(0,0,0,0.10)" }}>
              <Typography variant="caption" color="text.secondary">
                Protocolo: <b>{selectedReceipt.id?.substring(0, 12).toUpperCase() || "-"}</b> • 
                Registro automático do sistema • Emitido em {format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </Typography>
            </Box>
          </Paper>
        </Fade>
      </Modal>
    );
  };

  // ✅ Render Dashboard
  const renderDashboard = () => {
    const stats = calculateStats();
    
    return (
      <Box sx={{ mt: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Avatar sx={{ mr: 2, bgcolor: "#1aae96", width: 60, height: 60 }}>
              <Person fontSize="large" />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                Olá, {selectedCleaner?.name}!
              </Typography>
              <Typography variant="body1" color="textSecondary">
                Bem-vindo ao seu dashboard de produtividade
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            startIcon={<QrCodeScanner />}
            onClick={() => setQrScannerOpen(true)}
            sx={{ 
              mt: { xs: 2, sm: 0 },
              bgcolor: "#1aae96",
              '&:hover': { bgcolor: "#128a78" },
              px: 3,
              py: 1.5,
              fontSize: '1rem'
            }}
          >
            Escanear QR Code
          </Button>
        </Box>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
            Operação realizada com sucesso!
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, borderRadius: 3, bgcolor: '#1aae9610', border: '2px solid #1aae96' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: '#1aae96' }}>
                    {stats.totalToday}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Limpezas Hoje
                  </Typography>
                </Box>
                <CleaningServices sx={{ fontSize: 40, color: '#1aae96' }} />
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, borderRadius: 3, bgcolor: '#4caf5010', border: '2px solid #4caf50' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: '#4caf50' }}>
                    {stats.completedToday}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Concluídas
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 40, color: '#4caf50' }} />
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, borderRadius: 3, bgcolor: '#2196f310', border: '2px solid #2196f3' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: '#2196f3' }}>
                    {stats.avgDuration}'
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Média por sala
                  </Typography>
                </Box>
                <AccessTime sx={{ fontSize: 40, color: '#2196f3' }} />
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, borderRadius: 3, bgcolor: '#9c27b010', border: '2px solid #9c27b0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: '#9c27b0' }}>
                    {stats.efficiency}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Eficiência
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, color: '#9c27b0' }} />
              </Box>
            </Card>
          </Grid>
        </Grid>

        <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CleaningServices /> Ações Rápidas
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Button 
                fullWidth 
                variant="contained" 
                startIcon={<CleaningServices />}
                onClick={() => setActiveTab(1)}
                sx={{ py: 1.5, bgcolor: '#1aae96' }}
              >
                Nova Limpeza
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button 
                fullWidth 
                variant="outlined" 
                startIcon={<QrCodeScanner />}
                onClick={() => setQrScannerOpen(true)}
                sx={{ py: 1.5 }}
              >
                Escanear QR
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button 
                fullWidth 
                variant="outlined" 
                startIcon={<History />}
                onClick={() => setActiveTab(2)}
                sx={{ py: 1.5 }}
              >
                Meu Histórico
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button 
                fullWidth 
                variant="outlined" 
                startIcon={<Receipt />}
                onClick={() => setActiveTab(4)}
                sx={{ py: 1.5 }}
              >
                Comprovantes
              </Button>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h6" sx={{ display: "flex", alignItems: "center", fontWeight: 900 }}>
              <History sx={{ mr: 1 }} />
              Limpezas Recentes
            </Typography>
            <Button 
              size="small" 
              endIcon={<Refresh />} 
              onClick={fetchMyTodayCleanings}
              disabled={historyLoading}
            >
              Atualizar
            </Button>
          </Box>

          {historyLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : todayCleanings.length === 0 ? (
            <Alert severity="info">
              Nenhuma limpeza registrada hoje. Comece uma nova limpeza!
            </Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Sala</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Horário</TableCell>
                    <TableCell>Duração</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {todayCleanings.slice(0, 5).map((cleaning) => (
                    <TableRow key={cleaning.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ bgcolor: getRoomColor(cleaning.roomType || cleaning.room?.type), width: 30, height: 30 }}>
                            {getRoomIcon(cleaning.roomType || cleaning.room?.type)}
                          </Avatar>
                          <Typography variant="body2" fontWeight={600}>
                            {getRoomNameSafe(cleaning.room)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={cleaning.status} 
                          size="small"
                          color={
                            cleaning.status === 'COMPLETED' ? 'success' :
                            cleaning.status === 'IN_PROGRESS' ? 'warning' : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {cleaning.startedAt ? format(new Date(cleaning.startedAt), 'HH:mm') : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {cleaning.startedAt && cleaning.completedAt 
                            ? `${differenceInMinutes(new Date(cleaning.completedAt), new Date(cleaning.startedAt))} min`
                            : '-'
                          }
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Ver comprovante">
                          <IconButton size="small" onClick={() => handleViewReceipt(cleaning)}>
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>
    );
  };

  // ✅ Render Nova Limpeza
  const renderNewCleaning = () => {
    if (step === 2) {
      return (
        <Box sx={{ mt: 3 }}>
          <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CleaningServices /> Nova Limpeza
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Selecione um ambiente para iniciar a limpeza ou escaneie o QR Code da sala.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<QrCodeScanner />}
                onClick={() => setQrScannerOpen(true)}
                sx={{ 
                  bgcolor: "#1aae96",
                  '&:hover': { bgcolor: "#128a78" }
                }}
              >
                Escanear QR Code
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<Search />}
                onClick={() => {
                  document.getElementById('search-rooms')?.focus();
                }}
              >
                Buscar Sala
              </Button>
            </Box>

            <TextField
              id="search-rooms"
              fullWidth
              placeholder="Buscar sala por nome ou localização..."
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{ mb: 3 }}
            />

            <Typography variant="h6" gutterBottom>
              Ambientes Disponíveis para Limpeza
            </Typography>

            <Grid container spacing={2}>
              {(rooms || []).map((room) => (
                <Grid item xs={12} sm={6} md={4} key={room.id}>
                  <Card
                    sx={{
                      cursor: "pointer",
                      border: selectedRoom?.id === room.id ? "2px solid #1aae96" : "1px solid #e0e0e0",
                      "&:hover": { borderColor: "#1aae96", transform: 'translateY(-2px)', transition: 'all 0.2s' },
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                    onClick={() => handleRoomSelect(room)}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                        <Avatar sx={{ mr: 2, bgcolor: getRoomColor(room.type) }}>
                          {getRoomIcon(room.type)}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6">{room.name}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            <LocationOn fontSize="inherit" sx={{ mr: 0.5 }} />
                            {room.location}
                          </Typography>
                        </Box>
                      </Box>

                      <Chip
                        label={roomTypeLabel(room.type)}
                        size="small"
                        sx={{
                          bgcolor: getRoomColor(room.type) + "20",
                          color: getRoomColor(room.type),
                          fontWeight: 800,
                        }}
                      />
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button 
                        fullWidth 
                        variant="contained" 
                        size="small"
                        startIcon={<CleaningServices />}
                      >
                        Iniciar Limpeza
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {(rooms || []).length === 0 && !loading && (
              <Alert severity="success" sx={{ mt: 3 }}>
                Todos os ambientes disponíveis já foram higienizados hoje. ✅
              </Alert>
            )}
          </Paper>
        </Box>
      );
    }

    if (step === 3) {
      if (!selectedRoom) {
        return (
          <Box sx={{ mt: 3 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Não consegui carregar os dados do ambiente. Volte e selecione novamente.
            </Alert>
            <Button
              variant="contained"
              onClick={() => {
                setStep(2);
                fetchRooms();
              }}
              sx={{ bgcolor: "#1aae96", "&:hover": { bgcolor: "#128a78" } }}
            >
              Voltar para Seleção
            </Button>
          </Box>
        );
      }

      return (
        <Box sx={{ mt: 3 }}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Avatar sx={{ mr: 2, bgcolor: getRoomColor(selectedRoom.type), width: 60, height: 60 }}>
                  {getRoomIcon(selectedRoom.type)}
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>
                    {selectedRoom?.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {selectedRoom?.location}
                  </Typography>
                  <Typography variant="caption" color="primary" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AccessTime fontSize="inherit" />
                    Protocolo: {cleaningRecordId || "-"}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Chip 
                  label={`${completedItems}/${totalItems}`} 
                  color={progress === 100 ? "success" : "primary"}
                  sx={{ fontWeight: 800 }}
                />
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Cancel />}
                  onClick={handleCancelCleaning}
                  size="medium"
                >
                  Cancelar
                </Button>
              </Box>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
                {error}
              </Alert>
            )}

            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="body2" color="textSecondary">
                  Progresso da Limpeza
                </Typography>
                <Typography variant="body2" color="textSecondary" fontWeight={800}>
                  {progress}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ 
                  height: 10, 
                  borderRadius: 99,
                  bgcolor: '#e0e0e0',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: progress === 100 ? '#4caf50' : '#1aae96'
                  }
                }} 
              />
            </Box>

            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle /> Checklist de Higienização
              </Typography>

              <Grid container spacing={1}>
                {(checklistItems || []).map((item) => (
                  <Grid item xs={12} sm={6} key={item.id}>
                    <Paper 
                      sx={{ 
                        p: 2, 
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: (checklist || {})[item.id] ? '#1aae96' : '#e0e0e0',
                        bgcolor: (checklist || {})[item.id] ? '#1aae9610' : 'transparent',
                        cursor: 'pointer',
                        '&:hover': { borderColor: '#1aae96' }
                      }}
                      onClick={() => handleChecklistChange(item.id)}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={Boolean((checklist || {})[item.id])}
                            onChange={() => handleChecklistChange(item.id)}
                            color="primary"
                          />
                        }
                        label={
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <CheckCircle
                              sx={{
                                fontSize: 18,
                                mr: 1,
                                color: (checklist || {})[item.id] ? "#1aae96" : "#cfd8dc",
                              }}
                            />
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {item.label}
                            </Typography>
                          </Box>
                        }
                        sx={{ width: "100%", m: 0 }}
                      />
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Warning /> Observações (opcional)
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: falta de material, intercorrência, reposição necessária…"
                variant="outlined"
                helperText="Informe qualquer observação relevante sobre a limpeza"
              />
            </Box>

            <Box sx={{ display: "flex", gap: 2 }}>
              <Button 
                variant="outlined" 
                onClick={handleCancelCleaning} 
                disabled={loading}
                sx={{ flex: 1, py: 1.5 }}
              >
                Cancelar Limpeza
              </Button>
              <Button
                variant="contained"
                onClick={handleCompleteCleaning}
                disabled={loading || progress < 100}
                sx={{ 
                  flex: 2, 
                  bgcolor: "#1aae96", 
                  "&:hover": { bgcolor: "#128a78" },
                  py: 1.5,
                  fontSize: '1rem'
                }}
              >
                {loading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Salvando...
                  </>
                ) : progress < 100 ? (
                  `Complete o checklist (${completedItems}/${totalItems})`
                ) : (
                  "✅ Finalizar Limpeza"
                )}
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }

    if (step === 4) {
      return (
        <Box>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid rgba(0,0,0,0.10)",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                pb: 2,
                borderBottom: "1px solid rgba(0,0,0,0.10)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  component="img"
                  src={logo}
                  alt="Neuropsicocentro"
                  sx={{ width: 120, height: "auto" }}
                />
                <Box>
                  <Typography sx={{ fontWeight: 900, color: "#1aae96", lineHeight: 1.1 }} variant="h6">
                    Neuropsicocentro
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Limpeza Concluída com Sucesso!
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircle sx={{ fontSize: 80, color: '#4caf50', mb: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
                ✅ Limpeza Registrada
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                A limpeza de <strong>{selectedRoom?.name}</strong> foi concluída e registrada no sistema.
              </Typography>

              <Box sx={{ maxWidth: 400, mx: 'auto', p: 3, border: '1px solid #e0e0e0', borderRadius: 2, mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Protocolo:</strong> {cleaningRecordId}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Data:</strong> {format(new Date(), 'dd/MM/yyyy HH:mm')}
                </Typography>
                <Typography variant="body2">
                  <strong>Itens concluídos:</strong> {completedItems}/{totalItems}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button 
                  variant="outlined" 
                  onClick={() => handleViewReceipt(activeCleaning)}
                  startIcon={<Visibility />}
                  size="large"
                >
                  Visualizar Comprovante
                </Button>
                
                <Button
                  variant="contained"
                  onClick={handleNewCleaning}
                  startIcon={<CleaningServices />}
                  size="large"
                  sx={{ bgcolor: "#1aae96", "&:hover": { bgcolor: "#128a78" } }}
                >
                  Nova Limpeza
                </Button>
              </Box>
            </Box>
          </Paper>
        </Box>
      );
    }

    return null;
  };

  // ✅ Render Histórico Completo
  const renderHistory = () => {
    const filteredCleanings = allCleanings.filter(cleaning => {
      if (statusFilter !== 'all' && cleaning.status !== statusFilter) return false;
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const roomName = getRoomNameSafe(cleaning.room).toLowerCase();
        return roomName.includes(searchLower);
      }
      return true;
    });

    return (
      <Box sx={{ mt: 3 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
            <History /> Meu Histórico de Limpezas
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Veja todas as suas limpezas realizadas. Filtre por status ou busque por sala.
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                size="small"
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="COMPLETED">Concluídas</MenuItem>
                <MenuItem value="IN_PROGRESS">Em andamento</MenuItem>
                <MenuItem value="CANCELLED">Canceladas</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={12} md={6}>
              <TextField
                fullWidth
                placeholder="Buscar por nome da sala..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                size="small"
              />
            </Grid>
          </Grid>

          {statsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredCleanings.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Nenhuma limpeza encontrada com os filtros selecionados.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Data/Hora</TableCell>
                    <TableCell>Sala</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Duração</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCleanings.map((cleaning) => (
                    <TableRow key={cleaning.id} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {cleaning.completedAt 
                            ? format(new Date(cleaning.completedAt), 'dd/MM/yyyy HH:mm')
                            : format(new Date(cleaning.createdAt), 'dd/MM/yyyy HH:mm')
                          }
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ bgcolor: getRoomColor(cleaning.roomType || cleaning.room?.type), width: 30, height: 30 }}>
                            {getRoomIcon(cleaning.roomType || cleaning.room?.type)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {getRoomNameSafe(cleaning.room)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {cleaning.room?.location || ''}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={roomTypeLabel(cleaning.roomType || cleaning.room?.type)} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={cleaning.status} 
                          size="small"
                          color={
                            cleaning.status === 'COMPLETED' ? 'success' :
                            cleaning.status === 'IN_PROGRESS' ? 'warning' :
                            'error'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {cleaning.startedAt && cleaning.completedAt 
                            ? `${differenceInMinutes(new Date(cleaning.completedAt), new Date(cleaning.startedAt))} min`
                            : '-'
                          }
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {cleaning.status === 'COMPLETED' && (
                          <Tooltip title="Visualizar comprovante">
                            <IconButton 
                              size="small" 
                              onClick={() => handleViewReceipt(cleaning)}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>
    );
  };

  // ✅ Render Estatísticas Detalhadas
  const renderStatistics = () => {
    const stats = calculateStats();
    
    return (
      <Box sx={{ mt: 3 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assessment /> Minhas Estatísticas
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Análise detalhada do seu desempenho e produtividade.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 900 }}>
                  Desempenho Geral
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                      <Typography variant="h4" sx={{ fontWeight: 900, color: '#1aae96' }}>
                        {stats.completedAll}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total Limpezas
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                      <Typography variant="h4" sx={{ fontWeight: 900, color: '#4caf50' }}>
                        {stats.avgDuration}'
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Média/sala
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                      <Typography variant="h4" sx={{ fontWeight: 900, color: '#2196f3' }}>
                        {stats.completedToday}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Hoje
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                      <Typography variant="h4" sx={{ fontWeight: 900, color: '#9c27b0' }}>
                        {stats.efficiency}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Eficiência
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, borderRadius: 3, mb: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 900 }}>
                  Destaques do Dia
                </Typography>
                
                <List>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#4caf50' }}>
                        <Check />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={`${stats.completedToday} limpezas concluídas hoje`}
                      secondary="Bom trabalho!"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#2196f3' }}>
                        <Timer />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={`Média de ${stats.avgDuration} minutos por sala`}
                      secondary="Tempo eficiente"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#ff9800' }}>
                        <Star />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={`${stats.efficiency}% de eficiência`}
                      secondary="Continue assim!"
                    />
                  </ListItem>
                </List>
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    );
  };

  // ✅ Render Comprovantes (APENAS VISUALIZAÇÃO)
  const renderReceiptsView = () => {
    const completedCleanings = allCleanings
      .filter(c => c.status === 'COMPLETED')
      .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
    
    return (
      <Box sx={{ mt: 3 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Receipt /> Meus Comprovantes
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Visualize todos os seus comprovantes de limpeza gerados. Clique em "Visualizar" para ver os detalhes completos.
          </Typography>

          {completedCleanings.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Nenhum comprovante gerado ainda. Conclua sua primeira limpeza!
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {completedCleanings.map((cleaning) => (
                <Grid item xs={12} sm={6} md={4} key={cleaning.id}>
                  <Card sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    '&:hover': { 
                      transform: 'translateY(-2px)', 
                      boxShadow: 3,
                      transition: 'all 0.2s'
                    }
                  }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar sx={{ 
                          mr: 2, 
                          bgcolor: getRoomColor(cleaning.room?.type || cleaning.roomType),
                          width: 50,
                          height: 50
                        }}>
                          {getRoomIcon(cleaning.room?.type || cleaning.roomType)}
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            {getRoomNameSafe(cleaning.room)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {cleaning.room?.location || ''}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          <strong>Protocolo:</strong> {cleaning.id?.substring(0, 8).toUpperCase()}...
                        </Typography>
                        <Typography variant="body2">
                          <strong>Data:</strong> {
                            cleaning.completedAt 
                              ? format(new Date(cleaning.completedAt), 'dd/MM/yyyy')
                              : format(new Date(cleaning.createdAt), 'dd/MM/yyyy')
                          }
                        </Typography>
                        <Typography variant="body2">
                          <strong>Horário:</strong> {
                            cleaning.completedAt 
                              ? format(new Date(cleaning.completedAt), 'HH:mm')
                              : '-'
                          }
                        </Typography>
                      </Box>
                      
                      <Chip 
                        label="COMPROVANTE" 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                        sx={{ mb: 1, fontWeight: 800 }}
                      />
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button 
                        fullWidth
                        variant="contained"
                        startIcon={<Visibility />}
                        onClick={() => handleViewReceipt(cleaning)}
                        sx={{ 
                          bgcolor: '#1aae96',
                          '&:hover': { bgcolor: '#128a78' }
                        }}
                      >
                        Visualizar Comprovante
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>

        {/* Modal de visualização de comprovante */}
        {renderReceiptModal()}
      </Box>
    );
  };

  // ✅ Render conteúdo baseado na aba ativa
  const renderContent = () => {
    if (!user) {
      return <Alert severity="warning">Faça login como funcionário para continuar.</Alert>;
    }

    switch (activeTab) {
      case 0:
        return renderDashboard();
      case 1:
        return renderNewCleaning();
      case 2:
        return renderHistory();
      case 3:
        return renderStatistics();
      case 4:
        return renderReceiptsView();
      default:
        return renderDashboard();
    }
  };

  // ✅ Função de LOGOUT
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/worker/login", { replace: true });
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  return (
    <>
      <AppBar position="static" sx={{ bgcolor: "#1aae96" }}>
        <Toolbar>
          <CleaningServices sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Neuropsicocentro • Sistema de Limpeza
          </Typography>
          <Button
            variant="contained"
            color="error"
            startIcon={<Logout />}
            onClick={handleLogout}
            sx={{
              bgcolor: "white",
              color: "#1aae96",
              fontWeight: 700,
              "&:hover": { bgcolor: "#f5f5f5" }
            }}
          >
            Sair
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ mb: 3, borderRadius: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => {
              setActiveTab(newValue);
              if (newValue === 4) {
                fetchAllCleanings();
              }
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                fontWeight: 600,
                py: 2,
              },
              '& .Mui-selected': {
                color: '#1aae96 !important',
                fontWeight: 800,
              },
              '& .MuiTabs-indicator': {
                bgcolor: '#1aae96',
                height: 3,
              }
            }}
          >
            <Tab icon={<Dashboard />} iconPosition="start" label="Dashboard" />
            <Tab icon={<CleaningServices />} iconPosition="start" label="Nova Limpeza" />
            <Tab icon={<History />} iconPosition="start" label="Meu Histórico" />
            <Tab icon={<Assessment />} iconPosition="start" label="Estatísticas" />
            <Tab icon={<Receipt />} iconPosition="start" label="Comprovantes" />
          </Tabs>
        </Paper>

        {renderContent()}

        <Fab
          color="primary"
          aria-label="scan qr code"
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            bgcolor: '#1aae96',
            '&:hover': { bgcolor: '#128a78' }
          }}
          onClick={() => setQrScannerOpen(true)}
        >
          <QrCodeScanner />
        </Fab>

        <QRScanner
          open={qrScannerOpen}
          onClose={() => setQrScannerOpen(false)}
          onScan={handleQRScanResult}
          autoStart={true}
        />
      </Container>
    </>
  );
};

export default WorkerInterface;