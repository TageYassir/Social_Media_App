// File: app/uis/user-space/creation/new/page.js
'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Alert,
  CircularProgress,
  Button
} from '@mui/material';
import { useRouter } from 'next/navigation';
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

export default function NewPostPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Get current user
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      // Redirect to login if no user
      router.push('/uis/user-space');
      return;
    }
    setCurrentUser(user);
  }, [router]);

  const handleSubmit = async (postData) => {
    if (!currentUser) {
      setError('Please log in to create a post');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Get userId from user object
      const userId = currentUser._id || currentUser.id;
      
      if (!userId) {
        setError('User ID not found');
        return;
      }

      // Prepare the post data
      const postPayload = {
        ...postData,
        userId: userId
      };

      console.log('Creating post with data:', postPayload);

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postPayload),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('Post creation result:', result);

      if (result.success && result.post) {
        // Redirect to the new post
        router.push(`/uis/user-space/creation/${result.post._id}`);
      } else {
        setError(result.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setError(error.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/uis/user-space/creation');
  };

  if (!currentUser) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Loading...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Button
            variant="outlined"
            onClick={() => router.push('/uis/user-space/creation')}
            sx={{ minWidth: 'auto', p: 1 }}
          >
            ←
          </Button>
          <Typography variant="h4" fontWeight={600}>
            Create New Post
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Share your thoughts, projects, or announcements with the community
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <PostForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel={loading ? 'Creating...' : 'Create Post'}
          loading={loading}
        />
      </Paper>
    </Container>
  );
}