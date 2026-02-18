// src/pages/AdminLogin.jsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
} from "@mui/material";
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// ✅ logo local
import logoPng from "../assets/logo.png";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login, user, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  // Se já estiver logado como admin, entra direto
  useEffect(() => {
    if (user?.role === "ADMIN") {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const res = await login(email, password);

    if (res?.success) {
      navigate("/admin/dashboard", { replace: true });
      return;
    }

    setError(res?.error || "Falha no login");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        background: (theme) =>
          `linear-gradient(135deg, ${theme.palette.primary.main}14 0%, #ffffff 60%)`,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={8}
          sx={{
            p: 4,
            borderRadius: 4,
            textAlign: "center",
          }}
        >
          {/* LOGO */}
          <Box sx={{ mb: 2 }}>
            <Box
              component="img"
              src={logoPng}
              alt="Neuropsicocentro"
              sx={{
                width: 90,
                height: 90,
                objectFit: "contain",
                mb: 1,
              }}
            />

            <Typography
              variant="h5"
              sx={{ fontWeight: 900, color: "primary.main" }}
            >
              Neuropsicocentro
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Acesso Administrativo
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: "grid", gap: 2, mt: 2 }}
          >
            <TextField
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="primary" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Senha"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
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
              disabled={loading}
              sx={{
                py: 1.3,
                fontWeight: 900,
                borderRadius: 2,
              }}
            >
              {loading ? (
                <CircularProgress size={22} sx={{ color: "#fff" }} />
              ) : (
                "Entrar"
              )}
            </Button>

            <Button
              variant="text"
              onClick={() => navigate("/worker/login")}
              sx={{ fontWeight: 700 }}
            >
              Sou funcionário
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default AdminLogin;
