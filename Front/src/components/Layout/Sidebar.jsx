import React from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Tooltip,
  Chip,
  Divider,
  useTheme,
} from "@mui/material";

import {
  Dashboard as DashboardIcon,
  CleaningServices,
  History,
  Assessment,
  Settings,
  AdminPanelSettings,
  QrCodeScanner,
  People,
} from "@mui/icons-material";

import { useNavigate, useLocation } from "react-router-dom";

// ✅ Logo local (sem CORS, aparece sempre)
import logoPng from "../../assets/logo.png";


const Sidebar = ({ drawerWidth, mobileOpen, onDrawerToggle, isMobile, userRole }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Itens do menu para funcionários (rotas existentes)
  const cleanerMenuItems = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/worker" },
    { text: "Escanear QR Code", icon: <QrCodeScanner />, path: "/scan" },
  ];

  // ✅ Itens do menu para administradores (rotas existentes)
  const adminMenuItems = [
    { text: "Dashboard Admin", icon: <AdminPanelSettings />, path: "/admin/dashboard" },
    { text: "Gerenciar Salas", icon: <CleaningServices />, path: "/rooms" },
    { text: "Gerenciar Funcionários", icon: <People />, path: "/admin/workers" },
    { text: "Relatórios", icon: <Assessment />, path: "/reports" },
    { text: "Histórico Completo", icon: <History />, path: "/history" },
    { text: "Configurações", icon: <Settings />, path: "/settings" },
  ];

  const menuItems = userRole === "ADMIN" ? adminMenuItems : cleanerMenuItems;

  const roleLabel = userRole === "ADMIN" ? "Administrador" : "Funcionário";
  const roleChipLabel = userRole === "ADMIN" ? "Admin" : "Equipe";
  const roleDesc = userRole === "ADMIN" ? "Controle total" : "Limpeza e higiene";

  const drawerContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* ✅ Cabeçalho com LOGO (fixo em todas as telas) */}
      <Box
        sx={{
          px: 2.5,
          py: 2.25,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          borderBottom: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <Box
          component="img"
          src={logoPng}
          alt="Neuropsicocentro"
          sx={{
            width: 46,
            height: 46,
            objectFit: "contain",
          }}
        />

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 900,
                color: "primary.main",
                lineHeight: 1.1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Neuropsicocentro
            </Typography>

            <Chip
              label={roleChipLabel}
              size="small"
              sx={{
                height: 22,
                fontWeight: 800,
                bgcolor: "rgba(26, 174, 150, 0.12)", // leve background (marca)
                color: "primary.main",
              }}
            />
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.2 }}>
            {roleLabel} • {roleDesc}
          </Typography>
        </Box>
      </Box>

      <Divider />

      {/* Menu */}
      <List sx={{ flexGrow: 1, p: 2 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");

          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <Tooltip title={item.text} placement="right">
                <ListItemButton
                  selected={isActive}
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 2,
                    "&.Mui-selected": {
                      backgroundColor: "primary.main",
                      color: "white",
                      "&:hover": {
                        backgroundColor: theme.palette.primary.dark,
                      },
                      "& .MuiListItemIcon-root": {
                        color: "white",
                      },
                    },
                    "&:hover": {
                      backgroundColor: "action.hover",
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: isActive ? "white" : "inherit" }}>
                    {item.icon}
                  </ListItemIcon>

                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: "0.9rem",
                      fontWeight: isActive ? 700 : 500,
                    }}
                  />
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      {/* Rodapé */}
      <Box sx={{ p: 2, borderTop: "1px solid rgba(0,0,0,0.08)" }}>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          Sistema de Gestão de Limpeza
        </Typography>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          Neuropsicocentro • v1.0.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
      {/* Drawer Mobile */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: drawerWidth,
            borderRight: "1px solid rgba(0,0,0,0.08)",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Drawer Desktop */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", sm: "block" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: drawerWidth,
            borderRight: "1px solid rgba(0,0,0,0.08)",
            backgroundColor: "background.paper",
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
