// Front/src/pages/QRScan.jsx
import React, { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import QRScanner from "../components/common/QRScanner";

export default function QRScan() {
  const [open, setOpen] = useState(true);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 900, mb: 2 }}>
        Escanear QR Code
      </Typography>

      <Button variant="contained" onClick={() => setOpen(true)}>
        Abrir Scanner
      </Button>

      <QRScanner
        open={open}
        onClose={() => setOpen(false)}
        autoStart={false}
        onScan={(data) => {
          // data = resposta do backend (room, isBeingCleaned etc.)
          // aqui você pode redirecionar ou só logar
          console.log("Scan result:", data);
        }}
      />
    </Box>
  );
}
