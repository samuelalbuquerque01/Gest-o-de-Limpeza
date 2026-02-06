// src/ui/StatCard.jsx
import React from 'react';
import { Card, CardContent, Stack, Typography, Box, LinearProgress } from '@mui/material';

export default function StatCard({
  title,
  value,
  hint,
  progress, // 0-100 opcional
  right,
}) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Typography variant="subtitle2" color="text.secondary">
              {title}
            </Typography>
            {right ? <Box>{right}</Box> : null}
          </Stack>

          <Typography variant="h4" sx={{ lineHeight: 1.1 }}>
            {value}
          </Typography>

          {hint ? (
            <Typography variant="body2" color="text.secondary">
              {hint}
            </Typography>
          ) : null}

          {typeof progress === 'number' ? (
            <Box sx={{ mt: 1 }}>
              <LinearProgress variant="determinate" value={Math.max(0, Math.min(100, progress))} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {progress}% concluído
              </Typography>
            </Box>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
