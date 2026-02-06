// src/pages/AdminDashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Chip,
  Stack,
  Divider,
  Button,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  Refresh,
  Groups,
  MeetingRoom,
  PendingActions,
  CheckCircle,
  AccessTime,
  Logout,
  ArrowForward,
  QrCodeScanner,
  History,
  Assessment,
  Person,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useAuth } from '../contexts/AuthContext';
import roomService from '../services/roomService';
import cleaningService from '../services/cleaningService';
import userService from '../services/userService';

// ✅ Ajuste se seu StatCard estiver em outro caminho
import StatCard from '../components/common/StatCard';

const clamp = (n, min, max) => Math.min(max, Math.max(min, Number(n) || 0));

/**
 * ✅ Nunca renderize objeto cru no JSX.
 * Essa função transforma qualquer coisa em texto seguro pra render.
 */
const asText = (value) => {
  if (value == null) return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (Array.isArray(value)) return value.map(asText).join(', ');

  if (typeof value === 'object') {
    return (
      value.name ??
      value.title ??
      value.label ??
      value.location ??
      value.type ??
      (value.id != null ? String(value.id) : '[obj]')
    );
  }

  return '—';
};

const getRoomLabel = (c) => {
  // room pode ser string OU objeto
  if (c?.room && typeof c.room === 'object') return c.room.name || c.room.title || c.room.label || `#${c.room.id ?? '—'}`;
  return c?.roomName || asText(c?.room) || '—';
};

const getRoomLocation = (c) => {
  // location pode vir direto ou dentro do room
  if (c?.location && typeof c.location === 'object') return asText(c.location);
  if (c?.location) return asText(c.location);
  if (c?.room && typeof c.room === 'object') return asText(c.room.location);
  return '—';
};

const statusChip = (status) => {
  switch (status) {
    case 'PENDING':
      return { label: 'PENDENTE', color: 'warning' };
    case 'IN_PROGRESS':
      return { label: 'EM ANDAMENTO', color: 'info' };
    case 'COMPLETED':
      return { label: 'CONCLUÍDA', color: 'success' };
    case 'NEEDS_ATTENTION':
      return { label: 'ATENÇÃO', color: 'error' };
    case 'CANCELLED':
      return { label: 'CANCELADA', color: 'default' };
    default:
      return { label: status || '—', color: 'default' };
  }
};

const getInitials = (name) => {
  const n = (name || '').trim();
  if (!n) return '?';
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join('');
};

const formatTime = (date) => {
  if (!date) return '—';
  try {
    return format(new Date(date), "dd/MM 'às' HH:mm", { locale: ptBR });
  } catch {
    return '—';
  }
};

const normalizeArray = (res) => {
  if (!res) return [];
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.rooms)) return res.rooms;
  if (Array.isArray(res.cleanings)) return res.cleanings;
  if (Array.isArray(res.users)) return res.users;
  if (Array.isArray(res)) return res;
  return [];
};

