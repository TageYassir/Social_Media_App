"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { Money } from "@mui/icons-material";
import {
  Avatar,
  colors,
  Grid,
  Paper,
  Stack,
  Typography,
  Box,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { PieChart } from "@mui/x-charts";
import { BarChart } from "@mui/x-charts/BarChart";
import jwt from "jsonwebtoken";

export default function Page() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [loadingAdmin, setLoadingAdmin] = useState(true);

  // Online users dialog state
  const [openOnlineList, setOpenOnlineList] = useState(false);
  const handleOpenOnline = () => setOpenOnlineList(true);
  const handleCloseOnline = () => setOpenOnlineList(false);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  // Vérifier JWT côté client
  useEffect(() => {
    async function fetchAdmin() {
      try {
        const res = await fetch("/api/admin/me", {
          credentials: "include",
        });
  
        if (!res.ok) {
          router.push("/admin/login");
          return;
        }
  
        const data = await res.json();
  
        if (!data?.admin) {
          router.push("/admin/login");
          return;
        }
  
        setAdmin(data.admin);
        setLoadingAdmin(false); 
      } catch (e) {
        router.push("/admin/login");
      }
    }
  
    fetchAdmin();
  }, []);
  
  

  // Charger utilisateurs
  useEffect(() => {
    
    async function loadUsers() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/users?operation=get-all-users");
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          setError(payload?.error || `Server returned ${res.status}`);
          setUsers([]);
        } else {
          const raw = Array.isArray(payload?.users) ? payload.users : [];
          const now = Date.now();
          const normalized = raw.map((u) => {
            const last = u?.lastActive || u?.lastSeen || u?.updatedAt || u?.lastLogin;
            const recentlyActive = last ? now - new Date(last).getTime() < 5 * 60 * 1000 : false;
            const explicitOn = u?.online === true || u?.isOnline === true;
            const explicitOff = u?.online === false || u?.isOnline === false;
            const isOnlineComputed = explicitOff ? false : (explicitOn || recentlyActive);
            return { ...u, isOnlineComputed };
          });
          setUsers(normalized);
        }
      } catch (e) {
        setError(e?.message || "Failed to load users");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

 

  // Heuristiques pour online, stats, charts (inchangées)
  const onlineCount = useMemo(() => {
    if (!Array.isArray(users)) return 0;
    return users.reduce((acc, u) => (u?.isOnlineComputed ? acc + 1 : acc), 0);
  }, [users]);

  const totalCount = users?.length || 0;
  const offlineCount = Math.max(0, totalCount - onlineCount);

  const createdLast7Days = useMemo(() => {
    if (!Array.isArray(users)) return 0;
    const now = Date.now();
    return users.reduce((acc, u) => {
      const created = u?.createdAt || u?.created || u?.created_on || u?.created_at;
      if (!created) return acc;
      return now - new Date(created).getTime() <= 7 * 24 * 60 * 60 * 1000 ? acc + 1 : acc;
    }, 0);
  }, [users]);

  // Chart & online users dérivés...
  const fieldOptions = ["country", "gender"];
  const [chartType, setChartType] = useState("pie");
  const [groupBy, setGroupBy] = useState("country");
  const [refreshKey, setRefreshKey] = useState(0);

  const aggregated = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      let key = groupBy === "country" ? u.country || "Unknown" : u.gender || "Unknown";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  }, [users, groupBy]);

  const pieSeries = useMemo(() => [{ data: aggregated.map((d, idx) => ({ id: idx, value: d.count, label: d.key })) }], [aggregated]);
  const barXAxis = useMemo(() => [{ data: aggregated.map((d) => d.key) }], [aggregated]);
  const barSeries = useMemo(() => [{ data: aggregated.map((d) => d.count) }], [aggregated]);
  const onlineUsers = useMemo(() => users.filter((u) => u.isOnlineComputed), [users]);

  if (loadingAdmin) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }
  return (
    <Grid container spacing={2} sx={{ padding: 2 }}>
      {admin && (
        <Grid item xs={12}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar sx={{ bgcolor: colors.deepPurple[500] }}>
                {admin.pseudo.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography fontWeight={600}>{admin.pseudo}</Typography>
                <Typography variant="caption" color="text.secondary">Administrator</Typography>
              </Box>
              <Box sx={{ flex: 1 }} />
              <Button variant="outlined" color="error" size="small" onClick={handleLogout}>
                Logout
              </Button>
            </Stack>
          </Paper>
        </Grid>
      )}

      {/* Stats row */}
      <Grid item xs={12}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Paper sx={{ p: 2, minWidth: 160 }}>
            <Typography variant="subtitle2" color="text.secondary">Total Accounts</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{totalCount}</Typography>
          </Paper>

          {/* clickable Online card */}
          <Paper
            sx={{ p: 2, minWidth: 160, cursor: "pointer", "&:hover": { boxShadow: 3 } }}
            onClick={handleOpenOnline}
            role="button"
            aria-label="Show online users"
          >
            <Typography variant="subtitle2" color="text.secondary">Online</Typography>
            <Typography variant="h5" sx={{ color: colors.green[700], fontWeight: 700 }}>{onlineCount}</Typography>
          </Paper>

          <Paper sx={{ p: 2, minWidth: 160 }}>
            <Typography variant="subtitle2" color="text.secondary">Offline</Typography>
            <Typography variant="h5" sx={{ color: colors.grey[700], fontWeight: 700 }}>{offlineCount}</Typography>
          </Paper>

          <Paper sx={{ p: 2, minWidth: 200 }}>
            <Typography variant="subtitle2" color="text.secondary">Created (last 7 days)</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{createdLast7Days}</Typography>
          </Paper>

          <Box sx={{ flex: 1 }} />

          <Button variant="contained" onClick={() => setRefreshKey((k) => k + 1)}>Refresh</Button>
        </Stack>
      </Grid>

      {/* Controls + Chart */}
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Avatar sx={{ bgcolor: colors.indigo[500] }}><Money /></Avatar>
              <Box>
                <Typography variant="subtitle1">Visualize Users</Typography>
                <Typography variant="caption" color="text.secondary">Choose chart type and grouping column</Typography>
              </Box>
            </Stack>

            <TextField select size="small" label="Chart type" value={chartType} onChange={(e) => setChartType(e.target.value)}>
              <MenuItem value="pie">Pie</MenuItem>
              <MenuItem value="bar">Bar</MenuItem>
            </TextField>

            <TextField select size="small" label="Group by" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
              {fieldOptions.map((f) => (
                <MenuItem key={f} value={f}>{f}</MenuItem>
              ))}
            </TextField>

            <Typography variant="body2" color="text.secondary">
              Showing top {aggregated.length} groups
            </Typography>

            <Box>
              <Button variant="outlined" size="small" onClick={() => { setChartType("pie"); setGroupBy("country") }}>
                Quick: Country (Pie)
              </Button>
              <Button sx={{ ml: 1 }} variant="outlined" size="small" onClick={() => { setChartType("bar"); setGroupBy("gender") }}>
                Quick: Gender (Bar)
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Grid>

      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2, minHeight: 360 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>{chartType === "pie" ? "Distribution (Pie)" : "Distribution (Bar)"}</Typography>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 240 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : aggregated.length === 0 ? (
            <Typography color="text.secondary">No data to display.</Typography>
          ) : chartType === "pie" ? (
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <PieChart series={pieSeries} width={360} height={320} />
            </Box>
          ) : (
            <Box>
              <BarChart xAxis={barXAxis} series={barSeries} height={320} />
            </Box>
          )}
        </Paper>
      </Grid>

      {/* Recent users preview */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Recent accounts (latest 10)</Typography>
          <Box>
            {loading ? (
              <Typography variant="body2" color="text.secondary">Loading...</Typography>
            ) : (
              users.slice().reverse().slice(0, 10).map((u) => (
                <Stack key={u._id || u.id || JSON.stringify(u).slice(0,8)} direction="row" spacing={2} alignItems="center" sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
                  <Avatar sx={{ bgcolor: colors.blue[500], width: 36, height: 36 }}>{(u.pseudo || u.firstName || "U").charAt(0)}</Avatar>
                  <Box sx={{ minWidth: 220 }}>
                    <Typography variant="subtitle2">
                      {u.pseudo || u.firstName || u.email || (u._id || u.id)}
                      {u?.isOnlineComputed ? (
                        <Typography component="span" sx={{ ml: 1, color: colors.green[700], fontWeight: 600 }} variant="caption">• online</Typography>
                      ) : null}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{u.country || "—"} — {u.gender || "—"}</Typography>
                  </Box>
                  <Box sx={{ ml: "auto" }}>
                    <Typography variant="caption" color="text.secondary">{u.createdAt ? new Date(u.createdAt).toLocaleString() : ""}</Typography>
                  </Box>
                </Stack>
              ))
            )}
          </Box>
        </Paper>
      </Grid>

      {/* Online users dialog */}
      <Dialog open={openOnlineList} onClose={handleCloseOnline} fullWidth maxWidth="sm">
        <DialogTitle>
          Online users ({onlineUsers.length})
          <IconButton
            aria-label="close"
            onClick={handleCloseOnline}
            sx={{ position: "absolute", right: 8, top: 8 }}
            size="large"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {onlineUsers.length === 0 ? (
            <Typography color="text.secondary">No users online</Typography>
          ) : (
            <List>
              {onlineUsers.map((u) => (
                <ListItem key={u._id || u.id || JSON.stringify(u).slice(0,8)}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: colors.blue[500], width: 36, height: 36 }}>
                      {(u.pseudo || u.firstName || "U").charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={u.pseudo || u.firstName || u.email || (u._id || u.id)}
                    secondary={u.country ? `${u.country} — ${u.gender || "—"}` : (u.gender || "—")}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </Grid>
  );
}

      
