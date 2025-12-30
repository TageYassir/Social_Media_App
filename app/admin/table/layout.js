'use client';

import CssBaseline from "@mui/material/CssBaseline";
import MuiThemeProvider from "../../theme";

export default function TableLayout({ children }) {
  return (
    <MuiThemeProvider>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
