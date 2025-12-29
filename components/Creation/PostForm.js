// File: components/Creation/PostForm.js
import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Typography
} from '@mui/material';
import { Add, Close, CloudUpload } from '@mui/icons-material';

export default function PostForm({ 
  initialData = {}, 
  onSubmit, 
  onCancel, 
  submitLabel = "Create Post",
  loading = false 
}) {
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    content: initialData.content || '',
    description: initialData.description || '',
    category: initialData.category || 'thought',
    tags: initialData.tags || [],
    tagInput: ''
  });
  
  const [images, setImages] = useState(initialData.images || []);
  const [imagePreviews, setImagePreviews] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTag = () => {
    if (formData.tagInput.trim() && !formData.tags.includes(formData.tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, prev.tagInput.trim()],
        tagInput: ''
      }));
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newPreviews = [...imagePreviews];
    
    files.forEach(file => {
      // For now, create base64 previews
      // In production, you'd upload to cloud storage
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push({
          url: reader.result,
          name: file.name,
          file: file
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const postData = {
      ...formData,
      // Convert base64 images to array of URLs (in real app, these would be uploaded URLs)
      images: imagePreviews.map(preview => preview.url),
      // Remove temporary fields
      tagInput: undefined
    };
    delete postData.tagInput;
    onSubmit(postData);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && formData.tagInput.trim()) {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={3}>
        {/* Title */}
        <TextField
          name="title"
          label="Title *"
          value={formData.title}
          onChange={handleChange}
          required
          fullWidth
          helperText="Give your post a catchy title"
        />
        
        {/* Content */}
        <TextField
          name="content"
          label="Content *"
          value={formData.content}
          onChange={handleChange}
          required
          fullWidth
          multiline
          rows={4}
          helperText="What would you like to share?"
        />
        
        {/* Description (Optional) */}
        <TextField
          name="description"
          label="Description (Optional)"
          value={formData.description}
          onChange={handleChange}
          fullWidth
          multiline
          rows={2}
          helperText="Brief summary of your post"
        />
        
        {/* Category */}
        <FormControl fullWidth>
          <InputLabel>Category</InputLabel>
          <Select
            name="category"
            value={formData.category}
            onChange={handleChange}
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
            name="tagInput"
            label="Tags"
            value={formData.tagInput}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            fullWidth
            helperText="Press Enter to add tags"
            InputProps={{
              endAdornment: (
                <IconButton onClick={handleAddTag} edge="end">
                  <Add />
                </IconButton>
              )
            }}
          />
          <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {formData.tags.map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                onDelete={() => handleRemoveTag(tag)}
                size="small"
              />
            ))}
          </Box>
        </Box>
        
        {/* Image Upload */}
        <Box>
          <input
            accept="image/*"
            style={{ display: 'none' }}
            id="image-upload"
            type="file"
            multiple
            onChange={handleImageUpload}
          />
          <label htmlFor="image-upload">
            <Button
              component="span"
              variant="outlined"
              startIcon={<CloudUpload />}
              fullWidth
            >
              Upload Images
            </Button>
          </label>
          
          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                {imagePreviews.length} image(s) selected
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {imagePreviews.map((preview, index) => (
                  <Box key={index} sx={{ position: 'relative' }}>
                    <img
                      src={preview.url}
                      alt={`Preview ${index + 1}`}
                      style={{ 
                        width: 100, 
                        height: 100, 
                        objectFit: 'cover',
                        borderRadius: 8 
                      }}
                    />
                    <IconButton
                      size="small"
                      sx={{ 
                        position: 'absolute', 
                        top: -8, 
                        right: -8,
                        bgcolor: 'background.paper'
                      }}
                      onClick={() => handleRemoveImage(index)}
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
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading || !formData.title || !formData.content}
          >
            {loading ? 'Processing...' : submitLabel}
          </Button>
        </Box>
      </Stack>
    </form>
  );
}