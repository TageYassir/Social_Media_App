// File: components/Creation/CommentForm.js
import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Avatar,
  CircularProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

export default function CommentForm({ postId, currentUser, onCommentAdded }) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!comment.trim() || !currentUser) return;
    
    try {
      setLoading(true);
      
      const userId = currentUser._id || currentUser.id;
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: comment.trim(),
          userId
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setComment('');
        if (onCommentAdded) {
          onCommentAdded(data.comment);
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const displayName = currentUser?.pseudo || [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || 'User';

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Avatar 
          sx={{ 
            width: 40, 
            height: 40,
            bgcolor: currentUser?.gender === "Male" ? '#1976d2' : '#d81b60'
          }}
        >
          {displayName.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <TextField
            fullWidth
            multiline
            rows={2}
            placeholder="Write a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={loading}
            sx={{ mb: 1 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              endIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
              disabled={!comment.trim() || loading}
              size="small"
            >
              Post Comment
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}