// src/ui/PageHeader.jsx
import React from 'react';
import { Box, Stack, Typography } from '@mui/material';

export default function PageHeader({ title, subtitle, right }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
        <Box>
          <Typography variant="h5">{title}</Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {right ? <Box>{right}</Box> : null}
      </Stack>
    </Box>
  );
}
