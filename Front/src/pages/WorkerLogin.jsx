import React, { useState } from "react";
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Divider,
} from "@mui/material";
import { Badge, Lock, Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// ✅ logo local (sem CORS)
import logoPng from "../assets/logo.png";

const WorkerLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWorker, loading, error } = useAuth();

  const from = location.state?.from?.pathname || "/";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");

    if (!identifier || !password) {
      setLocalError("Preencha todos os campos.");
      return;
    }

    const res = await loginWorker(identifier, password);
    if (res?.success) navigate(from, { replace: true });
    else setLocalError(res?.error || "Falha no login");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        background: (theme) =>
          `linear-gradient(135deg, ${theme.palette.primary.main}14 0%, #ffffff 60%)`,
        py: 6,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={8}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            textAlign: "center",
          }}
        >
          {/* Logo + título */}
          <Box sx={{ mb: 2 }}>
            <Box
              component="img"
              src={logoPng}
              alt="Neuropsicocentro"
              sx={{ width: 90, height: 90, objectFit: "contain", mb: 1 }}
            />

            <Typography variant="h5" sx={{ fontWeight: 900, color: "primary.main" }}>
              Neuropsicocentro
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Acesso do Funcionário
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Entre para registrar limpezas com auditoria e histórico.
          </Typography>

          {(error || localError) && (
            <Alert severity="error" sx={{ mb: 2, textAlign: "left" }}>
              {localError || error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gap: 2 }}>
            <TextField
              label="Email ou Matrícula"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Badge color="primary" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Senha"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="primary" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShow((s) => !s)} edge="end">
                      {show ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ py: 1.3, fontWeight: 900, borderRadius: 2 }}
            >
              {loading ? <CircularProgress size={22} sx={{ color: "white" }} /> : "Entrar"}
            </Button>

            <Divider sx={{ my: 0.5 }} />

            <Button variant="text" onClick={() => navigate("/admin/login")} sx={{ fontWeight: 700 }}>
              Sou administrador
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default WorkerLogin;
