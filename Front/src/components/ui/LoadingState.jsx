// src/ui/LoadingState.jsx
import React from 'react';
import { Card, CardContent, Skeleton, Stack } from '@mui/material';

export default function LoadingState({ rows = 4 }) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={1}>
          <Skeleton variant="text" width="40%" height={30} />
          <Skeleton variant="text" width="70%" />
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={42} sx={{ borderRadius: 2 }} />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
