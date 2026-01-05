'use client'

import React, { useEffect, useState, useRef, useCallback, useLayoutEffect } from "react"
import { useSearchParams, useParams } from "next/navigation"
import { Box, Typography, Container, TextField, Button, List, ListItem, IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material"
import ImageIcon from "@mui/icons-material/Image"
import MicIcon from "@mui/icons-material/Mic"
import StopIcon from "@mui/icons-material/Stop"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"
import PauseIcon from "@mui/icons-material/Pause"
import VolumeUpIcon from "@mui/icons-material/VolumeUp"
import MoreVertIcon from "@mui/icons-material/MoreVert"
import DownloadIcon from "@mui/icons-material/Download"

/**
 * ChatClient
 *
 * Same as your original file but with a more reliable visibility-based mark-as-seen implementation.
 * Only the mark-as-seen behavior was changed; UI and other logic preserved.
 */

export default function ChatClient({ receiver: receiverFromServer = null, receiverId: receiverProp = null }) {
  const searchParams = useSearchParams()
  const receiverFromQuery = searchParams ? searchParams.get("receiver") : null
  const params = useParams ? useParams() : {}
  const routeId = params?.id ?? null
  const receiverId = receiverFromServer ? (receiverFromServer._id || receiverFromServer.id || null) : (receiverProp || receiverFromQuery || routeId || null)

  const [currentUserId, setCurrentUserId] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [receiver, setReceiver] = useState(receiverFromServer || null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [loadingMessages, setLoadingMessages] = useState(false)

  // recording state
  const [recording, setRecording] = useState(false)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const activeStreamRef = useRef(null)

  // recording timer
  const [recordElapsedMs, setRecordElapsedMs] = useState(0)
  const recordIntervalRef = useRef(null)
  const recordStartRef = useRef(null)

  // upload state
  const [uploadingAudio, setUploadingAudio] = useState(false)

  // preview state
  const [previewImageUrl, setPreviewImageUrl] = useState(null)
  const [previewFilename, setPreviewFilename] = useState(null)

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  // ref for the scrollable messages container (we'll observe its visibility)
  const messagesContainerRef = useRef(null)
  const markedOnceRef = useRef(false) // ensure we only auto-mark once per mount

  // Mask URL immediately (before paint) to avoid showing the raw id / query
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const maskedPath = '/uis/user-space/chat'
      // also strip any search params
      const current = window.location.pathname // + window.location.search
      if (current !== maskedPath) {
        window.history.replaceState(null, '', maskedPath)
      }
    } catch (e) {
      // ignore
    }
  }, []) // run once on mount, before paint

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const res = await fetch("/api/users?operation=get-current")
        if (res.ok) {
          const payload = await res.json()
          const uid = payload?.user?._id || payload?.user?.id || payload?.current?.id || payload?.id || null
          if (uid) {
            setCurrentUserId(uid)
            try {
              const r2 = await fetch(`/api/users/${encodeURIComponent(uid)}`)
              if (r2.ok) {
                const p2 = await r2.json()
                const usr = p2?.user ?? p2
                setCurrentUser(usr || null)
                return
              }
            } catch (e) { /* ignore */ }
            setCurrentUser(payload?.user || null)
            return
          }
        }
      } catch (e) {
        // fallback to localStorage
      }
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed?.id) {
            setCurrentUserId(parsed.id)
            setCurrentUser(parsed)
          }
        }
      } catch (e) {}
    }
    loadCurrentUser()
  }, [])

  useEffect(() => {
    async function fetchConversation() {
      if (!receiverId) return
      let userA = currentUserId
      if (!userA) {
        try {
          const raw = typeof window !== 'undefined' ? localStorage.getItem("user") : null
          if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed?.id) userA = parsed.id
          }
        } catch (e) {}
      }
      if (!userA) return

      setLoadingMessages(true)
      setError(null)
      try {
        const url = `/api/messages?operation=get-conversation&userA=${encodeURIComponent(userA)}&userB=${encodeURIComponent(receiverId)}`
        const res = await fetch(url)
        if (!res.ok) {
          const payload = await res.json().catch(() => null)
          setError(payload?.error || `Server returned ${res.status}`)
          setMessages([])
        } else {
          const payload = await res.json()
          const msgs = Array.isArray(payload?.messages) ? payload.messages : []
          setMessages(msgs)
          setTimeout(() => scrollToBottom(), 50)

          // ensure URL is masked after conversation load as well
          try {
            if (typeof window !== 'undefined') {
              const maskedPath = '/uis/user-space/chat'
              if (window.location.pathname !== maskedPath) {
                window.history.replaceState(null, '', maskedPath)
              }
            }
          } catch (e) { /* ignore */ }
        }
      } catch (err) {
        setError(err.message || "Failed to load conversation")
      } finally {
        setLoadingMessages(false)
      }
    }
    fetchConversation()
  }, [currentUserId, receiverId])

  useEffect(() => {
    // cleanup on unmount
    return () => {
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop()
        }
      } catch (e) {}
      try {
        if (activeStreamRef.current) {
          activeStreamRef.current.getTracks().forEach(t => t.stop())
        }
      } catch (e) {}
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current)
        recordIntervalRef.current = null
      }
      // reset markedOnceRef for future mounts
      markedOnceRef.current = false
    }
  }, [])

  const scrollToBottom = () => {
    try {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
      }
    } catch (e) {}
  }

  function formatElapsed(ms) {
    const totalSec = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSec / 60).toString().padStart(2, '0')
    const seconds = (totalSec % 60).toString().padStart(2, '0')
    return `${minutes}:${seconds}`
  }

  // format seconds (used for audio playback times which are in seconds)
  function formatSeconds(secs) {
    const totalSec = Math.max(0, Math.floor(secs || 0))
    const minutes = Math.floor(totalSec / 60).toString().padStart(2, '0')
    const seconds = (totalSec % 60).toString().padStart(2, '0')
    return `${minutes}:${seconds}`
  }

  async function uploadFile(file) {
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/messages/upload", { method: "POST", body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || `Upload failed (${res.status})`)
      }
      const payload = await res.json()
      return payload?.file || null
    } catch (err) {
      console.error("uploadFile", err)
      throw err
    }
  }

  async function handleFileSend(file, forcedType = null) {
    if (!file) return
    try {
      const baseType = forcedType || (file.type ? (file.type.startsWith('audio/') ? 'audio' : (file.type.startsWith('image/') ? 'image' : 'file')) : 'file')
      if (baseType === 'audio') setUploadingAudio(true)
      const uploaded = await uploadFile(file)
      if (!uploaded?.url) throw new Error("Upload did not return url")
      const senderIdFinal = currentUserId || (typeof window !== 'undefined' && JSON.parse(localStorage.getItem("user") || "{}").id)
      const payload = {
        senderId: senderIdFinal,
        receiverId,
        text: "",
        sentAt: new Date().toISOString(),
        attachments: [{ type: baseType, url: uploaded.url, filename: uploaded.filename || file.name, size: uploaded.size, mimeType: uploaded.type || file.type }],
      }
      const r = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (r.ok) {
        const p = await r.json()
        setMessages((m) => [...m, p?.message || payload])
        setTimeout(() => scrollToBottom(), 50)
      } else {
        const p = await r.json().catch(() => null)
        setError(p?.error || `Server returned ${r.status}`)
      }
    } catch (err) {
      console.error("file send error", err)
      setError(err.message || "File upload failed")
    } finally {
      setUploadingAudio(false)
    }
  }

  // Recording voice message with timer and upload as audio
  async function startRecording() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      activeStreamRef.current = stream

      const options = {}
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) options.mimeType = 'audio/webm;codecs=opus'
        else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) options.mimeType = 'audio/ogg;codecs=opus'
        else if (MediaRecorder.isTypeSupported('audio/mp4')) options.mimeType = 'audio/mp4'
      }
      const mediaRecorder = new MediaRecorder(stream, options)
      recordedChunksRef.current = []

      mediaRecorder.addEventListener("dataavailable", (ev) => {
        if (ev.data && ev.data.size > 0) recordedChunksRef.current.push(ev.data)
      })

      mediaRecorder.addEventListener("stop", async () => {
        try {
          const mime = mediaRecorder.mimeType || (recordedChunksRef.current[0] && recordedChunksRef.current[0].type) || 'audio/webm'
          const blob = new Blob(recordedChunksRef.current, { type: mime })
          let ext = 'webm'
          if (mime.includes('ogg')) ext = 'ogg'
          else if (mime.includes('mp4') || mime.includes('mpeg')) ext = 'm4a'
          const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mime })
          await handleFileSend(file, "audio")
        } catch (err) {
          console.error("record stop error", err)
          setError("Recording failed.")
        } finally {
          setRecording(false)
          setRecordElapsedMs(0)
          try { if (activeStreamRef.current) activeStreamRef.current.getTracks().forEach(t => t.stop()) } catch (e) {}
          activeStreamRef.current = null
          if (recordIntervalRef.current) { clearInterval(recordIntervalRef.current); recordIntervalRef.current = null }
        }
      })

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      recordStartRef.current = Date.now()
      setRecordElapsedMs(0)
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current)
      recordIntervalRef.current = setInterval(() => {
        setRecordElapsedMs(Date.now() - recordStartRef.current)
      }, 200)
      setRecording(true)
    } catch (err) {
      console.error("startRecording error", err)
      setError("Could not start audio recording (permission denied or unsupported).")
      setRecording(false)
    }
  }

  function stopRecording() {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop()
      } else {
        setRecording(false)
        setRecordElapsedMs(0)
        try { if (activeStreamRef.current) activeStreamRef.current.getTracks().forEach(t => t.stop()) } catch (e) {}
        activeStreamRef.current = null
        if (recordIntervalRef.current) { clearInterval(recordIntervalRef.current); recordIntervalRef.current = null }
      }
    } catch (e) {
      console.error("stopRecording error", e)
    }
  }

  function onFileInputChange(e) {
    const f = e.target.files && e.target.files[0]
    if (f) {
      const detected = f.type ? (f.type.startsWith('audio/') ? 'audio' : (f.type.startsWith('image/') ? 'image' : 'file')) : 'file'
      handleFileSend(f, detected)
    }
    e.target.value = null
  }

  function openPreview(url, filename) {
    setPreviewImageUrl(url)
    setPreviewFilename(filename || null)
  }

  async function downloadFile(url, filename = 'file') {
    try {
      const a = document.createElement('a')
      a.href = url
      a.download = filename || ''
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e) {
      try {
        const res = await fetch(url)
        const blob = await res.blob()
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = filename || 'file'
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
      } catch (err) {
        console.error('download failed', err)
        setError('Download failed')
      }
    }
  }

  // Restore handleSend (simple text send)
  async function handleSend() {
    if (!text || text.trim() === "") {
      // avoid sending empty messages
      setError("Can't send an empty message.")
      return
    }
    if (!receiverId) { setError("No receiver selected."); return }
    setSending(true)
    setError(null)

    const sentAt = new Date().toISOString()
    let senderIdFinal = currentUserId
    if (!senderIdFinal) {
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem("user") : null
        if (raw) {
          const parsed = JSON.parse(raw)
          senderIdFinal = parsed?.id || null
        }
      } catch (e) {}
    }
    if (!senderIdFinal) {
      setError("Unable to determine current user id. Please login again.")
      setSending(false)
      return
    }

    const messagePayload = {
      senderId: senderIdFinal,
      receiverId,
      text: text.trim() || "",
      sentAt,
      attachments: [],
    }

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messagePayload),
      })
      if (res.ok) {
        const payload = await res.json()
        const saved = payload?.message || messagePayload
        setMessages((m) => [...m, saved])
        setText("")
        setTimeout(() => scrollToBottom(), 50)
      } else {
        const payload = await res.json().catch(() => null)
        setError(payload?.error || `Server returned ${res.status}`)
      }
    } catch (err) {
      console.error("send message error", err)
      setError("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  // Robust visibility-based "mark-as-seen" logic:
  useEffect(() => {
    // prerequisites
    if (!messagesContainerRef.current) return
    if (!currentUserId || !receiverId) return
    if (!messages || messages.length === 0) return
    if (markedOnceRef.current) return

    // helper to get IDs that should be marked: received by current user && not isSeen
    const computeIdsToMark = () => {
      return messages
        .filter(m => {
          const receiverRaw = m.receiverId && typeof m.receiverId === 'object' ? (m.receiverId._id || m.receiverId.id) : m.receiverId
          const receiverStr = receiverRaw ? String(receiverRaw) : null
          const isReceived = String(receiverStr) === String(currentUserId)
          const isSeen = m.isSeen === true
          return isReceived && !isSeen
        })
        .map(m => m._id || m.id)
        .filter(Boolean)
    }

    // check visibility synchronously (with a tiny delay to let the browser render)
    const isVisibleNow = () => {
      try {
        const el = messagesContainerRef.current
        if (!el) return false
        const rect = el.getBoundingClientRect()
        return rect.top < (window.innerHeight || document.documentElement.clientHeight) && rect.bottom > 0
      } catch (e) {
        return false
      }
    }

    const tryMark = async (idsToMark) => {
      if (!idsToMark || idsToMark.length === 0) return
      markedOnceRef.current = true
      try {
        await fetch('/api/messages/mark-seen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageIds: idsToMark, userId: currentUserId })
        }).catch(() => {})
        // update local state
        setMessages(prev => prev.map(m => (idsToMark.includes(m._id || m.id) ? { ...m, isSeen: true } : m)))
        // notify other UI (e.g., layout badge)
        try { window.dispatchEvent(new CustomEvent('friend-request-changed')) } catch (e) {}
      } catch (err) {
        console.warn('mark-seen failed', err)
      }
    }

    // small timeout to allow the DOM to settle; if visible then mark now
    const immediateCheckTimer = setTimeout(() => {
      if (markedOnceRef.current) return
      const ids = computeIdsToMark()
      if (ids.length === 0) return
      if (isVisibleNow()) {
        tryMark(ids)
        return
      }
      // else install observer to mark once it becomes visible
      const observer = new IntersectionObserver((entries) => {
        const ent = entries && entries[0]
        if (!ent) return
        if (ent.isIntersecting) {
          try {
            // compute again in case messages changed
            const idsNow = computeIdsToMark()
            if (idsNow.length > 0) tryMark(idsNow)
          } finally {
            try { observer.disconnect() } catch (e) {}
          }
        }
      }, { root: null, threshold: 0.05 })
      try {
        observer.observe(messagesContainerRef.current)
      } catch (e) {
        console.warn('observer observe failed', e)
      }
    }, 120) // 120ms small delay

    return () => {
      clearTimeout(immediateCheckTimer)
      // don't attempt to reset markedOnceRef here (we clear on unmount in cleanup effect)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, currentUserId, receiverId])

  // Compact WhatsApp-like audio UI used inside message bubbles.
  function VoiceBubble({ src, filename }) {
    const audioRef = useRef(null)
    const progressRef = useRef(null)
    const [duration, setDuration] = useState(0)
    const [current, setCurrent] = useState(0)
    const [playing, setPlaying] = useState(false)
    const [muted, setMuted] = useState(false)
    const draggingRef = useRef(false)

    // menu + playback speed state
    const [menuAnchor, setMenuAnchor] = useState(null)
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]

    const openMenu = (e) => setMenuAnchor(e.currentTarget)
    const closeMenu = () => setMenuAnchor(null)
    const onSelectSpeed = (s) => { setPlaybackSpeed(s); closeMenu() }
    const onDownload = () => { closeMenu(); downloadFile(src, filename || `audio-${Date.now()}.webm`) }

    useEffect(() => {
      const a = new Audio(src)
      a.preload = 'metadata'
      audioRef.current = a
      a.playbackRate = playbackSpeed
      const onLoaded = () => setDuration(a.duration || 0)
      const onTime = () => { if (!draggingRef.current) setCurrent(a.currentTime) }
      const onEnd = () => { setPlaying(false); setCurrent(a.duration || 0) }
      a.addEventListener('loadedmetadata', onLoaded)
      a.addEventListener('timeupdate', onTime)
      a.addEventListener('ended', onEnd)
      return () => {
        try { a.pause(); a.removeEventListener('loadedmetadata', onLoaded); a.removeEventListener('timeupdate', onTime); a.removeEventListener('ended', onEnd) } catch (e) {}
      }
    }, [src])

    useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = playbackSpeed }, [playbackSpeed])

    const togglePlay = useCallback(async () => {
      if (!audioRef.current) return
      try {
        audioRef.current.playbackRate = playbackSpeed
        if (playing) { audioRef.current.pause(); setPlaying(false) } else { await audioRef.current.play(); setPlaying(true) }
      } catch (e) { console.error("play error", e); setError("Playback failed.") }
    }, [playing, playbackSpeed])

    const toggleMute = () => { if (!audioRef.current) return; audioRef.current.muted = !audioRef.current.muted; setMuted(audioRef.current.muted) }

    const getClientX = (e) => (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX

    const onProgressClick = (e) => {
      if (!audioRef.current || !progressRef.current) return
      const rect = progressRef.current.getBoundingClientRect()
      const x = (getClientX(e) - rect.left)
      const ratio = Math.max(0, Math.min(1, x / rect.width))
      const newTime = ratio * (duration || 0)
      audioRef.current.currentTime = newTime
      setCurrent(newTime)
    }

    const onDragStart = (e) => { draggingRef.current = true; e.preventDefault() }
    const onDragMove = (e) => {
      if (!draggingRef.current || !progressRef.current) return
      const clientX = getClientX(e)
      const rect = progressRef.current.getBoundingClientRect()
      const x = (clientX - rect.left)
      const ratio = Math.max(0, Math.min(1, x / rect.width))
      const newTime = ratio * (duration || 0)
      setCurrent(newTime)
    }
    const onDragEnd = (e) => {
      if (!draggingRef.current || !progressRef.current || !audioRef.current) { draggingRef.current = false; return }
      const clientX = getClientX(e)
      const rect = progressRef.current.getBoundingClientRect()
      const x = (clientX - rect.left)
      const ratio = Math.max(0, Math.min(1, x / rect.width))
      const newTime = ratio * (duration || 0)
      audioRef.current.currentTime = newTime
      setCurrent(newTime)
      draggingRef.current = false
    }

    const progressPct = duration ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
        <Box
          sx={{
            bgcolor: '#f0f2f5',
            borderRadius: '18px',
            px: 1.25,
            py: 0.75,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            minWidth: 260,
            maxWidth: { xs: '95vw', sm: 520 },
            boxShadow: '0 1px 0 rgba(0,0,0,0.06)'
          }}
        >
          <IconButton size="medium" onClick={togglePlay} sx={{ p: 0.5 }}>
            {playing ? <PauseIcon fontSize="medium" /> : <PlayArrowIcon fontSize="medium" />}
          </IconButton>

          {/* visible indicator */}
          <Box sx={{ width: 10, height: 10, bgcolor: '#000', borderRadius: '50%' }} />

          {/* larger progress bar with draggable knob */}
          <Box
            ref={progressRef}
            onClick={onProgressClick}
            onMouseDown={onDragStart}
            onMouseMove={(e) => { if (draggingRef.current) onDragMove(e) }}
            onMouseUp={onDragEnd}
            onTouchStart={onDragStart}
            onTouchMove={onDragMove}
            onTouchEnd={onDragEnd}
            sx={{
              height: 10,
              bgcolor: 'rgba(0,0,0,0.06)',
              borderRadius: 6,
              flex: 1,
              position: 'relative',
              cursor: 'pointer',
              overflow: 'visible'
            }}
          >
            <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progressPct}%`, bgcolor: 'rgba(0,0,0,0.38)', transition: 'width 100ms linear', borderRadius: 6 }} />
            {/* draggable knob */}
            <Box
              onMouseDown={onDragStart}
              onTouchStart={onDragStart}
              onMouseMove={(e) => { if (draggingRef.current) onDragMove(e) }}
              onTouchMove={onDragMove}
              onMouseUp={onDragEnd}
              onTouchEnd={onDragEnd}
              sx={{
                position: 'absolute',
                left: `${progressPct}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 14,
                height: 14,
                bgcolor: '#f0f2f5',
                border: '2px solid rgba(0,0,0,0.4)',
                borderRadius: '50%',
                boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                touchAction: 'none'
              }}
            />
          </Box>

          <IconButton size="small" onClick={toggleMute} sx={{ p: 0.5 }}>
            <VolumeUpIcon fontSize="small" />
          </IconButton>

          {/* menu: playback speed and download */}
          <IconButton size="small" sx={{ p: 0.5 }} onClick={openMenu} aria-controls={menuAnchor ? 'voice-menu' : undefined} aria-haspopup="true">
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <Menu id="voice-menu" anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
            {speeds.map((s) => (
              <MenuItem key={s} selected={s === playbackSpeed} onClick={() => onSelectSpeed(s)}>
                <ListItemText>{`${s}x`}</ListItemText>
              </MenuItem>
            ))}
            <MenuItem onClick={onDownload}>
              <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Download</ListItemText>
            </MenuItem>
          </Menu>

          <Box sx={{ ml: 0.5 }}>
            <Typography variant="caption" sx={{ fontSize: 12 }}>{playbackSpeed}x</Typography>
          </Box>
        </Box>

        {/* timestamp under bubble: current / total (seconds -> mm:ss) */}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
          {formatSeconds(current)} / {formatSeconds(duration)}
        </Typography>
      </Box>
    )
  }

  return (
    <Container maxWidth="md" sx={{ display: "flex", flexDirection: "column", height: "80vh", p: 0 }}>
      <Box sx={{ p: 2, borderBottom: "1px solid #eee" }}>
        <Typography variant="h6">Chat</Typography>
        <Typography variant="body2" color="text.secondary">{receiver ? (receiver.pseudo || receiver.firstName) : "Select a user"}</Typography>
      </Box>

      {/* Messages area - grows and scrolls */}
      <Box ref={messagesContainerRef} sx={{ flex: 1, overflowY: "auto", p: 2, bgcolor: "#fafafa" }}>
        <List>
          {messages.map((m, idx) => {
            const isMe = String(m.senderId) === String(currentUserId)
            return (
              <ListItem key={m._id || m.id || idx} sx={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                <Box sx={{ bgcolor: isMe ? "#d1ffd6" : "#fff", p: 1, borderRadius: 1, maxWidth: "80%" }}>
                  {m.text ? <Typography variant="body1">{m.text}</Typography> : null}
                  {/* render attachments */}
                  {Array.isArray(m.attachments) && m.attachments.map((a, i) => {
                    if (a.type === "image") {
                      return (
                        <Box key={i} sx={{ mt: 1 }}>
                          <img
                            src={a.url}
                            alt={a.filename || "image"}
                            style={{ maxWidth: "240px", borderRadius: 6, cursor: "pointer" }}
                            onClick={() => openPreview(a.url, a.filename)}
                          />
                        </Box>
                      )
                    }
                    if (a.type === "audio") {
                      // use the compact WhatsApp-like voice UI
                      return <Box key={i} sx={{ mt: 1 }}><VoiceBubble src={a.url} filename={a.filename} /></Box>
                    }
                    // fallback: show link with download
                    return <Box key={i} sx={{ mt: 1 }}><a href={a.url} target="_blank" rel="noreferrer" onClick={(ev)=>{ev.preventDefault(); downloadFile(a.url, a.filename)}}>{a.filename || a.url}</a></Box>
                  })}
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                    {m.sentAt ? new Date(m.sentAt).toLocaleString() : ""}
                  </Typography>
                </Box>
              </ListItem>
            )
          })}
        </List>
        <div ref={messagesEndRef} />
      </Box>

      {/* Preview overlay */}
      {previewImageUrl ? (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            bgcolor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            p: 2
          }}
          onClick={() => { setPreviewImageUrl(null); setPreviewFilename(null) }}
        >
          <Box sx={{ bgcolor: "#fff", borderRadius: 2, p: 1, maxWidth: "95%", maxHeight: "95%" }} onClick={(e)=>e.stopPropagation()}>
            <img src={previewImageUrl} alt={previewFilename || "preview"} style={{ maxWidth: "100%", maxHeight: "80vh", display: "block", marginBottom: 8 }} />
            <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
              <Button variant="outlined" onClick={() => downloadFile(previewImageUrl, previewFilename || 'image')}>Download</Button>
              <Button variant="contained" onClick={() => { setPreviewImageUrl(null); setPreviewFilename(null) }}>Close</Button>
            </Box>
          </Box>
        </Box>
      ) : null}

      {/* Composer fixed to bottom (old UI look) */}
      <Box sx={{ borderTop: "1px solid #eee", p: 1, display: "flex", gap: 1, alignItems: "center" }}>
        <input type="file" accept="image/*,audio/*" ref={fileInputRef} style={{ display: "none" }} onChange={onFileInputChange} />
        <IconButton onClick={() => fileInputRef.current && fileInputRef.current.click()} title="Attach photo or audio">
          <ImageIcon />
        </IconButton>

        <IconButton onClick={() => { recording ? stopRecording() : startRecording() }} color={recording ? "error" : "default"} title={recording ? "Stop recording" : "Record voice"}>
          {recording ? <StopIcon /> : <MicIcon />}
        </IconButton>

        {/* show recording duration when recording */}
        <Box sx={{ minWidth: 56 }}>
          {recording ? <Typography variant="caption" color="error">{formatElapsed(recordElapsedMs)}</Typography> : null}
        </Box>

        <TextField
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          fullWidth
          size="small"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
        />

        <Button variant="contained" onClick={handleSend} disabled={sending}>
          Send
        </Button>
      </Box>
    </Container>
  )
}