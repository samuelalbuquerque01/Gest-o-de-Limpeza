import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Avatar,
  Button,
  IconButton,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  CleaningServices,
  Bathroom,
  Kitchen,
  MeetingRoom,
  QrCode as QrCodeIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle,
  PendingActions,
  AccessTime,
  Warning,
  LocationOn,
} from '@mui/icons-material';
import { format } from 'date-fns';

const RoomCard = ({
  room,
  onEdit,
  onDelete,
  onStartCleaning,
  onCompleteCleaning,
  onViewQR,
  showActions = true,
  showStatus = true,
  showProgress = true,
}) => {
  const {
    id,
    name,
    type,
    location,
    status,
    lastCleaned,
    nextCleaning,
    qrCode,
    checklist,
    priority = 'MEDIUM',
    notes,
  } = room;

  const getStatusInfo = (status) => {
    switch (status) {
      case 'cleaned':
      case 'COMPLETED':
        return { color: 'success', icon: <CheckCircle />, label: 'Limpo', progress: 100 };
      case 'in-progress':
      case 'IN_PROGRESS':
        return { color: 'info', icon: <AccessTime />, label: 'Em andamento', progress: 60 };
      case 'pending':
      case 'PENDING':
        return { color: 'warning', icon: <PendingActions />, label: 'Pendente', progress: 0 };
      case 'needs-attention':
      case 'NEEDS_ATTENTION':
        return { color: 'error', icon: <Warning />, label: 'Atenção', progress: 30 };
      default:
        return { color: 'default', icon: null, label: status, progress: 0 };
    }
  };

  const getTypeInfo = (type) => {
    switch (type.toLowerCase()) {
      case 'bathroom':
      case 'banheiro':
        return { icon: <Bathroom />, label: 'Banheiro', color: '#2196f3' };
      case 'kitchen':
      case 'cozinha':
        return { icon: <Kitchen />, label: 'Cozinha', color: '#4caf50' };
      case 'meeting_room':
      case 'meeting':
      case 'sala reunião':
        return { icon: <MeetingRoom />, label: 'Sala Reunião', color: '#9c27b0' };
      default:
        return { icon: <CleaningServices />, label: 'Sala', color: '#1976d2' };
    }
  };

  const getPriorityInfo = (priority) => {
    switch (priority) {
      case 'LOW':
        return { color: 'success', label: 'Baixa' };
      case 'MEDIUM':
        return { color: 'warning', label: 'Média' };
      case 'HIGH':
        return { color: 'error', label: 'Alta' };
      case 'URGENT':
        return { color: 'error', label: 'Urgente' };
      default:
        return { color: 'default', label: priority };
    }
  };

  const calculateChecklistProgress = () => {
    if (!checklist || Object.keys(checklist).length === 0) return 0;
    
    const totalItems = Object.keys(checklist).length;
    const completedItems = Object.values(checklist).filter(item => {
      if (typeof item === 'boolean') return item;
      if (typeof item === 'object') return Object.values(item).some(v => v);
      return false;
    }).length;
    
    return Math.round((completedItems / totalItems) * 100);
  };

  const statusInfo = getStatusInfo(status);
  const typeInfo = getTypeInfo(type);
  const priorityInfo = getPriorityInfo(priority);
  const checklistProgress = calculateChecklistProgress();

  const formatDate = (date) => {
    if (!date) return 'Nunca';
    try {
      return format(new Date(date), 'dd/MM HH:mm');
    } catch {
      return 'Data inválida';
    }
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Cabeçalho */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              {name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" color="textSecondary">
                {location}
              </Typography>
            </Box>
          </Box>
          <Avatar sx={{ bgcolor: typeInfo.color }}>
            {typeInfo.icon}
          </Avatar>
        </Box>

        {/* Status e Prioridade */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {showStatus && (
            <Chip
              label={statusInfo.label}
              size="small"
              color={statusInfo.color}
              icon={statusInfo.icon}
            />
          )}
          <Chip
            label={priorityInfo.label}
            size="small"
            color={priorityInfo.color}
            variant="outlined"
          />
          {qrCode && (
            <Chip
              label={qrCode}
              size="small"
              icon={<QrCodeIcon />}
              variant="outlined"
              onClick={onViewQR ? () => onViewQR(qrCode) : undefined}
            />
          )}
        </Box>

        {/* Progresso do Checklist */}
        {showProgress && checklist && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="textSecondary">
                Checklist
              </Typography>
              <Typography variant="caption" color="textSecondary" fontWeight={600}>
                {checklistProgress}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={checklistProgress} 
              color={checklistProgress === 100 ? "success" : "primary"}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        )}

        {/* Informações */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" color="textSecondary">
            Última limpeza: {formatDate(lastCleaned)}
          </Typography>
          {nextCleaning && (
            <Typography variant="body2" color="textSecondary">
              Próxima: {formatDate(nextCleaning)}
            </Typography>
          )}
        </Box>

        {/* Notas */}
        {notes && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'warning.light', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Observação:</strong> {notes}
            </Typography>
          </Box>
        )}
      </CardContent>

      {/* Ações */}
      {showActions && (
        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2, pt: 0 }}>
          <Box>
            <Tooltip title="QR Code">
              <IconButton size="small" onClick={onViewQR ? () => onViewQR(qrCode) : undefined}>
                <QrCodeIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Editar">
              <IconButton size="small" onClick={onEdit ? () => onEdit(room) : undefined}>
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Excluir">
              <IconButton size="small" onClick={onDelete ? () => onDelete(id) : undefined} color="error">
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Box>
            {status === 'pending' || status === 'PENDING' ? (
              <Button
                size="small"
                variant="contained"
                onClick={onStartCleaning ? () => onStartCleaning(id) : undefined}
              >
                Iniciar
              </Button>
            ) : status === 'in-progress' || status === 'IN_PROGRESS' ? (
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={onCompleteCleaning ? () => onCompleteCleaning(id) : undefined}
              >
                Concluir
              </Button>
            ) : null}
          </Box>
        </CardActions>
      )}
    </Card>
  );
};

export default RoomCard;