// File: components/Creation/CommentItem.js
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Avatar, 
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Favorite, 
  FavoriteBorder,
  MoreVert
} from '@mui/icons-material';

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

export default function CommentItem({ comment }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likes?.length || 0);
  const [processingLike, setProcessingLike] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    
    // Check if current user liked this comment
    if (user && comment.likes) {
      const userLiked = comment.likes.some(likeId => 
        String(likeId) === String(user._id || user.id)
      );
      setLiked(userLiked);
    }
  }, [comment.likes]);

  const handleLike = async () => {
    if (!currentUser || processingLike) return;
    
    try {
      setProcessingLike(true);
      
      // Optimistic update
      const newLiked = !liked;
      const newLikeCount = newLiked ? likeCount + 1 : Math.max(0, likeCount - 1);
      
      setLiked(newLiked);
      setLikeCount(newLikeCount);
      
      const userId = currentUser._id || currentUser.id;
      const response = await fetch(`/api/posts/comments/${comment._id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });
      
      if (!response.ok) {
        // Revert on error
        setLiked(!newLiked);
        setLikeCount(newLiked ? likeCount - 1 : likeCount + 1);
      } else {
        const data = await response.json();
        setLikeCount(data.likeCount || newLikeCount);
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      // Revert on network error
      setLiked(!liked);
      setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    } finally {
      setProcessingLike(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: diffDays > 365 ? 'numeric' : undefined
    });
  };
  
  const user = comment.user || {};
  const displayName = user.pseudo || [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';

  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
      <Avatar 
        sx={{ 
          width: 40, 
          height: 40,
          bgcolor: user.gender === "Male" ? '#1976d2' : '#d81b60'
        }}
      >
        {displayName.charAt(0).toUpperCase()}
      </Avatar>
      
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            {displayName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            • {formatDate(comment.createdAt)}
          </Typography>
        </Box>
        
        <Typography variant="body2" sx={{ mb: 1 }}>
          {comment.content}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tooltip title={liked ? "Unlike" : "Like"}>
            <IconButton 
              size="small" 
              onClick={handleLike}
              disabled={processingLike}
              sx={{ 
                color: liked ? 'error.main' : 'inherit',
                '&:hover': { 
                  backgroundColor: liked ? 'rgba(244, 67, 54, 0.04)' : 'rgba(0, 0, 0, 0.04)'
                }
              }}
            >
              {liked ? <Favorite fontSize="small" /> : <FavoriteBorder fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Typography variant="caption" color="text.secondary">
            {likeCount} {likeCount === 1 ? 'like' : 'likes'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}