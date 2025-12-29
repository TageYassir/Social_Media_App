// File: app/uis/user-space/creation/[id]/edit/page.js
'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useParams, useRouter } from 'next/navigation';
import PostForm from '@/components/Creation/PostForm';

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

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  const postId = params?.id;

  // Get current user
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  // Fetch post data
  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/posts/${postId}`);
        
        if (response.ok) {
          const data = await response.json();
          setPost(data.post);
          
          // Check if current user owns the post
          if (currentUser && data.post && data.post.user) {
            const userId = currentUser._id || currentUser.id;
            const postUserId = data.post.user._id || data.post.user.id;
            if (String(userId) !== String(postUserId)) {
              setError('You are not authorized to edit this post');
              router.push(`/uis/user-space/creation/${postId}`);
            }
          }
        } else {
          const data = await response.json();
          setError(data.error || 'Post not found');
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        setError('Failed to load post');
      } finally {
        setLoading(false);
      }
    };
    
    if (postId && currentUser) {
      fetchPost();
    }
  }, [postId, currentUser, router]);

  const handleSubmit = async (formData) => {
    if (!currentUser || !postId) return;
    
    try {
      setSaving(true);
      setError('');

      const userId = currentUser._id || currentUser.id;
      
      const updateData = {
        ...formData,
        userId
      };

      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const result = await response.json();
        router.push(`/uis/user-space/creation/${postId}`);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update post');
      }
    } catch (error) {
      console.error('Error updating post:', error);
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/uis/user-space/creation/${postId}`);
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Loading post...
        </Typography>
      </Container>
    );
  }

  if (error && !post) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.push('/uis/user-space/creation')}
        >
          Back to Posts
        </Button>
      </Container>
    );
  }

  if (!post) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h6" gutterBottom>
          Post not found
        </Typography>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.push('/uis/user-space/creation')}
        >
          Back to Posts
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Button
            variant="outlined"
            onClick={() => router.push(`/uis/user-space/creation/${postId}`)}
            sx={{ minWidth: 'auto', p: 1 }}
          >
            ←
          </Button>
          <Typography variant="h4" fontWeight={600}>
            Edit Post
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Update your post content, images, or tags
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <PostForm
          initialData={{
            title: post.title,
            content: post.content,
            description: post.description || '',
            category: post.category,
            tags: post.tags || [],
            images: post.images || []
          }}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel={saving ? 'Saving...' : 'Save Changes'}
          loading={saving}
        />
      </Paper>
    </Container>
  );
}