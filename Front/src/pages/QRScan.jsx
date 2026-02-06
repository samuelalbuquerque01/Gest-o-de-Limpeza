import React, { useState } from "react";
import api from "../services/api"; // ajuste se seu caminho for diferente

export default function QRScan() {
  const [qrCode, setQrCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleScan() {
    setError("");
    setResult(null);

    const code = qrCode.trim();
    if (!code) {
      setError("Informe o QR Code.");
      return;
    }

    try {
      setLoading(true);

      // chama o BACKEND: GET /api/rooms/qr/:qrCode
      const data = await api.get(`/rooms/qr/${encodeURIComponent(code)}`);

      // seu backend retorna: { success, room, isBeingCleaned, currentCleaner, message }
      if (!data?.success) {
        setError(data?.message || "Falha ao buscar ambiente pelo QR Code.");
        return;
      }

      setResult(data);
    } catch (e) {
      setError(e?.message || "Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Escanear QR Code</h2>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={qrCode}
          onChange={(e) => setQrCode(e.target.value)}
          placeholder="Cole/digite o QR Code aqui"
          style={{ flex: 1, padding: 10 }}
        />
        <button onClick={handleScan} disabled={loading} style={{ padding: "10px 14px" }}>
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </div>

      {error ? (
        <p style={{ marginTop: 12 }}>{error}</p>
      ) : null}

      {result?.room ? (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <h3>{result.room.name}</h3>
          <p><b>Local:</b> {result.room.location}</p>
          <p><b>Tipo:</b> {result.room.type}</p>
          <p><b>Status:</b> {result.room.status}</p>
          <p><b>Prioridade:</b> {result.room.priority}</p>

          <p style={{ marginTop: 10 }}>
            <b>Situação:</b>{" "}
            {result.isBeingCleaned
              ? `Em limpeza por ${result.currentCleaner?.name || "alguém"}`
              : "Disponível para limpeza"}
          </p>

          {result.message ? <p>{result.message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
