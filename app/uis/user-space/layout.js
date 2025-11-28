'use client'

import { LocationOn as LocationOnIcon, MessageOutlined, PeopleOutline, CurrencyBitcoin } from "@mui/icons-material";
import { AppBar, Box, Button, IconButton, Stack, Toolbar, Typography, Paper, BottomNavigation, BottomNavigationAction } from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RootLayout({ children }) {
  const router = useRouter();

  function loadScreen(event, screenURL) {
    event?.preventDefault?.();
    router.push(screenURL);
  }

  const [value, setValue] = useState(0);

  return (
    <Box sx={{ position: "absolute", top: 0, left: 0, bottom: 0, right: 0 }}>
      <Box sx={{ position: "relative", top: 0, left: 0, bottom: 0, right: 0, display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', overflow: 'hidden' }}>
        {/* App Bar (minimal) */}
        <Box>
          <AppBar position="static">
            <Toolbar>
              <Typography sx={{ fontSize: 18, fontWeight: 700, flexGrow: 1 }}>
                Mini-Map
              </Typography>
              <Stack direction={"row"} spacing={1}>
                {/* kept minimal - user asked to leave only Maps, Chat, Community navigation */}
                <IconButton onClick={(e) => loadScreen(e, "/uis/user-space/profile")} size="large" edge="end" sx={{ ml: 1 }}>
                  {/* tiny profile button remains optional */}
                </IconButton>
              </Stack>
            </Toolbar>
          </AppBar>
        </Box>

        {/* Children */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 1, '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}>
          {children}
        </Box>

        {/* Bottom Navigation - Maps, Chat, Crypto (currency) and Community */}
        <Box>
          <Paper elevation={2}>
            <BottomNavigation showLabels value={value} onChange={(event, newValue) => setValue(newValue)}>
              <BottomNavigationAction onClick={(e) => loadScreen(e, "/uis/user-space/maps")} label="Maps" icon={<LocationOnIcon />} />
              <BottomNavigationAction onClick={(e) => loadScreen(e, "/uis/chat")} label="Chat" icon={<MessageOutlined />} />
              <BottomNavigationAction onClick={(e) => loadScreen(e, "/uis/crypto")} label="Crypto" icon={<CurrencyBitcoin />} />
              <BottomNavigationAction onClick={(e) => loadScreen(e, "/uis/all-users")} label="Community" icon={<PeopleOutline />} />
            </BottomNavigation>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}