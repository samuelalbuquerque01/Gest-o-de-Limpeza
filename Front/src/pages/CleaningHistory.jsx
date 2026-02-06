// src/pages/CleaningHistory.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  TextField,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import cleaningService from '../services/cleaningService';

const statusLabelPT = (status) => {
  switch (status) {
    case 'COMPLETED':
      return 'Concluída';
    case 'IN_PROGRESS':
      return 'Em andamento';
    case 'PENDING':
      return 'Pendente';
    case 'NEEDS_ATTENTION':
      return 'Atenção';
    case 'CANCELLED':
      return 'Cancelada';
    default:
      return status || '';
  }
};

const CleaningHistory = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError('');

      // ✅ pede apenas COMPLETED (sem CANCELLED)
      const res = await cleaningService.getCleaningHistory({
        page,
        limit: 20,
        status: 'COMPLETED',
      });

      if (res.success) {
        setRecords(res.data || []);
        setPagination(res.pagination || { page: 1, pages: 1, total: 0, limit: 20 });
      } else {
        setError(res.error || 'Erro ao carregar histórico');
      }
    } catch (e) {
      setError('Erro ao conectar com o servidor');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const filtered = useMemo(() => {
    // ✅ garantia extra: só COMPLETED
    const onlyCompleted = (records || []).filter((r) => r.status === 'COMPLETED');

    if (!search.trim()) return onlyCompleted;

    const q = search.toLowerCase();
    return onlyCompleted.filter((r) => {
      const room = `${r.room?.name || ''} ${r.room?.location || ''} ${r.room?.type || ''}`.toLowerCase();
      const cleaner = `${r.cleaner?.name || ''}`.toLowerCase();
      const notes = `${r.notes || ''}`.toLowerCase();
      return room.includes(q) || cleaner.includes(q) || notes.includes(q);
    });
  }, [records, search]);

  const exportCsv = () => {
    const rows = filtered.map((r) => ({
      id: r.id,
      sala: r.room?.name || '',
      tipo: r.room?.type || '',
      local: r.room?.location || '',
      funcionario: r.cleaner?.name || '',
      inicio: r.startedAt ? format(new Date(r.startedAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '',
      fim: r.completedAt ? format(new Date(r.completedAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '',
      observacoes: (r.notes || '').replace(/\s+/g, ' ').trim(),
    }));

    const header = Object.keys(rows[0] || {
      id: '',
      sala: '',
      tipo: '',
      local: '',
      funcionario: '',
      inicio: '',
      fim: '',
      observacoes: '',
    });

    const csv = [
      header.join(';'),
      ...rows.map((obj) =>
        header
          .map((k) => {
            const v = obj[k] ?? '';
            // escapa aspas
            const s = String(v).replace(/"/g, '""');
            return `"${s}"`;
          })
          .join(';')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `historico-limpezas-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50' }}>
            Histórico (Concluídas)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Aqui ficam registradas as limpezas concluídas (para auditoria).
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchHistory}
            disabled={loading}
          >
            Atualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={exportCsv}
            disabled={loading || filtered.length === 0}
          >
            Exportar CSV
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, borderRadius: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              label="Buscar (sala, local, funcionário, observação)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Typography variant="body2" color="text.secondary">
              Total: {pagination.total || filtered.length}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Nenhum registro concluído encontrado.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gap: 1.5 }}>
            {filtered.map((r) => (
              <Paper key={r.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {r.room?.name} — {r.room?.location}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Funcionário: <b>{r.cleaner?.name || '—'}</b>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Início: {r.startedAt ? format(new Date(r.startedAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '—'} | Fim:{' '}
                      {r.completedAt ? format(new Date(r.completedAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '—'}
                    </Typography>
                    {r.notes ? (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Obs: {r.notes}
                      </Typography>
                    ) : null}
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={statusLabelPT(r.status)}
                      color="success"
                      variant="filled"
                    />
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
        )}

        {/* Paginação simples */}
        {pagination.pages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button
              variant="outlined"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
            >
              Anterior
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
              Página {pagination.page} de {pagination.pages}
            </Typography>
            <Button
              variant="outlined"
              disabled={page >= pagination.pages || loading}
              onClick={() => setPage((p) => Math.min(p + 1, pagination.pages))}
            >
              Próxima
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default CleaningHistory;