const normalizeStats = (res) => {
  if (!res) return {};
  if (res.stats && typeof res.stats === 'object') return res.stats;
  if (res.data && typeof res.data === 'object') return res.data;
  if (typeof res === 'object') return res;
  return {};
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [period, setPeriod] = useState('today'); // today | week | month
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const [roomStats, setRoomStats] = useState(null);
  const [cleaningStats, setCleaningStats] = useState(null);
  const [activeCleanings, setActiveCleanings] = useState([]);
  const [recentCleanings, setRecentCleanings] = useState([]);
  const [workers, setWorkers] = useState([]);

  const isAdmin = user?.role === 'ADMIN';

  const fetchAll = async () => {
    setLoading(true);
    setMsg({ type: '', text: '' });

    try {
      const [rs, cs, ac, rc, ws] = await Promise.all([
        roomService.getRoomStats(),
        cleaningService.getCleaningStats(period),
        cleaningService.getActiveCleanings(),
        cleaningService.getRecentCleanings(15),
        userService.getUsers({ role: 'CLEANER', limit: 999 }),
      ]);

      if (rs?.success) setRoomStats(normalizeStats(rs));
      else setRoomStats(null);

      if (cs?.success) setCleaningStats(normalizeStats(cs));
      else setCleaningStats(null);

      setActiveCleanings(ac?.success ? normalizeArray(ac) : []);
      setRecentCleanings(rc?.success ? normalizeArray(rc) : []);
      setWorkers(ws?.success ? normalizeArray(ws) : []);
    } catch (e) {
      setMsg({ type: 'error', text: e?.message || 'Erro ao carregar dashboard' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, isAdmin]);

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/worker', { replace: true });
    }
  }, [user, navigate]);

  const completionRate = useMemo(() => {
    const rate = cleaningStats?.completionRate ?? cleaningStats?.rate ?? 0;
    return clamp(rate, 0, 100);
  }, [cleaningStats]);

  const kpis = useMemo(() => {
    const byStatus = roomStats?.byStatus || {};
    const totalRooms = roomStats?.total || roomStats?.count || 0;

    const pending = byStatus?.PENDING || 0;
    const inProgress = byStatus?.IN_PROGRESS || byStatus?.['IN_PROGRESS'] || 0;
    const attention = byStatus?.NEEDS_ATTENTION || byStatus?.['NEEDS_ATTENTION'] || 0;

    const completed = cleaningStats?.completed || cleaningStats?.done || 0;
    const totalCleanings = cleaningStats?.total || cleaningStats?.totalCleanings || 0;
    const avgDuration = cleaningStats?.avgDuration || cleaningStats?.avgMinutes || null;

    return { totalRooms, pending, inProgress, attention, completed, totalCleanings, avgDuration };
  }, [roomStats, cleaningStats]);

  const alerts = useMemo(() => {
    const list = [];
    if ((kpis.attention || 0) > 0) {
      list.push({
        severity: 'error',
        title: 'Ambientes com ATENÇÃO',
        text: `Existem ${kpis.attention} ambiente(s) marcados como “Atenção”. Verifique no histórico e resolva pendências para auditoria.`,
        action: { label: 'Ver histórico', to: '/history' },
      });
    }
    if ((kpis.pending || 0) > 0) {
      list.push({
        severity: 'warning',
        title: 'Pendências de limpeza',
        text: `Existem ${kpis.pending} ambiente(s) pendente(s). Considere priorizar os urgentes.`,
        action: { label: 'Ver ambientes', to: '/rooms' },
      });
    }
    if ((kpis.inProgress || 0) > 0) {
      list.push({
        severity: 'info',
        title: 'Limpezas em andamento',
        text: `Existem ${kpis.inProgress} limpeza(s) em andamento. Você pode acompanhar em “Atividade ao vivo”.`,
        action: { label: 'Ver ao vivo', to: '/admin/dashboard' },
      });
    }
    if (list.length === 0) {
      list.push({
        severity: 'success',
        title: 'Tudo sob controle',
        text: 'Nenhum alerta crítico no momento. Continue monitorando para manter a rastreabilidade.',
        action: { label: 'Gerar relatório', to: '/reports' },
      });
    }
    return list.slice(0, 3);
  }, [kpis]);

  const topWorkers = useMemo(() => {
    const map = new Map();

    (recentCleanings || [])
      .filter((c) => c.status === 'COMPLETED')
      .forEach((c) => {
        const cleanerId = c.cleanerId || c.cleaner?.id || c.userId || c.user?.id;
        const cleanerName = c.cleanerName || c.cleaner?.name || c.user?.name || '—';
        if (!cleanerId) return;

        const current = map.get(cleanerId) || { id: cleanerId, name: cleanerName, completed: 0 };
        current.completed += 1;
        if (!current.name || current.name === '—') current.name = cleanerName;
        map.set(cleanerId, current);
      });

    const arr = Array.from(map.values());
    arr.sort((a, b) => b.completed - a.completed);

    if (arr.length > 0) return arr.slice(0, 6);

    return (workers || []).slice(0, 6).map((w) => ({
      id: w.id,
      name: w.name || w.fullName || w.email || '—',
      completed: 0,
    }));
  }, [recentCleanings, workers]);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  if (!isAdmin) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error" sx={{ borderRadius: 3 }}>
          Apenas administradores podem acessar esta página.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Paper sx={{ p: 2.5, borderRadius: 3, mb: 2 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ md: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              Central Administrativa
            </Typography>
            <Typography color="text.secondary">Monitoramento, auditoria e gestão do sistema de limpeza.</Typography>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <ToggleButtonGroup
              value={period}
              exclusive
              onChange={(e, v) => v && setPeriod(v)}
              size="small"
              sx={{
                bgcolor: 'rgba(0,0,0,0.03)',
                borderRadius: 3,
                '& .MuiToggleButton-root': { borderRadius: 3, px: 2 },
              }}
            >
              <ToggleButton value="today">Hoje</ToggleButton>
              <ToggleButton value="week">Semana</ToggleButton>
              <ToggleButton value="month">Mês</ToggleButton>
            </ToggleButtonGroup>

            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchAll}
              disabled={loading}
              sx={{ borderRadius: 3 }}
            >
              Atualizar
            </Button>

            <Button variant="outlined" startIcon={<Logout />} onClick={handleLogout} sx={{ borderRadius: 3 }}>
              Sair
            </Button>
          </Stack>
        </Stack>

        {msg?.text ? (
          <Alert severity={msg.type || 'info'} sx={{ mt: 2, borderRadius: 3 }}>
            {msg.text}
          </Alert>
        ) : null}

        {loading ? <LinearProgress sx={{ mt: 2 }} /> : null}
      </Paper>

      {/* Alertas */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {alerts.map((a, idx) => (
          <Grid item xs={12} md={4} key={idx}>
            <Alert
              severity={a.severity}
              sx={{ borderRadius: 3, height: '100%' }}
              action={
                <Button color="inherit" size="small" onClick={() => navigate(a.action.to)} endIcon={<ArrowForward />}>
                  {a.action.label}
                </Button>
              }
            >
              <Typography sx={{ fontWeight: 900 }}>{a.title}</Typography>
              <Typography variant="body2">{a.text}</Typography>
            </Alert>
          </Grid>
        ))}
      </Grid>

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total de ambientes"
            value={kpis.totalRooms || 0}
            icon={<MeetingRoom />}
            color="#1976d2"
            subtitle="Inventário cadastrado"
            onClick={() => navigate('/rooms')}
            loading={loading}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pendentes"
            value={kpis.pending || 0}
            icon={<PendingActions />}
            color="#ff9800"
            subtitle="Precisam de limpeza"
            onClick={() => navigate('/rooms')}
            loading={loading}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Concluídas"
            value={kpis.completed || 0}
            icon={<CheckCircle />}
            color="#4caf50"
            subtitle={`Período: ${period === 'today' ? 'hoje' : period === 'week' ? 'semana' : 'mês'}`}
            onClick={() => navigate('/history')}
            loading={loading}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Taxa de conclusão"
            value={`${completionRate}%`}
            icon={<Assessment />}
            color="#9c27b0"
            subtitle={kpis.totalCleanings ? `${kpis.totalCleanings} registro(s) no período` : '—'}
            onClick={() => navigate('/reports')}
            loading={loading}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {/* Atividade ao vivo */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <AccessTime />
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Atividade ao vivo
                </Typography>
                <Chip size="small" label={activeCleanings.length} variant="outlined" />
              </Stack>

              <Stack direction="row" spacing={1}>
                <Tooltip title="Escanear QR Code">
                  <IconButton onClick={() => navigate('/scan')}>
                    <QrCodeScanner />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>

            <Divider sx={{ mb: 2 }} />

            {activeCleanings.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 3 }}>
                Nenhuma limpeza em andamento no momento.
              </Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Ambiente</TableCell>
                      <TableCell>Funcionário</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Início</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activeCleanings.slice(0, 8).map((c) => {
                      const s = statusChip(c.status);
                      const name = c.cleanerName || c.cleaner?.name || c.user?.name || '—';

                      return (
                        <TableRow key={c.id || `${c.roomId}-${c.startedAt}`} hover>
                          <TableCell>
                            <Typography sx={{ fontWeight: 800 }}>{getRoomLabel(c)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {getRoomLocation(c)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Avatar sx={{ width: 28, height: 28 }}>{getInitials(name)}</Avatar>
                              <Typography variant="body2">{name}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={s.label} color={s.color} />
                          </TableCell>
                          <TableCell>{formatTime(c.startedAt)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
              <Button variant="outlined" startIcon={<History />} onClick={() => navigate('/history')} sx={{ borderRadius: 3 }}>
                Ver histórico
              </Button>
              <Button variant="contained" startIcon={<Assessment />} onClick={() => navigate('/reports')} sx={{ borderRadius: 3 }}>
                Relatórios
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* Ranking + Ações rápidas */}
        <Grid item xs={12} lg={6}>
          <Grid container spacing={2} sx={{ height: '100%' }}>
            {/* Ranking */}
            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Groups />
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    Ranking (recentes)
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 2 }} />

                {topWorkers.length === 0 ? (
                  <Alert severity="info" sx={{ borderRadius: 3 }}>
                    Sem dados suficientes para ranking.
                  </Alert>
                ) : (
                  <Stack spacing={1.2}>
                    {topWorkers.map((w, idx) => (
                      <Paper
                        key={w.id || idx}
                        sx={{ p: 1.4, borderRadius: 3, border: '1px solid rgba(0,0,0,0.06)' }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1.2} alignItems="center">
                            <Avatar sx={{ width: 34, height: 34 }}>{getInitials(w.name)}</Avatar>
                            <Box>
                              <Typography sx={{ fontWeight: 900 }} noWrap>
                                {asText(w.name)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                #{idx + 1}
                              </Typography>
                            </Box>
                          </Stack>

                          <Chip
                            size="small"
                            label={`${w.completed || 0} concluída(s)`}
                            color={(w.completed || 0) > 0 ? 'success' : 'default'}
                            sx={{ fontWeight: 900 }}
                          />
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}

                <Button
                  fullWidth
                  sx={{ mt: 2, borderRadius: 3 }}
                  variant="outlined"
                  startIcon={<Person />}
                  onClick={() => navigate('/admin/workers')}
                >
                  Gerenciar funcionários
                </Button>
              </Paper>
            </Grid>

            {/* Ações rápidas */}
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
                  Ações rápidas
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={1.2}>
                  <Button
                    variant="contained"
                    startIcon={<MeetingRoom />}
                    onClick={() => navigate('/rooms')}
                    sx={{ borderRadius: 3, justifyContent: 'flex-start' }}
                    fullWidth
                  >
                    Ambientes
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<History />}
                    onClick={() => navigate('/history')}
                    sx={{ borderRadius: 3, justifyContent: 'flex-start' }}
                    fullWidth
                  >
                    Histórico (auditoria)
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<Assessment />}
                    onClick={() => navigate('/reports')}
                    sx={{ borderRadius: 3, justifyContent: 'flex-start' }}
                    fullWidth
                  >
                    Relatórios
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<QrCodeScanner />}
                    onClick={() => navigate('/scan')}
                    sx={{ borderRadius: 3, justifyContent: 'flex-start' }}
                    fullWidth
                  >
                    Scanner QR
                  </Button>
                </Stack>

                <Alert severity="info" sx={{ mt: 2, borderRadius: 3 }}>
                  Dica: mantenha os registros no servidor para auditoria e evidência de execução.
                </Alert>
              </Paper>
            </Grid>
          </Grid>
        </Grid>

        {/* Últimas atividades */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Últimas atividades (audit trail)
              </Typography>
              <Button
                variant="outlined"
                sx={{ borderRadius: 3 }}
                onClick={() => navigate('/history')}
                endIcon={<ArrowForward />}
              >
                Ver tudo
              </Button>
            </Stack>

            <Divider sx={{ mb: 2 }} />

            {recentCleanings.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 3 }}>
                Nenhuma atividade recente encontrada.
              </Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Data/Hora</TableCell>
                      <TableCell>Ambiente</TableCell>
                      <TableCell>Funcionário</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Observação</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentCleanings.slice(0, 10).map((c) => {
                      const s = statusChip(c.status);
                      const name = c.cleanerName || c.cleaner?.name || c.user?.name || '—';
                      const obs = c.notes || c.observation || c.comment || '';

                      return (
                        <TableRow key={c.id || `${c.roomId}-${c.startedAt}`} hover>
                          <TableCell>{formatTime(c.completedAt || c.startedAt || c.createdAt)}</TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 800 }}>{getRoomLabel(c)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {getRoomLocation(c)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Avatar sx={{ width: 28, height: 28 }}>{getInitials(name)}</Avatar>
                              <Typography variant="body2">{name}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={s.label} color={s.color} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color={obs ? 'text.primary' : 'text.secondary'}>
                              {obs ? asText(obs) : '—'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Rodapé discreto */}
      <Box sx={{ mt: 2, textAlign: 'right' }}>
        <Typography variant="caption" color="text.secondary">
          Última atualização: {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </Typography>
      </Box>
    </Container>
  );
};

export default AdminDashboard;
