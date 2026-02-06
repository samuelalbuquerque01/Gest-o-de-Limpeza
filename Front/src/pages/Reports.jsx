import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Alert,
  CircularProgress,
  useTheme,
} from "@mui/material";

import { TrendingUp, Assessment, Timer, Download, Print, Refresh, EmojiEvents, Category } from "@mui/icons-material";
import { format } from "date-fns";
import reportService from "../services/reportService";

// ✅ logo local (sem CORS)
import logoPng from "../assets/logo.png";

export default function Reports() {
  const theme = useTheme();

  const [reportType, setReportType] = useState("DAILY");
  const [dateRange, setDateRange] = useState("LAST_7_DAYS");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, dateRange]);

  const periodLabel = useMemo(() => {
    const ps = reportData?.metadata?.periodStart || reportData?.metadata?.startDate;
    const pe = reportData?.metadata?.periodEnd || reportData?.metadata?.endDate;

    if (ps && pe) {
      return `Período: ${format(new Date(ps), "dd/MM/yyyy")} - ${format(new Date(pe), "dd/MM/yyyy")}`;
    }
    return "Análise detalhada do desempenho da limpeza";
  }, [reportData]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError("");

      const params = { type: reportType };

      const nowRef = new Date();
      const now = new Date(nowRef);
      let startDate;
      let endDate = new Date(nowRef);

      switch (dateRange) {
        case "TODAY": {
          const d = new Date(nowRef);
          d.setHours(0, 0, 0, 0);
          startDate = d;
          endDate = new Date(nowRef);
          break;
        }
        case "YESTERDAY": {
          const d = new Date(nowRef);
          d.setDate(d.getDate() - 1);
          d.setHours(0, 0, 0, 0);
          startDate = d;
          const e = new Date(d);
          e.setHours(23, 59, 59, 999);
          endDate = e;
          break;
        }
        case "LAST_7_DAYS": {
          const d = new Date(now);
          d.setDate(d.getDate() - 7);
          startDate = d;
          break;
        }
        case "LAST_30_DAYS": {
          const d = new Date(now);
          d.setDate(d.getDate() - 30);
          startDate = d;
          break;
        }
        default:
          startDate = null;
      }

      if (startDate) {
        params.startDate = startDate.toISOString();
        params.endDate = endDate.toISOString();
      }

      const response = await reportService.generateReport(params);

      if (response?.success) setReportData(response.report);
      else setError(response?.error || "Erro ao gerar relatório");
    } catch (err) {
      console.error("Erro ao buscar relatório:", err);
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // ✅ CSV (dados)
  // -----------------------------
  const buildCsv = (data) => {
    const lines = [];
    const push = (arr) =>
      lines.push(
        arr
          .map((v) => {
            const s = String(v ?? "");
            if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
            return s;
          })
          .join(",")
      );

    push(["Neuropsicocentro", ""]);
    push(["Relatório", "Desempenho de Limpeza"]);
    push(["Período", periodLabel]);
    lines.push("");

    push(["Resumo", ""]);
    push(["Total de Limpezas", data?.summary?.totalCleanings ?? 0]);
    push(["Tempo Médio (min)", data?.summary?.avgDuration ?? 0]);
    push(["Taxa de Conclusão (%)", data?.summary?.completionRate ?? 0]);
    push(["Salas Únicas", data?.summary?.uniqueRooms ?? 0]);
    lines.push("");

    const top = data?.statistics?.topCleaners || [];
    if (top.length) {
      push(["Top Funcionários", "", ""]);
      push(["Funcionário", "Limpezas", "Tempo Médio (min)"]);
      top.forEach((c) => push([c?.name ?? "N/A", c?.cleanings ?? 0, c?.avgDuration ?? 0]));
      lines.push("");
    }

    const byType = data?.statistics?.byRoomType || [];
    if (byType.length) {
      push(["Por Tipo de Ambiente", "", ""]);
      push(["Tipo", "Limpezas", "Tempo Médio (min)"]);
      byType.forEach((r) => push([formatRoomType(r?.type), r?.count ?? 0, r?.avgDuration ?? 0]));
      lines.push("");
    }

    return lines.join("\n");
  };

  const handleExportCsv = () => {
    if (!reportData) return;
    const csv = buildCsv(reportData);

    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `neuropsicocentro-relatorio-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();

    window.URL.revokeObjectURL(url);
  };

  // -----------------------------
  // ✅ PDF (print bonito)
  // -----------------------------
  const toDataUrl = async (assetUrl) => {
    const resp = await fetch(assetUrl);
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  };

  const handleExportPdf = async () => {
    try {
      if (!reportData) return;

      const logoDataUri = await toDataUrl(logoPng);

      const top = reportData?.statistics?.topCleaners || [];
      const byType = reportData?.statistics?.byRoomType || [];

      const brand = {
        name: "Neuropsicocentro",
        primary: theme.palette.primary.main,
        secondary: theme.palette.secondary.main,
        bg: theme.palette.background.default || "#fbfdfd",
        text: theme.palette.text.primary || "#0f172a",
      };

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Relatório - ${brand.name}</title>
            <style>
              * { box-sizing: border-box; }
              body { font-family: Arial, sans-serif; padding: 28px; color: ${brand.text}; background: ${brand.bg}; }
              .header { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 18px; }
              .brand { display: flex; align-items: center; gap: 14px; }
              .brand img { width: 64px; height: 64px; object-fit: contain; }
              .title { margin: 0; font-size: 20px; font-weight: 900; }
              .subtitle { margin-top: 6px; color: #475569; font-size: 12px; }
              .badge { background: ${brand.primary}; color: #fff; padding: 8px 10px; border-radius: 999px; font-size: 12px; font-weight: 800; }
              .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 18px 0 22px; }
              .card { border: 1px solid #e5e7eb; border-radius: 16px; padding: 14px; background: #fff; }
              .k { color: #64748b; font-size: 11px; margin-bottom: 6px; font-weight: 700; }
              .v { font-size: 22px; font-weight: 900; margin: 0; color: ${brand.primary}; }
              h2 { font-size: 13px; margin: 18px 0 10px; display: flex; align-items: center; gap: 8px; }
              .dot { width: 10px; height: 10px; border-radius: 50%; background: ${brand.secondary}; display: inline-block; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; }
              th, td { border-bottom: 1px solid #eef2f7; padding: 10px 12px; text-align: left; font-size: 12px; }
              th { background: #f8fafc; font-weight: 900; }
              tr:last-child td { border-bottom: 0; }
              .center { text-align: center; }
              .footer { margin-top: 22px; font-size: 10px; color: #64748b; text-align: center; }
              @media print {
                body { padding: 0; background: #fff; }
                .badge, .dot { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="brand">
                <img src="${logoDataUri}" alt="Logo ${brand.name}" />
                <div>
                  <p class="title">Relatório de Desempenho</p>
                  <div class="subtitle">${escapeHtml(periodLabel)}</div>
                </div>
              </div>
              <div class="badge">Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}</div>
            </div>

            <div class="grid">
              <div class="card">
                <div class="k">Total de Limpezas</div>
                <p class="v">${reportData?.summary?.totalCleanings ?? 0}</p>
              </div>
              <div class="card">
                <div class="k">Tempo Médio</div>
                <p class="v">${reportData?.summary?.avgDuration ?? 0} min</p>
              </div>
              <div class="card">
                <div class="k">Taxa de Conclusão</div>
                <p class="v">${reportData?.summary?.completionRate ?? 0}%</p>
              </div>
              <div class="card">
                <div class="k">Salas Únicas</div>
                <p class="v">${reportData?.summary?.uniqueRooms ?? 0}</p>
              </div>
            </div>

            ${top.length ? `
              <h2><span class="dot"></span> Top Funcionários</h2>
              <table>
                <thead>
                  <tr>
                    <th>Funcionário</th>
                    <th class="center">Limpezas</th>
                    <th class="center">Tempo Médio</th>
                  </tr>
                </thead>
                <tbody>
                  ${top.map(c => `
                    <tr>
                      <td>${escapeHtml(c?.name ?? "N/A")}</td>
                      <td class="center">${c?.cleanings ?? 0}</td>
                      <td class="center">${c?.avgDuration ?? 0} min</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            ` : ""}

            ${byType.length ? `
              <h2><span class="dot"></span> Por Tipo de Ambiente</h2>
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th class="center">Limpezas</th>
                    <th class="center">Tempo Médio</th>
                  </tr>
                </thead>
                <tbody>
                  ${byType.map(r => `
                    <tr>
                      <td>${escapeHtml(formatRoomType(r?.type))}</td>
                      <td class="center">${r?.count ?? 0}</td>
                      <td class="center">${r?.avgDuration ?? 0} min</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            ` : ""}

            <div class="footer">${brand.name} • Relatório gerado automaticamente</div>
            <script>window.print();</script>
          </body>
        </html>
      `;

      const win = window.open("", "_blank", "width=980,height=720");
      if (!win) return;

      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch (e) {
      console.error("Erro ao exportar PDF:", e);
      alert("Erro ao exportar PDF");
    }
  };

  const StatCard = ({ title, value, icon }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography color="textSecondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ color: "primary.main", fontWeight: 800 }}>
              {value}
            </Typography>
          </Box>
          <Box sx={{ color: "primary.main", fontSize: 40 }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading && !reportData) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Cabeçalho */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4, gap: 2, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <img src={logoPng} alt="Neuropsicocentro" style={{ width: 54, height: 54, objectFit: "contain" }} />
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
              Relatórios e Análises
            </Typography>
            <Typography variant="body1" color="textSecondary">
              {periodLabel}
            </Typography>
          </Box>
        </Box>

        {/* ✅ SÓ 2 BOTÕES */}
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            startIcon={<Print />}
            onClick={handleExportPdf}      // ✅ PDF
            disabled={!reportData}
          >
            Exportar PDF
          </Button>

          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExportCsv}      // ✅ CSV
            disabled={!reportData}
          >
            Exportar CSV
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Filtros */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Relatório</InputLabel>
              <Select value={reportType} label="Tipo de Relatório" onChange={(e) => setReportType(e.target.value)} disabled={loading}>
                <MenuItem value="DAILY">Diário</MenuItem>
                <MenuItem value="WEEKLY">Semanal</MenuItem>
                <MenuItem value="MONTHLY">Mensal</MenuItem>
                <MenuItem value="CUSTOM">Personalizado</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Período</InputLabel>
              <Select value={dateRange} label="Período" onChange={(e) => setDateRange(e.target.value)} disabled={loading}>
                <MenuItem value="TODAY">Hoje</MenuItem>
                <MenuItem value="YESTERDAY">Ontem</MenuItem>
                <MenuItem value="LAST_7_DAYS">Últimos 7 dias</MenuItem>
                <MenuItem value="LAST_30_DAYS">Últimos 30 dias</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <Button fullWidth variant="outlined" startIcon={<Refresh />} onClick={fetchReport} disabled={loading}>
              {loading ? "Gerando..." : "Atualizar"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {reportData ? (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Total de Limpezas" value={reportData.summary?.totalCleanings || 0} icon={<Assessment />} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Tempo Médio" value={`${reportData.summary?.avgDuration || 0} min`} icon={<Timer />} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Taxa de Conclusão" value={`${reportData.summary?.completionRate || 0}%`} icon={<TrendingUp />} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Salas Únicas" value={reportData.summary?.uniqueRooms || 0} icon={<Category />} />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            {reportData.statistics?.topCleaners?.length > 0 && (
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, height: "100%" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <EmojiEvents sx={{ color: "primary.main" }} fontSize="small" />
                      <Typography variant="h6">Top Funcionários</Typography>
                    </Box>
                    <Chip label="Eficiência" color="primary" size="small" />
                  </Box>

                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Funcionário</TableCell>
                          <TableCell align="center">Limpezas</TableCell>
                          <TableCell align="center">Tempo Médio</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportData.statistics.topCleaners.map((cleaner, index) => (
                          <TableRow key={cleaner.id || index} hover>
                            <TableCell>
                              <Box sx={{ display: "flex", alignItems: "center" }}>
                                <Avatar sx={{ width: 32, height: 32, mr: 2, bgcolor: "primary.main" }}>
                                  {getInitials(cleaner?.name)}
                                </Avatar>
                                <Typography variant="body2">{cleaner?.name || "N/A"}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={cleaner?.cleanings || 0} size="small" />
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">{cleaner?.avgDuration || 0} min</Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            )}

            {reportData.statistics?.byRoomType?.length > 0 && (
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, height: "100%" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Category sx={{ color: "primary.main" }} fontSize="small" />
                      <Typography variant="h6">Por Tipo de Ambiente</Typography>
                    </Box>
                    <Chip label="Distribuição" color="secondary" size="small" />
                  </Box>

                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Tipo</TableCell>
                          <TableCell align="center">Limpezas</TableCell>
                          <TableCell align="center">Tempo Médio</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportData.statistics.byRoomType.map((roomType, index) => (
                          <TableRow key={roomType.type || index} hover>
                            <TableCell>
                              <Typography variant="body2">{formatRoomType(roomType.type)}</Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={roomType?.count || 0} size="small" color="primary" />
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">{roomType?.avgDuration || 0} min</Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            )}
          </Grid>
        </>
      ) : (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="textSecondary">
            Nenhum dado disponível
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Selecione um período e clique em “Atualizar” para gerar relatório.
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

function getInitials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return letters || "?";
}

function formatRoomType(type) {
  switch (type) {
    case "ROOM":
      return "Sala";
    case "BATHROOM":
      return "Banheiro";
    case "KITCHEN":
      return "Cozinha";
    case "MEETING_ROOM":
      return "Sala de Reunião";
    default:
      return type || "Outro";
  }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
