"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Box, Paper, Typography, TextField, Button, Stack, 
  CircularProgress, Alert, IconButton, Divider, 
  colors, GlobalStyles, Avatar, Grid, Chip, List, ListItem, 
  ListItemText, InputAdornment
} from "@mui/material";
import { 
  ArrowBack, Save, DeleteForever, Code, Search, 
  Article, AccessTime, Person
} from "@mui/icons-material";

export default function UserManagementPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [user, setUser] = useState(null);
  const [jsonInput, setJsonInput] = useState(""); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setPostsLoading(true);
      try {
        const [userRes, postsRes] = await Promise.all([
          fetch(`/api/users/${id}`),
          fetch(`/api/posts?userId=${id}`)
        ]);

        const userData = await userRes.json();
        if (!userRes.ok) throw new Error(userData.error || "User not found");
        setUser(userData);
        setJsonInput(JSON.stringify(userData, null, 2));

        if (postsRes.ok) {
          const postsData = await postsRes.json();
          setPosts(postsData.posts || []);
        } else {
          setPostsError("Could not load posts.");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        setPostsLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  // Filter posts based on search query
  const filteredPosts = useMemo(() => {
    return posts.filter(post => 
      post.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [posts, searchQuery]);

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post permanently?")) return;
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete post");
      setPosts(posts.filter(p => p._id !== postId));
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updatedData = JSON.parse(jsonInput);
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Update failed");
      setSuccess(true);
      setUser(result);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", bgcolor: colors.indigo[50] }}>
        <CircularProgress thickness={5} sx={{ color: colors.indigo[500] }} />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: "100vh", p: { xs: 2, md: 4 },
      background: `linear-gradient(135deg, ${colors.indigo[50]} 0%, ${colors.purple[50]} 100%)`,
    }}>
      <GlobalStyles styles={{
        '*::-webkit-scrollbar': { width: '6px' },
        '*::-webkit-scrollbar-thumb': { background: colors.indigo[100], borderRadius: '10px' },
      }} />

      <Box sx={{ maxWidth: '1600px', mx: 'auto' }}>
        {/* Header */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
          <IconButton onClick={() => router.back()} sx={{ bgcolor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight={900} color={colors.indigo[900]}>Management Console</Typography>
            <Typography variant="body2" color="text.secondary">User: {user.pseudo} • ID: {id}</Typography>
          </Box>
        </Stack>

        <Grid container spacing={3}>
          {/* LEFT: User Profile */}
          <Grid item xs={12} lg={3}>
            <Paper sx={{ p: 3, borderRadius: '24px', textAlign: 'center', border: '1px solid white', bgcolor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)' }}>
              <Avatar sx={{ width: 100, height: 100, mx: 'auto', mb: 2, fontSize: '2.5rem', fontWeight: 900, background: `linear-gradient(45deg, ${colors.indigo[600]}, ${colors.purple[600]})` }}>
                {user.pseudo?.[0]?.toUpperCase()}
              </Avatar>
              <Typography variant="h5" fontWeight={800}>{user.pseudo}</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>{user.email}</Typography>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={2} textAlign="left">
                <Box>
                  <Typography variant="caption" fontWeight={800} color="primary">ROLE</Typography>
                  <Typography variant="body2" fontWeight={600}>{user.isAdmin ? "Administrator" : "Standard User"}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" fontWeight={800} color="primary">POST COUNT</Typography>
                  <Typography variant="body2" fontWeight={600}>{posts.length} Publications</Typography>
                </Box>
              </Stack>
              <Button fullWidth variant="outlined" color="error" startIcon={<DeleteForever />} sx={{ mt: 4, borderRadius: '12px', fontWeight: 700 }} onClick={() => {/* ... delete logic */}}>
                Terminate User
              </Button>
            </Paper>
          </Grid>

          {/* MIDDLE: JSON Editor */}
          <Grid item xs={12} lg={5}>
            <Paper sx={{ p: 3, borderRadius: '24px', border: '1px solid white', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Code /> User Schema
                </Typography>
                {success && <Chip label="Saved" color="success" size="small" />}
              </Stack>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              <TextField
                multiline
                fullWidth
                rows={22}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                sx={{ 
                  flexGrow: 1,
                  '& .MuiOutlinedInput-root': { fontFamily: 'monospace', fontSize: '13px', borderRadius: '16px', bgcolor: colors.grey[50] } 
                }}
              />
              <Button 
                variant="contained" 
                fullWidth 
                onClick={onSave} 
                disabled={saving}
                sx={{ mt: 2, borderRadius: '12px', py: 1.5, fontWeight: 700, background: `linear-gradient(45deg, ${colors.indigo[600]}, ${colors.purple[600]})` }}
              >
                {saving ? "Saving..." : "Commit Changes"}
              </Button>
            </Paper>
          </Grid>

          {/* RIGHT: Post Preview & Explorer */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3, borderRadius: '24px', border: '1px solid white', height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'rgba(255,255,255,0.6)' }}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Article /> User Activity Feed
              </Typography>
              
              <TextField
                fullWidth
                size="small"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'white' } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />

              <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1, maxHeight: '600px' }}>
                {postsLoading ? (
                  <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={30} /></Stack>
                ) : filteredPosts.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>No matching posts found.</Typography>
                ) : (
                  <Stack spacing={2}>
                    {filteredPosts.map((post) => (
                      <Paper key={post._id} variant="outlined" sx={{ p: 2, borderRadius: '16px', position: 'relative', border: '1px solid #e0e0e0', transition: '0.2s', '&:hover': { borderColor: colors.indigo[300], boxShadow: '0 4px 12px rgba(0,0,0,0.05)' } }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                             <AccessTime sx={{ fontSize: 14, color: 'text.secondary' }} />
                             <Typography variant="caption" color="text.secondary">{new Date(post.createdAt).toLocaleDateString()}</Typography>
                          </Stack>
                          <IconButton size="small" color="error" onClick={() => handleDeletePost(post._id)}>
                            <DeleteForever fontSize="small" />
                          </IconButton>
                        </Stack>
                        
                        <Typography variant="body2" sx={{ color: colors.grey[800], lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {post.content || "No text content available."}
                        </Typography>
                        
                        {post.image && (
                          <Box sx={{ mt: 2, borderRadius: '8px', overflow: 'hidden', border: '1px solid #eee' }}>
                            <img src={post.image} alt="Post preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
                          </Box>
                        )}

                        <Box sx={{ mt: 2 }}>
                           <Chip label={`ID: ${post._id.slice(-6)}`} size="small" variant="outlined" sx={{ fontSize: '10px', height: '20px' }} />
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}