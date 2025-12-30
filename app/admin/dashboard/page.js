"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { 
  Money, People, OnlinePrediction, PersonAddAlt, 
  Refresh, Logout, Dashboard as DashboardIcon 
} from "@mui/icons-material";
import {
  Avatar, colors, Grid, Paper, Stack, Typography, Box, TextField,
  MenuItem, Button, CircularProgress, Dialog, DialogTitle, DialogContent,
  List, ListItem, ListItemAvatar, ListItemText, IconButton, Divider, Chip
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { PieChart, BarChart } from "@mui/x-charts";

export default function Page() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [loadingAdmin, setLoadingAdmin] = useState(true);

  // Stats logic remains exactly as your original code
  const [openOnlineList, setOpenOnlineList] = useState(false);
  const handleOpenOnline = () => setOpenOnlineList(true);
  const handleCloseOnline = () => setOpenOnlineList(false);

  const [chartType, setChartType] = useState("pie");
  const [groupBy, setGroupBy] = useState("country");
  const [refreshKey, setRefreshKey] = useState(0);

  // -- (Original fetch and logic functions remain unchanged) --
  useEffect(() => {
    async function fetchAdmin() {
      try {
        const res = await fetch("/api/admin/me");
        if (!res.ok) { router.push("/admin/login"); return; }
        const data = await res.json();
        setAdmin(data.admin);
        setLoadingAdmin(false);
      } catch (e) { router.push("/admin/login"); }
    }
    fetchAdmin();
  }, [router]);

  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      try {
        const res = await fetch("/api/users?operation=get-all-users");
        const payload = await res.json();
        const raw = Array.isArray(payload?.users) ? payload.users : [];
        const now = Date.now();
        const normalized = raw.map((u) => {
          const last = u?.lastActive || u?.lastSeen || u?.updatedAt || u?.lastLogin;
          const recentlyActive = last ? now - new Date(last).getTime() < 5 * 60 * 1000 : false;
          const isOnlineComputed = (u?.online === false || u?.isOnline === false) ? false : (u?.online === true || u?.isOnline === true || recentlyActive);
          return { ...u, isOnlineComputed };
        });
        setUsers(normalized);
      } catch (e) { setError("Failed to load users"); } finally { setLoading(false); }
    }
    loadUsers();
  }, [refreshKey]);

  const onlineCount = useMemo(() => users.filter(u => u.isOnlineComputed).length, [users]);
  const totalCount = users.length;
  const offlineCount = Math.max(0, totalCount - onlineCount);
  const createdLast7Days = useMemo(() => {
    const now = Date.now();
    return users.filter(u => (now - new Date(u.createdAt).getTime()) <= 7 * 24 * 60 * 60 * 1000).length;
  }, [users]);

  const aggregated = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      let key = groupBy === "country" ? u.country || "Unknown" : u.gender || "Unknown";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
  }, [users, groupBy]);

  // -- MODERN DASHBOARD RENDER --
  if (loadingAdmin) return <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ bgcolor: "#f4f6f8", minHeight: "100vh", p: 4 }}>
      {/* 1. Header / Top Nav */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="text.primary">Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">Welcome back, {admin?.pseudo}. Here is what's happening today.</Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button variant="contained" startIcon={<Refresh />} onClick={() => setRefreshKey(k => k + 1)} disableElevation sx={{ borderRadius: 2 }}>Refresh</Button>
          <Divider orientation="vertical" flexItem />
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar sx={{ bgcolor: colors.deepPurple[500], width: 40, height: 40, fontWeight: 700 }}>{admin?.pseudo.charAt(0).toUpperCase()}</Avatar>
            <IconButton color="error" onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); router.push("/admin/login"); }}><Logout /></IconButton>
          </Stack>
        </Stack>
      </Stack>

      {/* 2. Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: "Total Accounts", value: totalCount, icon: <People />, color: colors.blue[600], bg: colors.blue[50] },
          { label: "Online Now", value: onlineCount, icon: <OnlinePrediction />, color: colors.green[600], bg: colors.green[50], clickable: true },
          { label: "Offline Users", value: offlineCount, icon: <People />, color: colors.grey[600], bg: colors.grey[100] },
          { label: "New (7 Days)", value: createdLast7Days, icon: <PersonAddAlt />, color: colors.orange[600], bg: colors.orange[50] },
        ].map((stat, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Paper 
              onClick={stat.clickable ? handleOpenOnline : undefined}
              sx={{ 
                p: 3, borderRadius: 4, display: 'flex', alignItems: 'center', 
                cursor: stat.clickable ? 'pointer' : 'default',
                transition: '0.2s', '&:hover': { transform: stat.clickable ? 'translateY(-4px)' : 'none', boxShadow: 4 }
              }} elevation={0}
            >
              <Avatar sx={{ bgcolor: stat.bg, color: stat.color, mr: 2, borderRadius: 3 }}>{stat.icon}</Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase' }}>{stat.label}</Typography>
                <Typography variant="h5" fontWeight={800}>{stat.value}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* 3. Controls & Chart Area */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 4, height: '100%' }} elevation={0}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight={700}>User Distribution</Typography>
              <Stack direction="row" spacing={1}>
                <TextField select size="small" value={chartType} onChange={(e) => setChartType(e.target.value)} sx={{ width: 100 }}>
                  <MenuItem value="pie">Pie</MenuItem>
                  <MenuItem value="bar">Bar</MenuItem>
                </TextField>
                <TextField select size="small" value={groupBy} onChange={(e) => setGroupBy(e.target.value)} sx={{ width: 120 }}>
                  <MenuItem value="country">Country</MenuItem>
                  <MenuItem value="gender">Gender</MenuItem>
                </TextField>
              </Stack>
            </Stack>
            
            <Box sx={{ width: '100%', height: 350, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {chartType === "pie" ? (
                <PieChart series={[{ data: aggregated.map((d, i) => ({ id: i, value: d.count, label: d.key })) }]} height={300} />
              ) : (
                <BarChart xAxis={[{ scaleType: 'band', data: aggregated.map(d => d.key) }]} series={[{ data: aggregated.map(d => d.count) }]} height={300} />
              )}
            </Box>
          </Paper>
        </Grid>

        {/* 4. Recent Users List */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 4, height: '100%' }} elevation={0}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Recent Registrations</Typography>
            <List disablePadding>
              {users.slice().reverse().slice(0, 6).map((u, i) => (
                <React.Fragment key={i}>
                  <ListItem disableGutters sx={{ py: 1.5 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: colors.blue[100], color: colors.blue[800], borderRadius: 2 }}>
                        {(u.pseudo || "U").charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={<Typography variant="subtitle2" fontWeight={700}>{u.pseudo || u.email}</Typography>}
                      secondary={u.country || "Global"}
                    />
                    <Box sx={{ textAlign: 'right' }}>
                       {u.isOnlineComputed && <Chip label="online" size="small" sx={{ height: 18, fontSize: 10, bgcolor: colors.green[50], color: colors.green[800], fontWeight: 800, mb: 0.5 }} />}
                       <Typography variant="caption" display="block" color="text.secondary">
                         {new Date(u.createdAt).toLocaleDateString()}
                       </Typography>
                    </Box>
                  </ListItem>
                  {i < 5 && <Divider variant="inset" component="li" sx={{ ml: 7 }} />}
                </React.Fragment>
              ))}
            </List>
            <Button 
              fullWidth 
              variant="text" 
              sx={{ mt: 1, textTransform: 'none', fontWeight: 700 }}
              onClick={() => router.push('/admin/table')}
            >
              View All Accounts
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Online Dialog */}
      <Dialog open={openOnlineList} onClose={handleCloseOnline} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Online Users ({onlineCount})</DialogTitle>
        <DialogContent dividers>
          <List>
            {users.filter(u => u.isOnlineComputed).map((u, i) => (
              <ListItem key={i}>
                <ListItemAvatar>
                  <Badge color="success" variant="dot" overlap="circular"><Avatar src={u.avatar} /></Badge>
                </ListItemAvatar>
                <ListItemText primary={u.pseudo} secondary={u.country} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

// Utility component for Badge (required for the Online Dialog)
function Badge({ children, color }) {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      {children}
      <Box sx={{ 
        position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, 
        bgcolor: color === 'success' ? colors.green[500] : colors.grey[500], 
        borderRadius: '50%', border: '2px solid white' 
      }} />
    </Box>
  );
}