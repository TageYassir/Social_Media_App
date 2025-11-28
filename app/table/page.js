"use client"

import { Money } from '@mui/icons-material'
import { Avatar, colors, Grid, Paper, Stack, Typography } from '@mui/material'
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

const users = [
  { id: "M1-233-87", gender: "Female", country: "Morocco" },
  { id: "M1-233-24", gender: "Male", country: "Morocco" },
  { id: "M1-233-65", gender: "Male", country: "USA" },
  { id: "M1-233-08", gender: "Female", country: "France" },
  { id: "M1-233-40", gender: "Female", country: "Morocco" },
];

export default function Page() {
  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        
        <TableHead>
          <TableRow>
            <TableCell align="right">Number</TableCell>
            <TableCell align="right">Gender</TableCell>
            <TableCell align="right">Country</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {users.map((item) => (
            <TableRow key={item.id}>
              <TableCell align="right">{item.id}</TableCell>
              <TableCell align="right">{item.gender}</TableCell>
              <TableCell align="right">{item.country}</TableCell>
            </TableRow>
          ))}
        </TableBody>

      </Table>
    </TableContainer>
  );
}
