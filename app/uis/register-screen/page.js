'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Grid,
  Autocomplete,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
} from '@mui/material'

/**
 * Register screen - improved:
 * - Accept any Gmail address (anything@gmail.com)
 * - Improved UI for Country (Autocomplete) and Gender (RadioGroup)
 * - Improved inline validation and helper text
 *
 * Note: If you want to also enforce these rules on the server, I can update the API handler.
 */

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria",
  "Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan",
  "Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Côte d'Ivoire","Cabo Verde",
  "Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Congo-Brazzaville)",
  "Costa Rica","Croatia","Cuba","Cyprus","Czechia (Czech Republic)","Democratic Republic of the Congo","Denmark","Djibouti","Dominica","Dominican Republic",
  "Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini (fmr. \"Swaziland\")","Ethiopia","Federated States of Micronesia","Fiji",
  "Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala",
  "Guinea","Guinea-Bissau","Guyana","Haiti","Holy See","Honduras","Hungary","Iceland","India","Indonesia",
  "Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya",
  "Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein",
  "Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania",
  "Mauritius","Mexico","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar (formerly Burma)","Namibia",
  "Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway",
  "Oman","Pakistan","Palau","Palestine State","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland",
  "Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino",
  "Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands",
  "Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland",
  "Syria","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey",
  "Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States of America","Uruguay","Uzbekistan","Vanuatu",
  "Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
]

/** Accept any gmail address (local part non-empty, no spaces) */
function isAllowedEmail(value) {
  if (!value) return false
  return /^[^\s@]+@gmail\.com$/i.test(String(value).trim())
}

/** Password policy: min 8 chars, at least one upper, one lower, one digit and one special char */
function isStrongPassword(pwd) {
  if (!pwd || typeof pwd !== 'string') return false
  const trimmed = pwd
  if (trimmed.length < 8) return false
  const hasUpper = /[A-Z]/.test(trimmed)
  const hasLower = /[a-z]/.test(trimmed)
  const hasDigit = /[0-9]/.test(trimmed)
  const hasSpecial = /[^A-Za-z0-9]/.test(trimmed)
  return hasUpper && hasLower && hasDigit && hasSpecial
}

