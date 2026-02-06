// src/ui/EmptyState.jsx
import React from 'react';
import { Card, CardContent, Typography, Button, Stack } from '@mui/material';

export default function EmptyState({ title = 'Sem dados', description = 'Nada para mostrar por aqui.', actionLabel, onAction }) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={1.2}>
          <Typography variant="h6">{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
          {actionLabel && onAction ? (
            <Button variant="contained" onClick={onAction} sx={{ alignSelf: 'flex-start', mt: 1 }}>
              {actionLabel}
            </Button>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
