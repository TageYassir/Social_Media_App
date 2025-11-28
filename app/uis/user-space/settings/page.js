"use client"

/** React MUI Imports */
import { Button, colors, ListItemText, Avatar, List, Typography, ListItem, ListItemAvatar, Paper, Badge } from "@mui/material"
/** Next Imports */
import Image from "next/image"
/** React Imports */
import { useState } from "react"
/** Next Nagivation */
import { useRouter } from "next/navigation"
/** Icons Imports */
import { AdjustOutlined, CenterFocusStrongOutlined, Circle, MailOutline, Settings } from "@mui/icons-material"
/** Moment Imports */
import moment from "moment"

export default function Page() {
  /** */
  const router = useRouter()


  return(
    <Typography variant="h5">Settings</Typography>
  ) 
}