export default function RegisterScreen() {
  const router = useRouter()
  const debounceRef = useRef(null)

  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [pseudo, setPseudo] = useState('')
  const [pseudoAvailable, setPseudoAvailable] = useState(null)
  const [pseudoChecking, setPseudoChecking] = useState(false)
  const [country, setCountry] = useState('')
  const [gender, setGender] = useState('') // '', 'male','female','other'
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  function handleEmailChange(e) {
    const v = e.target.value || ''
    setEmail(v)
    setError(null)
    if (!v) {
      setEmailError('Email is required.')
      return
    }
    if (!isAllowedEmail(v)) {
      setEmailError('Only @gmail.com addresses are allowed (e.g. anything@gmail.com).')
    } else {
      setEmailError('')
    }
  }

  function handlePasswordChange(e) {
    const v = e.target.value || ''
    setPassword(v)
    setError(null)
    if (!v) {
      setPasswordError('Password is required.')
      return
    }
    if (!isStrongPassword(v)) {
      setPasswordError('Password must be ≥8 chars with upper, lower, digit and special character.')
    } else {
      setPasswordError('')
    }
  }

  function handlePseudoChange(e) {
    const value = e.target.value || ''
    setPseudo(value)
    setPseudoAvailable(null)
    setError(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      checkPseudo(value)
    }, 500)
  }

  function handleCountryChange(event, value) {
    // Autocomplete returns value (string) or null
    setCountry(value || '')
  }

  function handleGenderChange(event) {
    setGender(event.target.value)
  }

  function handleFirstNameChange(event) {
    setFirstName(event.target.value)
  }

  function handleLastNameChange(event) {
    setLastName(event.target.value)
  }

  async function checkPseudo(value) {
    const v = (value || '').trim()
    if (!v) {
      setPseudoAvailable(null)
      setPseudoChecking(false)
      return
    }

    setPseudoChecking(true)
    setPseudoAvailable(null)
    setError(null)

    try {
      const res = await fetch(`/api/users?operation=check-pseudo&pseudo=${encodeURIComponent(v)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(payload?.error || `Server error (${res.status})`)
        setPseudoAvailable(false)
      } else {
        setPseudoAvailable(Boolean(payload?.available))
      }
    } catch (err) {
      console.error('checkPseudo error', err)
      setError('Network error while checking pseudo')
      setPseudoAvailable(false)
    } finally {
      setPseudoChecking(false)
    }
  }

  const isFormValid = () => {
    if (!email || emailError) return false
    if (!password || passwordError) return false
    if (!pseudo || pseudo.trim().length < 2) return false
    if (pseudoAvailable === false) return false
    return true
  }

  const create = async function (event) {
    event.preventDefault()
    setError(null)

    // Client-side validation (defensive)
    if (!isAllowedEmail(email)) {
      setEmailError('Only @gmail.com addresses are allowed (e.g. anything@gmail.com).')
      return
    }
    if (!isStrongPassword(password)) {
      setPasswordError('Password must be ≥8 chars with upper, lower, digit and special character.')
      return
    }
    if (!pseudo || pseudo.trim().length < 2) {
      setError('Please provide a pseudo of at least 2 characters.')
      return
    }

    if (pseudoAvailable === false) {
      setError('This pseudo is already taken. Please choose another.')
      return
    }

    if (pseudoAvailable === null) {
      setPseudoChecking(true)
      await checkPseudo(pseudo)
      setPseudoChecking(false)
      if (pseudoAvailable === false) {
        setError('This pseudo is already taken. Please choose another.')
        return
      }
    }

    setLoading(true)
    try {
      const response = await fetch('/api/users?operation=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          pseudo: pseudo.trim(),
          country,
          gender,
          firstName,
          lastName,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (response.status === 201) {
        router.push('/uis')
        return
      }

      if (response.status === 409) {
        const msg = data?.error || 'An account with this email or pseudo already exists. Please login or choose a different pseudo.'
        setError(msg)
        setLoading(false)
        return
      }

      setError(data?.error || `Server error (${response.status})`)
    } catch (err) {
      setError(err?.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box component="form" onSubmit={create} sx={{ maxWidth: 720, mx: 'auto', p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Register</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            label="Email"
            type="email"
            fullWidth
            value={email}
            onChange={handleEmailChange}
            required
            error={Boolean(emailError)}
            helperText={emailError || 'Only @gmail.com addresses accepted (e.g. anything@gmail.com).'}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            label="Password"
            type="password"
            fullWidth
            value={password}
            onChange={handlePasswordChange}
            required
            error={Boolean(passwordError)}
            helperText={passwordError || 'At least 8 chars, include upper/lower/digit/special.'}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            label="Pseudo"
            fullWidth
            value={pseudo}
            onChange={handlePseudoChange}
            required
            helperText={pseudoChecking ? 'Checking availability...' : (pseudoAvailable === true ? 'Available' : (pseudoAvailable === false ? 'Taken' : ''))}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Autocomplete
            options={COUNTRIES}
            value={country || ''}
            onChange={handleCountryChange}
            freeSolo={false}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Country"
                fullWidth
                helperText="Select your country (optional)"
              />
            )}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend">Gender</FormLabel>
            <RadioGroup
              row
              aria-label="gender"
              name="gender"
              value={gender}
              onChange={handleGenderChange}
            >
              <FormControlLabel value="" control={<Radio />} label="Not specified" />
              <FormControlLabel value="male" control={<Radio />} label="Male" />
              <FormControlLabel value="female" control={<Radio />} label="Female" />
              <FormControlLabel value="other" control={<Radio />} label="Other" />
            </RadioGroup>
            <FormHelperText>Pick a gender (optional)</FormHelperText>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField label="First name" value={firstName} onChange={handleFirstNameChange} fullWidth />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField label="Last name" value={lastName} onChange={handleLastNameChange} fullWidth />
        </Grid>

        <Grid item xs={12} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button type="submit" variant="contained" disabled={loading || !isFormValid()}>
            {loading ? <CircularProgress size={18} /> : 'Create account'}
          </Button>
          <Button variant="text" onClick={() => router.push('/uis')}>Back to login</Button>
        </Grid>
      </Grid>
    </Box>
  )
}