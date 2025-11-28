'use client'

import React from "react"
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from "@mui/material"

/**
 * Simple modal to show the message metadata (senderId, receiverId, sentAt, text).
 * This is the "message modal containing the informations sender id receiver id time sent and the text sent"
 * requested in your message.
 */
export default function MessageModal({ open, onClose, message }) {
  if (!message) return null

  return (
    <Dialog open={!!open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Message details</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2">Sender ID</Typography>
          <Typography variant="body2">{message.senderId || "unknown"}</Typography>
        </Box>

        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2">Receiver ID</Typography>
          <Typography variant="body2">{message.receiverId || "unknown"}</Typography>
        </Box>

        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2">Time sent</Typography>
          <Typography variant="body2">{message.sentAt ? new Date(message.sentAt).toString() : "—"}</Typography>
        </Box>

        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2">Text</Typography>
          <Typography variant="body1">{message.text}</Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">Close</Button>
      </DialogActions>
    </Dialog>
  )
}