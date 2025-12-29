// File: app/uis/user-space/creation/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  Grid,
  Card,
  CardContent,
  CardMedia,
  Avatar,
  CircularProgress
} from '@mui/material';
import { Add, Favorite, ChatBubbleOutline } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

// Helper to get user from localStorage
const getCurrentUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error parsing user from localStorage:', error);
    return null;
  }
};

export default function CreationPage() {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Get current user
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  // Fetch CURRENT USER'S posts only
  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!currentUser) {
        setPosts([]);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const userId = currentUser._id || currentUser.id;
        console.log('Fetching posts for user:', userId);
        
        const response = await fetch(`/api/posts/user/${userId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('User posts data received:', data);
        setPosts(data.posts || []);
      } catch (error) {
        console.error('Failed to fetch user posts:', error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserPosts();
  }, [currentUser]);

  const handleCreatePost = () => {
    if (!currentUser) {
      router.push('/uis/user-space');
      return;
    }
    router.push('/uis/user-space/creation/new');
  };

  const handleViewPost = (postId) => {
    router.push(`/uis/user-space/creation/${postId}`);
  };

  const handleEditPost = (postId, e) => {
    e.stopPropagation();
    router.push(`/uis/user-space/creation/${postId}/edit`);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 4 
      }}>
        <Typography variant="h4" fontWeight={600}>
          Your Posts
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreatePost}
          disabled={!currentUser}
        >
          Create Post
        </Button>
      </Box>

      {/* User's Posts Grid */}
      {!currentUser ? (
        <Box sx={{ 
          textAlign: 'center', 
          py: 8,
          border: 1,
          borderColor: 'divider',
          borderRadius: 2
        }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Please log in to view your posts
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Sign in to see and create posts
          </Typography>
          <Button
            variant="contained"
            onClick={() => router.push('/uis')}
          >
            Go to Login
          </Button>
        </Box>
      ) : loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Loading your posts...
          </Typography>
        </Box>
      ) : posts.length === 0 ? (
        <Box sx={{ 
          textAlign: 'center', 
          py: 8,
          border: 1,
          borderColor: 'divider',
          borderRadius: 2
        }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No posts yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first post to get started!
          </Typography>
          <Button
            variant="contained"
            onClick={handleCreatePost}
          >
            Create Your First Post
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {posts.map((post) => (
            <Grid item xs={12} md={6} lg={4} key={post._id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)'
                  }
                }}
                onClick={() => handleViewPost(post._id)}
              >
                {/* Post Image */}
                {post.images && post.images.length > 0 && (
                  <CardMedia
                    component="img"
                    height="200"
                    image={post.images[0]}
                    alt={post.title}
                    sx={{ objectFit: 'cover' }}
                  />
                )}
                
                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Category */}
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: 'primary.main',
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}
                  >
                    {post.category || 'post'}
                  </Typography>
                  
                  {/* Title */}
                  <Typography variant="h6" sx={{ mt: 1, mb: 1 }} noWrap>
                    {post.title || 'Untitled Post'}
                  </Typography>
                  
                  {/* Content Preview */}
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ 
                      mb: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {post.content || ''}
                  </Typography>
                  
                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                      {post.tags.slice(0, 3).map((tag, index) => (
                        <Typography 
                          key={index}
                          variant="caption" 
                          sx={{ 
                            bgcolor: 'action.selected',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1
                          }}
                        >
                          #{tag}
                        </Typography>
                      ))}
                    </Box>
                  )}
                  
                  {/* User Info & Stats */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mt: 'auto'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar 
                        sx={{ 
                          width: 32, 
                          height: 32,
                          bgcolor: post.user?.gender === "Male" ? '#1976d2' : '#d81b60'
                        }}
                      >
                        {post.user?.pseudo?.charAt(0) || 'U'}
                      </Avatar>
                      <Typography variant="caption">
                        {post.user?.pseudo || 'User'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Favorite fontSize="small" sx={{ color: 'error.main' }} />
                        <Typography variant="caption">
                          {post.likes?.length || 0}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ChatBubbleOutline fontSize="small" />
                        <Typography variant="caption">
                          {post.commentsCount || 0}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}