"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { 
  Search as SearchIcon, Clear as ClearIcon, 
  RestartAlt, ChevronRight, ManageAccounts,
  AutoAwesome
} from "@mui/icons-material";
import {
  Avatar, colors, Paper, Stack, Typography, Button, Chip, Box, 
  CircularProgress, TextField, MenuItem, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, InputAdornment, 
  IconButton as IconButtonMaterial, GlobalStyles
} from "@mui/material";

export default function Page() {
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [validatedFilter, setValidatedFilter] = useState("");
  const [query, setQuery] = useState("");
  const [searchBy, setSearchBy] = useState("pseudo");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [adminChecked, setAdminChecked] = useState(false);
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const router = useRouter();

  // --- Logic remains identical to ensure functionality ---
  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch("/api/admin/me", { credentials: "include" });
        if (!res.ok) { router.push("/admin/login"); return; }
        const data = await res.json().catch(() => null);
        if (!data?.admin) { router.push("/admin/login"); return; }
        setAdminChecked(true);
      } catch (err) { router.push("/admin/login"); } finally { setLoadingAdmin(false); }
    }
    checkAdmin();
  }, [router]);

  useEffect(() => { if (adminChecked) fetchUsers(); }, [adminChecked]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/users?operation=get-all-users");
      const payload = await res.json().catch(() => ({}));
      let list = Array.isArray(payload) ? payload : (payload.users || payload.data || payload.items || []);
      setUsers(list);
    } catch (err) { setError("Failed to load users"); } finally { setLoading(false); }
  }

  const genderOptions = useMemo(() => Array.from(new Set(users.map(u => u?.gender).filter(Boolean))), [users]);

  const filteredUsers = users.filter((item) => {
    const genderOk = !gender || item.gender === gender;
    const isValidated = !!(item.isValidated || item.validated || item.verified || item.emailVerified || item.isVerified || item.activated);
    const validatedOk = !validatedFilter || (validatedFilter === "validated" && isValidated) || (validatedFilter === "not" && !isValidated);
    const q = (query || "").trim().toLowerCase();
    let searchOk = true;
    if (q) {
      const field = searchBy === "id" ? (item._id || item.id) : item[searchBy];
      searchOk = String(field || "").toLowerCase().includes(q);
    }
    return genderOk && validatedOk && searchOk;
  });

  if (loadingAdmin) return <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}><CircularProgress /></Box>;
  if (!adminChecked) return null;

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      p: { xs: 2, md: 4 },
      // COLORFUL GRADIENT BACKGROUND
      background: `linear-gradient(135deg, ${colors.indigo[50]} 0%, ${colors.purple[50]} 50%, ${colors.blue[100]} 100%)`,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* CUSTOM SCROLLBAR & GLOBAL STYLES */}
      <GlobalStyles styles={{
        '*::-webkit-scrollbar': { width: '8px', height: '8px' },
        '*::-webkit-scrollbar-track': { background: 'transparent' },
        '*::-webkit-scrollbar-thumb': { 
          background: colors.indigo[200], 
          borderRadius: '10px',
          '&:hover': { background: colors.indigo[400] } 
        },
        'body': { overflowX: 'hidden' }
      }} />

      {/* Decorative Blur Circles for "Good" design feel */}
      <Box sx={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', filter: 'blur(100px)', zIndex: 0 }} />
      <Box sx={{ position: 'absolute', bottom: -50, left: -50, width: 300, height: 300, borderRadius: '50%', background: 'rgba(236, 72, 153, 0.1)', filter: 'blur(80px)', zIndex: 0 }} />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {/* 1. Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar variant="rounded" sx={{ 
              background: `linear-gradient(45deg, ${colors.indigo[600]}, ${colors.purple[600]})`, 
              width: 50, height: 50, boxShadow: 3 
            }}>
              <AutoAwesome />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={900} sx={{ color: colors.indigo[900], letterSpacing: '-1px' }}>
                User Portal
              </Typography>
              <Typography variant="body2" sx={{ color: colors.indigo[400], fontWeight: 500 }}>
                Manage {users.length} unique identities
              </Typography>
            </Box>
          </Stack>
          <Button 
            onClick={() => router.push('./dashboard')} 
            variant="contained" 
            sx={{ 
              borderRadius: '12px', px: 4, py: 1.5, 
              background: `linear-gradient(45deg, ${colors.indigo[600]}, ${colors.blue[600]})`,
              textTransform: 'none', fontWeight: 700, boxShadow: '0 10px 20px -10px rgba(63, 81, 181, 0.5)'
            }}
          >
            Analytics Dashboard
          </Button>
        </Stack>

        {/* 2. Glassmorphic Filter Bar */}
        <Paper sx={{ 
          p: 2.5, mb: 4, borderRadius: '20px', 
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.05)'
        }} elevation={0}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <TextField
              fullWidth
              size="small"
              placeholder={`Quick search ${searchBy}...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: colors.indigo[300], mr: 1 }} />,
                sx: { borderRadius: '12px', bgcolor: 'white' }
              }}
            />
            <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' } }}>
              <TextField select size="small" value={searchBy} onChange={(e) => setSearchBy(e.target.value)} sx={{ minWidth: 120 }}>
                <MenuItem value="pseudo">Pseudo</MenuItem>
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="id">ID</MenuItem>
              </TextField>
              <TextField select size="small" label="Gender" value={gender} onChange={(e) => setGender(e.target.value)} sx={{ minWidth: 120 }}>
                <MenuItem value="">All</MenuItem>
                {genderOptions.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Status" value={validatedFilter} onChange={(e) => setValidatedFilter(e.target.value)} sx={{ minWidth: 120 }}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="validated">Verified</MenuItem>
                <MenuItem value="not">Pending</MenuItem>
              </TextField>
              <IconButtonMaterial 
                onClick={() => { setGender(""); setQuery(""); setValidatedFilter(""); }}
                sx={{ bgcolor: 'white', borderRadius: '12px', border: `1px solid ${colors.indigo[100]}` }}
              >
                <RestartAlt color="primary" />
              </IconButtonMaterial>
            </Stack>
          </Stack>
        </Paper>

        {/* 3. Colorful Table Container */}
        <TableContainer component={Paper} sx={{ 
          borderRadius: '24px', 
          maxHeight: '65vh',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
          border: '1px solid white'
        }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {['User Identity', 'Contact Details', 'Status', 'Actions'].map((head) => (
                  <TableCell key={head} sx={{ 
                    bgcolor: 'white', fontWeight: 800, color: colors.indigo[900], py: 3,
                    borderBottom: `2px solid ${colors.indigo[50]}`
                  }}>
                    {head}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((item, idx) => {
                const isValid = !!(item.isValidated || item.validated || item.verified);
                return (
                  <TableRow key={idx} hover sx={{ '&:hover': { bgcolor: `${colors.indigo[50]} !important` } }}>
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ 
                          background: `linear-gradient(45deg, ${colors.blue[400]}, ${colors.indigo[600]})`,
                          fontWeight: 700, borderRadius: '12px'
                        }}>
                          {(item.pseudo || "U")[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={800} color={colors.indigo[900]}>{item.pseudo}</Typography>
                          <Typography variant="caption" sx={{ color: colors.grey[500] }}>ID: {item._id?.slice(-6)}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{item.email}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.gender || 'Not specified'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={isValid ? "Verified" : "Pending"} 
                        sx={{ 
                          borderRadius: '8px', fontWeight: 900, fontSize: '10px',
                          bgcolor: isValid ? colors.green[50] : colors.orange[50],
                          color: isValid ? colors.green[700] : colors.orange[700],
                          border: `1px solid ${isValid ? colors.green[200] : colors.orange[200]}`
                        }} 
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        endIcon={<ChevronRight />}
                        onClick={() => router.push(`/admin/${item._id}`)}
                        sx={{ 
                          borderRadius: '10px', textTransform: 'none', fontWeight: 700,
                          borderWidth: '2px', '&:hover': { borderWidth: '2px' }
                        }}
                      >
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}