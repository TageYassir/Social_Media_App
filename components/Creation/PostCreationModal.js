// File: components/Creation/PostCreationModal.js
import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  CircularProgress,
  Alert
} from '@mui/material';
import { Close, CloudUpload, Add, Tag } from '@mui/icons-material';

export default function PostCreationModal({ onClose, currentUser }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('thought');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [imagePreviews, setImagePreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const displayName = currentUser?.pseudo || [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || 'User';

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const newPreviews = [...imagePreviews];
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push({
          url: reader.result,
          name: file.name
        });
        setImagePreviews([...newPreviews]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index) => {
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImagePreviews(newPreviews);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }

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

      // Prepare the post data with base64 images
      const postPayload = {
        title: title.trim(),
        content: content.trim(),
        description: description.trim(),
        category,
        tags,
        images: imagePreviews.map(preview => preview.url),
        userId
      };

      console.log('Creating post with data:', postPayload);

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postPayload),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('Post created successfully:', result);
        // Close modal and refresh page or redirect
        window.location.href = `/uis/user-space/creation/${result.post._id}`;
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1300,
        p: 2
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 2,
          width: '100%',
          maxWidth: 800,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: 24
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <Box sx={{ 
          p: 2, 
          borderBottom: 1, 
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6" fontWeight={600}>
            Create Post
          </Typography>
          <IconButton onClick={onClose} size="small" disabled={loading}>
            <Close />
          </IconButton>
        </Box>

        {/* User Info */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: currentUser?.gender === "Male" ? '#1976d2' : '#d81b60'
            }}
          >
            {displayName.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="subtitle1" fontWeight={600}>
            {displayName}
          </Typography>
        </Box>

        {/* Form */}
        <Box sx={{ p: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Title */}
            <TextField
              label="Title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's your post about?"
              required
              fullWidth
              disabled={loading}
            />

            {/* Content */}
            <TextField
              label="Content *"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts..."
              required
              multiline
              rows={4}
              fullWidth
              disabled={loading}
            />

            {/* Description */}
            <TextField
              label="Description (Optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              multiline
              rows={2}
              fullWidth
              disabled={loading}
            />

            {/* Category */}
            <FormControl fullWidth disabled={loading}>
              <InputLabel>Category</InputLabel>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                label="Category"
              >
                <MenuItem value="thought">Thought</MenuItem>
                <MenuItem value="art">Art</MenuItem>
                <MenuItem value="project">Project</MenuItem>
                <MenuItem value="event">Event</MenuItem>
                <MenuItem value="announcement">Announcement</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            {/* Tags */}
            <Box>
              <TextField
                label="Add Tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Press Enter to add tags"
                fullWidth
                disabled={loading}
                InputProps={{
                  startAdornment: <Tag sx={{ mr: 1, color: 'action.active' }} />,
                  endAdornment: (
                    <IconButton onClick={handleAddTag} edge="end" disabled={loading}>
                      <Add />
                    </IconButton>
                  )
                }}
              />
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {tags.map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    size="small"
                    disabled={loading}
                  />
                ))}
              </Box>
            </Box>

            {/* Image Upload */}
            <Box>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                ref={fileInputRef}
                style={{ display: 'none' }}
                disabled={loading}
              />
              <Button
                startIcon={<CloudUpload />}
                variant="outlined"
                onClick={() => fileInputRef.current?.click()}
                fullWidth
                disabled={loading}
              >
                Upload Images
              </Button>
              
              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Selected Images ({imagePreviews.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {imagePreviews.map((preview, index) => (
                      <Box key={index} sx={{ position: 'relative' }}>
                        <Box
                          component="img"
                          src={preview.url}
                          alt={`Preview ${index + 1}`}
                          sx={{
                            width: 100,
                            height: 100,
                            objectFit: 'cover',
                            borderRadius: 1,
                            border: 1,
                            borderColor: 'divider'
                          }}
                        />
                        <IconButton
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            bgcolor: 'background.paper',
                            border: 1,
                            borderColor: 'divider'
                          }}
                          onClick={() => handleRemoveImage(index)}
                          disabled={loading}
                        >
                          <Close fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>

            {/* Action Buttons */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: 2,
              pt: 2,
              borderTop: 1,
              borderColor: 'divider'
            }}>
              <Button onClick={onClose} variant="outlined" disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                variant="contained"
                disabled={loading || !title.trim() || !content.trim()}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {loading ? 'Creating...' : 'Create Post'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}