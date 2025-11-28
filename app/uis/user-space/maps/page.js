'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Dynamically import react-leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

// Fix Leaflet default icon paths for Next.js/public
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
  iconUrl: '/leaflet/images/marker-icon.png',
  shadowUrl: '/leaflet/images/marker-shadow.png',
});

export default function MapsPage() {
  const [position, setPosition] = useState(null); // { lat, lng }
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Requesting location permission...');

  // Use same pattern as chat to find current user:
  // 1. call server endpoint /api/users?operation=get-current
  // 2. fallback to localStorage 'user' JSON (same as chat)
  async function resolveCurrentUserId() {
    try {
      const res = await fetch('/api/users?operation=get-current');
      if (res.ok) {
        const payload = await res.json();
        const uid = payload?.user?._id || payload?.user?.id || payload?.current?.id || payload?.id || null;
        if (uid) return uid;
      }
    } catch (err) {
      // ignore and try fallback
    }

    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.id) return parsed.id;
      }
    } catch (err) {
      // ignore
    }

    return null;
  }

  async function saveLocationForUser(userId, lat, lng) {
    if (!userId) {
      setStatusMessage('Location available locally (not saved to server - no user id found).');
      return;
    }

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        console.warn('Failed to save location', body);
        setStatusMessage('Location shown locally; failed to save to server.');
        return;
      }

      setStatusMessage('Location saved to server.');
    } catch (err) {
      console.error('saveLocationForUser error', err);
      setStatusMessage('Location shown locally; error saving to server.');
    }
  }

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setStatusMessage('Geolocation not supported by your browser.');
      setLoading(false);
      return;
    }

    setStatusMessage('Requesting permission to access your location...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition({ lat, lng });
        setLoading(false);
        setStatusMessage('Location obtained.');

        const uid = await resolveCurrentUserId();
        await saveLocationForUser(uid, lat, lng);
      },
      (err) => {
        console.warn('geolocation error', err);
        if (err.code === err.PERMISSION_DENIED) {
          setStatusMessage('Permission denied. Allow location to display the map marker.');
        } else {
          setStatusMessage('Unable to retrieve your location.');
        }
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        <h3>Mini-Map</h3>
        <p>{statusMessage}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 8 }}>
      <h3>Mini-Map</h3>
      <p>{statusMessage}</p>

      {!position ? (
        <div>No location available for this user.</div>
      ) : (
        <div style={{ height: '70vh', width: '100%', border: '1px solid #ddd' }}>
          <MapContainer center={[position.lat, position.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[position.lat, position.lng]}>
              <Popup>Your current location</Popup>
            </Marker>
          </MapContainer>
        </div>
      )}
    </div>
  );
}