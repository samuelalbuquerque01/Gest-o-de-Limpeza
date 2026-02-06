import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Menu,
  MenuItem,
  Divider,
  Badge,
  Tooltip,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const Navbar = ({ onDrawerToggle }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [anchorElUser, setAnchorElUser] = useState(null);
  const [notificationsAnchor, setNotificationsAnchor] = useState(null);

  const handleLogout = async () => {
    await logout();
    navigate(user?.role === "ADMIN" ? "/admin/login" : "/worker/login");
    setAnchorElUser(null);
  };

  const handleProfile = () => {
    navigate("/settings");
    setAnchorElUser(null);
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { sm: `calc(100% - 240px)` },
        ml: { sm: "240px" },
        boxShadow: 1,
        backgroundColor: "white",
        color: "text.primary",
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onDrawerToggle}
          sx={{ mr: 2, display: { sm: "none" } }}
        >
          <MenuIcon />
        </IconButton>

        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ flexGrow: 1, fontWeight: 600, color: "#2c3e50" }}
        >
          {user?.role === "ADMIN" ? "Painel Administrativo" : "Sistema de Limpeza"}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title="Notificações">
            <IconButton onClick={(e) => setNotificationsAnchor(e.currentTarget)} color="inherit">
              <Badge badgeContent={0} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={notificationsAnchor}
            open={Boolean(notificationsAnchor)}
            onClose={() => setNotificationsAnchor(null)}
          >
            <MenuItem disabled>Nenhuma notificação</MenuItem>
          </Menu>

          <Tooltip title="Conta">
            <IconButton onClick={(e) => setAnchorElUser(e.currentTarget)} color="inherit">
              <PersonIcon />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorElUser}
            open={Boolean(anchorElUser)}
            onClose={() => setAnchorElUser(null)}
          >
            <MenuItem onClick={handleProfile}>
              <SettingsIcon fontSize="small" style={{ marginRight: 8 }} />
              Configurações
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <LogoutIcon fontSize="small" style={{ marginRight: 8 }} />
              Sair
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
