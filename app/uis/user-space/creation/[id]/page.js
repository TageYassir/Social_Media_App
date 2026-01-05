// File: app/uis/user-space/creation/[id]/page.js
'use client';

import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Avatar,
  IconButton,
  Button,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Tooltip
} from '@mui/material';
import { 
  Favorite, 
  FavoriteBorder,
  ChatBubbleOutline, 
  ArrowBack,
  Edit,
  Delete
} from '@mui/icons-material';
import { useParams, useRouter } from 'next/navigation';
import CommentForm from '@/components/Creation/CommentForm';
import CommentItem from '@/components/Creation/CommentItem';

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

export default function SinglePostPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [processingLike, setProcessingLike] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsPage, setCommentsPage] = useState(1);

  const postId = params?.id;

  // Mask URL immediately (before paint) to avoid showing raw post id
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const maskedPath = '/uis/user-space/creation';
      if (window.location.pathname !== maskedPath) {
        window.history.replaceState(null, '', maskedPath);
      }
    } catch (e) {
      // ignore
    }
  }, []);

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
          
          // ensure URL is masked after post load as well
          try {
            if (typeof window !== 'undefined') {
              const maskedPath = '/uis/user-space/creation';
              if (window.location.pathname !== maskedPath) {
                window.history.replaceState(null, '', maskedPath);
              }
            }
          } catch (e) { /* ignore */ }
           
           // Update like states
           if (data.post) {
             setLikeCount(data.post.likes?.length || 0);
             
             // Check if current user liked this post
             if (currentUser && data.post.likes) {
               const userLiked = data.post.likes.some(likeId => 
                 String(likeId) === String(currentUser._id || currentUser.id)
               );
               setLiked(userLiked);
             }
           }
           
           // Check if current user is the owner
           if (currentUser && data.post && data.post.user) {
             const userId = currentUser._id || currentUser.id;
             const postUserId = data.post.user._id || data.post.user.id;
             setIsOwner(String(userId) === String(postUserId));
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
    
    if (postId) {
      fetchPost();
    }
  }, [postId, currentUser]);

  // Load comments
  useEffect(() => {
    const loadComments = async () => {
      if (!postId) return;
      
      try {
        setLoadingComments(true);
        const response = await fetch(`/api/posts/${postId}/comments?page=${commentsPage}&limit=10`);
        
        if (response.ok) {
          const data = await response.json();
          if (commentsPage === 1) {
            setComments(data.comments || []);
          } else {
            setComments(prev => [...prev, ...(data.comments || [])]);
          }
        }
      } catch (error) {
        console.error('Error loading comments:', error);
      } finally {
        setLoadingComments(false);
      }
    };
    
    if (postId) {
      loadComments();
    }
  }, [postId, commentsPage]);

  const handleLike = async () => {
    if (!currentUser || !post || processingLike) return;
    
    try {
      setProcessingLike(true);
      
      // Optimistic update
      const newLiked = !liked;
      const newLikeCount = newLiked ? likeCount + 1 : Math.max(0, likeCount - 1);
      
      setLiked(newLiked);
      setLikeCount(newLikeCount);
      
      const userId = currentUser._id || currentUser.id;
      const response = await fetch(`/api/posts/${postId}/like`, {
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
        // Update with server data
        setLikeCount(data.likeCount || newLikeCount);
        if (data.post) {
          setPost(data.post);
        }
      }
    } catch (error) {
      console.error('Error liking post:', error);
      // Revert on network error
      setLiked(!liked);
      setLikeCount(liked ? likeCount - 1 : likeCount + 1);
      alert('Network error. Please try again.');
    } finally {
      setProcessingLike(false);
    }
  };

  // EDIT POST FUNCTION - UPDATED
  const handleEdit = () => {
    router.push(`/uis/user-space/creation/${postId}/edit`);
  };

  const handleDelete = async () => {
    if (!currentUser || !isOwner) return;
    
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser._id || currentUser.id
        }),
      });
      
      if (response.ok) {
        router.push('/uis/user-space/creation');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      setError('Failed to delete post');
    }
  };

  const handleNewComment = (newComment) => {
    setComments(prev => [newComment, ...prev]);
    // Update post comments count
    if (post) {
      setPost({
        ...post,
        commentsCount: (post.commentsCount || 0) + 1
      });
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Loading post...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
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
      <Container maxWidth="lg" sx={{ py: 4 }}>
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

  const user = post.user || {};
  const displayName = user.pseudo || [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';
  const postUserId = user._id || user.id;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => router.push('/uis/user-space/creation')}
        sx={{ mb: 3 }}
      >
        Back to Posts
      </Button>

      <Grid container spacing={4}>
        {/* Left Column - Post Content */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 4 }}>
            {/* Post Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar 
                  sx={{ 
                    width: 56, 
                    height: 56,
                    bgcolor: user.gender === "Male" ? '#1976d2' : '#d81b60',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    if (postUserId) {
                      router.push(`/uis/user-space/profile/${postUserId}`);
                    }
                  }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography 
                    variant="h6" 
                    fontWeight={600}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { textDecoration: 'underline' }
                    }}
                    onClick={() => {
                      if (postUserId) {
                        router.push(`/uis/user-space/profile/${postUserId}`);
                      }
                    }}
                  >
                    {displayName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(post.createdAt)}
                  </Typography>
                </Box>
              </Box>
              
              {/* Owner Actions - UPDATED: Edit button now works */}
              {isOwner && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="Edit Post">
                    <IconButton onClick={handleEdit}>
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Post">
                    <IconButton onClick={handleDelete}>
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Box>

            {/* Category */}
            <Chip 
              label={post.category} 
              sx={{ 
                mb: 3,
                textTransform: 'capitalize',
                fontWeight: 600
              }}
            />

            {/* Title */}
            <Typography variant="h4" gutterBottom fontWeight={700}>
              {post.title}
            </Typography>

            {/* Description */}
            {post.description && (
              <Typography 
                variant="h6" 
                color="text.secondary" 
                gutterBottom
                sx={{ fontStyle: 'italic' }}
              >
                {post.description}
              </Typography>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Content */}
            <Typography 
              variant="body1" 
              sx={{ 
                whiteSpace: 'pre-wrap',
                lineHeight: 1.8,
                fontSize: '1.1rem'
              }}
            >
              {post.content}
            </Typography>

            {/* Images */}
            {post.images && post.images.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Grid container spacing={2}>
                  {post.images.map((image, index) => (
                    <Grid item xs={12} md={6} key={index}>
                      <Box
                        component="img"
                        src={image}
                        alt={`Post image ${index + 1}`}
                        sx={{
                          width: '100%',
                          height: 'auto',
                          maxHeight: 400,
                          objectFit: 'contain',
                          borderRadius: 2,
                          boxShadow: 2
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <Box sx={{ mt: 4, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="body2" sx={{ mr: 1, fontWeight: 600 }}>
                  Tags:
                </Typography>
                {post.tags.map((tag, index) => (
                  <Chip
                    key={index}
                    label={`#${tag}`}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            )}

            {/* Stats & Actions - UPDATED: Removed shares/saves */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 4,
              pt: 3,
              borderTop: 1,
              borderColor: 'divider'
            }}>
              <Box sx={{ display: 'flex', gap: 3 }}>
                <Tooltip title={liked ? "Unlike" : "Like"}>
                  <Button
                    startIcon={liked ? <Favorite /> : <FavoriteBorder />}
                    onClick={handleLike}
                    disabled={processingLike || !currentUser}
                    sx={{ 
                      color: liked ? 'error.main' : 'inherit',
                      '&:hover': { 
                        backgroundColor: liked ? 'rgba(244, 67, 54, 0.04)' : 'rgba(0, 0, 0, 0.04)'
                      }
                    }}
                  >
                    {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
                  </Button>
                </Tooltip>
                
                <Tooltip title="Comments">
                  <Button startIcon={<ChatBubbleOutline />}>
                    {post.commentsCount || 0} Comments
                  </Button>
                </Tooltip>
              </Box>
            </Box>
          </Paper>

          {/* Comments Section - UPDATED with real comments */}
          <Paper sx={{ mt: 3, p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Comments ({post.commentsCount || 0})
            </Typography>
            
            {/* Comment Form - only show if user is logged in */}
            {currentUser && (
              <CommentForm 
                postId={postId} 
                currentUser={currentUser} 
                onCommentAdded={handleNewComment}
              />
            )}
            
            {/* Comments List */}
            {loadingComments ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Loading comments...
                </Typography>
              </Box>
            ) : comments.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No comments yet. Be the first to comment!
                </Typography>
              </Box>
            ) : (
              <Box>
                {comments.map((comment) => (
                  <CommentItem key={comment._id} comment={comment} />
                ))}
                
                {/* Load More Button if there are more comments */}
                {post.commentsCount > comments.length && (
                  <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Button 
                      variant="outlined" 
                      onClick={() => setCommentsPage(prev => prev + 1)}
                      disabled={loadingComments}
                    >
                      Load More Comments
                    </Button>
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right Column - Sidebar - UPDATED: Removed View Profile button and views */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Post Stats
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Likes</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {likeCount}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Comments</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {post.commentsCount || 0}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Author Info - REMOVED: View Profile button */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              About the Author
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar 
                sx={{ 
                  width: 48, 
                  height: 48,
                  bgcolor: user.gender === "Male" ? '#1976d2' : '#d81b60',
                  cursor: 'pointer'
                }}
                onClick={() => {
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
                  onClick={() => {
                    if (postUserId) {
                      router.push(`/uis/user-space/profile/${postUserId}`);
                    }
                  }}
                >
                  {displayName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user.country || 'Unknown location'}
                </Typography>
              </Box>
            </Box>
            {/* REMOVED: View Profile button */}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}