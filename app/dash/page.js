"use client";

import { Money } from "@mui/icons-material";
import {
  Avatar,
  colors,
  Grid,
  Paper,
  Stack,
  Typography
} from "@mui/material";

import { PieChart } from "@mui/x-charts";
import { BarChart } from "@mui/x-charts/BarChart";

export default function Page() {
  return (
    <Grid container spacing={2} sx={{ height: "100vh", padding: 2 }}>

      {/* ---------------- LEFT CARD ---------------- */}
      <Grid size = {6} item xs={3}>
        <Paper sx={{ backgroundColor: colors.amber[200], padding: 2 }}>
          <Stack direction="column" spacing={2}>

            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar />
              <Money />
            </Stack>

            <Stack direction="column">
              <Typography variant="h6">Turnover</Typography>
              <Typography>Global Turnover of 2025</Typography>
            </Stack>

            <Typography variant="h4">45366</Typography>

          </Stack>
        </Paper>
      </Grid>

      {/* ---------------- MIDDLE CARD ---------------- */}
      <Grid size = {6} item xs={3}>
        <Paper sx={{ height: 200, backgroundColor: colors.green[200], padding: 2 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ height: "100%" }}
          >
            <Typography variant="h6">Turnover</Typography>
            <Typography>Global Turnover of 2025</Typography>
          </Stack>
        </Paper>
      </Grid>

      {/* ---------------- PIE CHART CARD ---------------- */}
      <Grid size = {6} item xs={3}>
        <Paper sx={{ padding: 2 }}>
          <Typography variant="h6" mb={1}>Statistics (Pie)</Typography>

          <PieChart
            series={[
              {
                data: [
                  { id: 0, value: 10, label: "Series A" },
                  { id: 1, value: 15, label: "Series B" },
                  { id: 2, value: 20, label: "Series C" },
                ],
              },
            ]}
            width={200}
            height={200}
          />
        </Paper>
      </Grid>

      {/* ---------------- BAR CHART CARD ---------------- */}
      <Grid size = {6} item xs={3}>
        <Paper sx={{ padding: 2 }}>
          <Typography variant="h6" mb={1}>Statistics (Bar)</Typography>

          <BarChart
            xAxis={[{ data: ["group A", "group B", "group C"] }]}
            series={[
              { data: [4, 3, 5] },
              { data: [1, 6, 3] },
              { data: [2, 5, 6] },
            ]}
            height={300}
          />
        </Paper>
      </Grid>

    </Grid>
  );
}
