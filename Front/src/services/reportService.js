// src/services/reportService.js
import api from "./api";

let lastReportParams = null;

function safeDate(v) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function minutesBetween(a, b) {
  const da = safeDate(a);
  const db = safeDate(b);
  if (!da || !db) return null;
  return Math.max(0, Math.round((db - da) / 60000));
}

function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const k = keyFn(item);
    acc[k] = acc[k] || [];
    acc[k].push(item);
    return acc;
  }, {});
}

const reportService = {
  // ✅ Reports.jsx chama isso
  async generateReport(params = {}) {
    try {
      lastReportParams = { ...params };

      // backend: GET /api/reports/cleanings (pode retornar {rows} ou {data} dependendo da sua implementação)
      const res = await api.get("/reports/cleanings", { params });

      const rows = Array.isArray(res?.rows) ? res.rows : Array.isArray(res?.data) ? res.data : [];

      // normaliza mínimo
      const cleanings = rows.map((r) => ({
        id: r.id,
        status: r.status,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        room: r.room || {},
        cleaner: r.cleaner || {},
        cleanerId: r.cleanerId || r.cleaner?.id,
        cleanerName: r.cleaner?.name || r.cleanerName,
        roomType: r.room?.type || r.roomType,
      }));

      const total = cleanings.length;
      const completedRows = cleanings.filter((c) => c.status === "COMPLETED");
      const completed = completedRows.length;

      const durations = completedRows
        .map((c) => minutesBetween(c.startedAt, c.completedAt))
        .filter((v) => typeof v === "number");

      const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
      const completionRate = total ? Math.round((completed / total) * 100) : 0;

      const byCleaner = groupBy(completedRows, (c) => c.cleanerId || c.cleanerName || "unknown");
      const topCleaners = Object.entries(byCleaner)
        .map(([id, items]) => {
          const name = items[0]?.cleanerName || items[0]?.cleaner?.name || "N/A";
          const ds = items.map((c) => minutesBetween(c.startedAt, c.completedAt)).filter((v) => typeof v === "number");
          const avg = ds.length ? Math.round(ds.reduce((a, b) => a + b, 0) / ds.length) : 0;
          return { id, name, cleanings: items.length, avgDuration: avg };
        })
        .sort((a, b) => b.cleanings - a.cleanings)
        .slice(0, 5);

      const byRoomType = Object.entries(groupBy(completedRows, (c) => c.roomType || "UNKNOWN")).map(([type, items]) => {
        const ds = items.map((c) => minutesBetween(c.startedAt, c.completedAt)).filter((v) => typeof v === "number");
        const avg = ds.length ? Math.round(ds.reduce((a, b) => a + b, 0) / ds.length) : 0;
        return { type, count: items.length, avgDuration: avg };
      });

      const report = {
        id: "latest",
        metadata: {
          type: params?.type || "CUSTOM",
          startDate: params?.startDate || null,
          endDate: params?.endDate || null,
        },
        summary: {
          totalCleanings: total,
          completedCleanings: completed,
          completionRate,
          avgDuration,
          uniqueRooms: new Set(cleanings.map((c) => c.room?.id).filter(Boolean)).size,
        },
        statistics: {
          topCleaners,
          byRoomType,
        },
        recommendations: [],
      };

      return { success: true, report };
    } catch (err) {
      return { success: false, report: null, error: err?.message || "Erro ao gerar relatório" };
    }
  },

  // ✅ Reports.jsx chama exportReport(reportId, 'csv')
  async exportReport(reportId = "latest", format = "csv") {
    try {
      const params = { ...(lastReportParams || {}) };

      // backend: GET /api/reports/export (CSV)
      // Se seu api.js já retorna `response.data`, isso funciona.
      const res = await api.get("/reports/export", { params, responseType: "text" });

      return { success: true, data: res?.data || res, error: null };
    } catch (err) {
      return { success: false, data: null, error: err?.message || "Erro ao exportar relatório" };
    }
  },
};

export default reportService;
