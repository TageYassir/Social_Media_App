"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Container, Stack, TextField, Button, Typography } from "@mui/material"

export default function AdminLogin() {
  const router = useRouter()
  const [pseudo, setPseudo] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleLogin = async () => {
    setError("")
  
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pseudo, password })
    })
  
    const data = await res.json()
  
    if (!res.ok) {
      setError(data.error || "Login failed")
      return
    }
  
    router.push("/admin/dashboard") // redirige après login
  }
  

  return (
    <Container maxWidth="sm">
      <Stack spacing={2} mt={5}>
        <Typography variant="h5" textAlign="center">
          Admin Login
        </Typography>

        <TextField
          label="Pseudo"
          onChange={e => setPseudo(e.target.value)}
        />

        <TextField
          label="Password"
          type="password"
          onChange={e => setPassword(e.target.value)}
        />

        {error && (
          <Typography color="error">{error}</Typography>
        )}

        <Button variant="contained" onClick={handleLogin}>
          Login
        </Button>
      </Stack>
    </Container>
  )
}
