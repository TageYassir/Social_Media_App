'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Box, 
  Typography, 
  Paper, 
  Container, 
  CircularProgress, 
  Chip, 
  IconButton,
  Alert,
  Skeleton,
  Avatar
} from '@mui/material';
import { 
  MyLocation as LocationIcon, 
  Map as MapIcon, 
  Refresh as RefreshIcon 
} from '@mui/icons-material';

// Dynamically import react-leaflet components
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

// Fix Leaflet default icon paths
if (typeof window !== 'undefined') {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

export default function MapsPage() {
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Initializing Map...');
  const [isSuccess, setIsSuccess] = useState(false);

  async function resolveCurrentUserId() {
    try {
      const res = await fetch('/api/users?operation=get-current');
      if (res.ok) {
        const payload = await res.json();
        return payload?.user?._id || payload?.user?.id || payload?.current?.id || payload?.id || null;
      }
    } catch (err) { /* ignore */ }
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed?.id || parsed?._id;
      }
    } catch (err) { /* ignore */ }
    return null;
  }

  async function saveLocationForUser(userId, lat, lng) {
    if (!userId) {
      setStatusMessage('Local view only (Guest)');
      return;
    }
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });
      if (res.ok) {
        setStatusMessage('Location synced with profile');
        setIsSuccess(true);
      } else {
        setStatusMessage('Location visible locally only');
      }
    } catch (err) {
      setStatusMessage('Sync failed');
    }
  }

  const getGeoLocation = () => {
    setLoading(true);
    setStatusMessage('Requesting GPS access...');
    
    if (!('geolocation' in navigator)) {
      setStatusMessage('Geolocation not supported');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition({ lat, lng });
        setLoading(false);
        const uid = await resolveCurrentUserId();
        await saveLocationForUser(uid, lat, lng);
      },
      (err) => {
        setStatusMessage(err.code === 1 ? 'Permission Denied' : 'Signal Lost');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    getGeoLocation();
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8f9fa', pb: 4 }}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        
        {/* HEADER */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#1976d2', boxShadow: '0 4px 10px rgba(25,118,210,0.3)' }}>
              <MapIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#1a1a1a' }}>
                Your Location
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Real-time positioning & discovery
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={getGeoLocation} size="small" sx={{ bgcolor: 'white', boxShadow: 1 }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* STATUS BAR */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
          <Chip 
            icon={<LocationIcon sx={{ fontSize: '1rem !important' }} />} 
            label={statusMessage}
            variant="outlined"
            color={isSuccess ? "success" : "default"}
            sx={{ 
              fontWeight: 600, 
              bgcolor: 'white',
              px: 1,
              borderRadius: '10px',
              border: '1px solid #e0e0e0'
            }}
          />
        </Box>

        {/* MAP CONTAINER */}
        <Paper
          elevation={0}
          sx={{
            height: '65vh',
            width: '100%',
            borderRadius: 5,
            overflow: 'hidden',
            border: '1px solid #e0e0e0',
            position: 'relative',
            boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
          }}
        >
          {loading ? (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, bgcolor: '#fff' }}>
              <CircularProgress thickness={5} size={40} />
              <Typography color="text.secondary" variant="body2">Finding your coordinates...</Typography>
            </Box>
          ) : !position ? (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, textAlign: 'center' }}>
              <Alert severity="warning" sx={{ borderRadius: 3 }}>
                Location Access Required
              </Alert>
              <Typography sx={{ mt: 2, color: 'text.secondary', maxWidth: 300 }}>
                Please enable location permissions in your browser settings to view your position on the map.
              </Typography>
            </Box>
          ) : (
            <MapContainer 
              center={[position.lat, position.lng]} 
              zoom={14} 
              style={{ height: '100%', width: '100%' }}
              zoomControl={false} // Clean up UI
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[position.lat, position.lng]}>
                <Popup sx={{ borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>You are here</Typography>
                </Popup>
              </Marker>
            </MapContainer>
          )}
        </Paper>

        <Typography variant="caption" sx={{ display: 'block', mt: 2, textAlign: 'center', color: 'text.secondary' }}>
          Your location is shared only with registered users on this platform.
        </Typography>
      </Container>
    </Box>
  );
}