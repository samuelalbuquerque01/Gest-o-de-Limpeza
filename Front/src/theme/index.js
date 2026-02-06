// src/theme/index.js
import { createTheme } from "@mui/material/styles";

export const npc = {
  primary: "#1aae96",
  primary2: "#27c3aa",
  soft: "#8fded1",
  bg: "#fbfdfd",
  text: "#0f172a",
};

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: npc.primary },
    secondary: { main: npc.primary2 },
    info: { main: npc.soft },
    background: { default: npc.bg, paper: "#ffffff" },
    text: { primary: npc.text },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: `"Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`,
    h4: { fontWeight: 800 },
    h6: { fontWeight: 700 },
    button: { fontWeight: 700, textTransform: "none" },
  },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: 12, paddingInline: 14, paddingBlock: 10 } } },
    MuiPaper: { styleOverrides: { root: { borderRadius: 16 } } },
    MuiCard: { styleOverrides: { root: { borderRadius: 16 } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 999 } } },
  },
});

export default theme;
