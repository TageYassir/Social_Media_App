// File: components/Creation/PostCard.js
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardMedia, 
  Typography, 
  Box, 
  Avatar, 
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Favorite, 
  ChatBubbleOutline, 
  FavoriteBorder
} from '@mui/icons-material';
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

export default function PostCard({ post }) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes?.length || post.likeCount || 0);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Get current user on component mount
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    
    // Check if current user liked this post
    if (user && post.likes) {
      const userLiked = post.likes.some(likeId => 
        String(likeId) === String(user._id || user.id)
      );
      setLiked(userLiked);
    }
  }, [post.likes]);

  const handleClick = () => {
    if (post._id) {
      router.push(`/uis/user-space/creation/${post._id}`);
    }
  };

  const handleLike = async (e) => {
    e.stopPropagation(); // Prevent card click
    
    if (!currentUser) {
      router.push('/uis/user-space');
      return;
    }
    
    try {
      const userId = currentUser._id || currentUser.id;
      
      // Optimistic update
      const newLiked = !liked;
      const newLikeCount = newLiked ? likeCount + 1 : Math.max(0, likeCount - 1);
      
      setLiked(newLiked);
      setLikeCount(newLikeCount);
      
      const response = await fetch(`/api/posts/${post._id}/like`, {
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
        
        const errorData = await response.json();
        console.error('Like error:', errorData);
        alert(errorData.error || 'Failed to like post');
      } else {
        const data = await response.json();
        console.log('Like success:', data);
        // Sync with server response
        setLikeCount(data.likeCount || newLikeCount);
      }
      
    } catch (error) {
      console.error('Error liking post:', error);
      // Revert on network error
      setLiked(!liked);
      setLikeCount(liked ? likeCount - 1 : likeCount + 1);
      alert('Network error. Please try again.');
    }
  };

  const handleCommentClick = (e) => {
    e.stopPropagation();
    if (post._id) {
      router.push(`/uis/user-space/creation/${post._id}#comments`);
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
      day: 'numeric' 
    });
  };
  
  const user = post.user || {};
  const displayName = user.pseudo || [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';
  const postUserId = user._id || user.id;

  return (
    <Card 
      sx={{ 
        mb: 2, 
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3
        }
      }}
      onClick={handleClick}
    >
      {/* Post Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar 
          sx={{ 
            width: 40, 
            height: 40,
            bgcolor: user.gender === "Male" ? '#1976d2' : '#d81b60',
            cursor: 'pointer'
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (postUserId) {
              router.push(`/uis/user-space/profile/${postUserId}`);
            }
          }}
        >
          {displayName.charAt(0).toUpperCase()}
        </Avatar>
        <Box>
          <Typography 
            variant="subtitle1" 
            fontWeight={600}
            sx={{ 
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' }
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (postUserId) {
                router.push(`/uis/user-space/profile/${postUserId}`);
              }
            }}
          >
            {displayName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDate(post.createdAt || post.dateTime)}
            {post.category && ` • ${post.category}`}
          </Typography>
        </Box>
      </Box>
      
      {/* Post Content */}
      <CardContent sx={{ pt: 0, pb: 1 }}>
        <Typography variant="h6" gutterBottom>
          {post.title || 'Untitled'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {post.content && post.content.length > 200 
            ? `${post.content.substring(0, 200)}...` 
            : post.content || 'No content'}
        </Typography>
        
        {/* Images */}
        {post.images && post.images.length > 0 && (
          <Box sx={{ 
            mb: 2, 
            borderRadius: 1, 
            overflow: 'hidden',
            maxHeight: 300
          }}>
            <CardMedia
              component="img"
              height="auto"
              image={post.images[0]}
              alt={post.title}
              sx={{ 
                objectFit: 'cover',
                width: '100%',
                maxHeight: 300
              }}
            />
          </Box>
        )}
        
        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
            {post.tags.slice(0, 3).map((tag, index) => (
              <Typography 
                key={index}
                variant="caption" 
                sx={{ 
                  bgcolor: 'primary.light', 
                  color: 'primary.contrastText',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  cursor: 'default'
                }}
              >
                #{tag}
              </Typography>
            ))}
            {post.tags.length > 3 && (
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'text.secondary',
                  px: 1,
                  py: 0.5,
                }}
              >
                +{post.tags.length - 3} more
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
      
      {/* Post Footer (Stats & Actions) - UPDATED: Removed shares/saves/views */}
      <Box sx={{ 
        px: 2, 
        py: 1, 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: 1,
        borderColor: 'divider'
      }}>
        {/* Left side: Stats */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Tooltip title={liked ? "Unlike" : "Like"}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <IconButton 
                size="small" 
                onClick={handleLike}
                sx={{ 
                  color: liked ? 'error.main' : 'inherit',
                  '&:hover': { 
                    backgroundColor: liked ? 'rgba(244, 67, 54, 0.04)' : 'rgba(0, 0, 0, 0.04)'
                  }
                }}
              >
                {liked ? <Favorite fontSize="small" /> : <FavoriteBorder fontSize="small" />}
              </IconButton>
              <Typography variant="caption" fontWeight={500}>
                {likeCount}
              </Typography>
            </Box>
          </Tooltip>
          
          <Tooltip title="Comments">
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.5,
                cursor: 'pointer'
              }}
              onClick={handleCommentClick}
            >
              <IconButton size="small">
                <ChatBubbleOutline fontSize="small" />
              </IconButton>
              <Typography variant="caption" fontWeight={500}>
                {post.commentsCount || 0}
              </Typography>
            </Box>
          </Tooltip>
        </Box>
        
        {/* Right side: Action buttons - REMOVED: Share and Save buttons */}
      </Box>
    </Card>
  );
}