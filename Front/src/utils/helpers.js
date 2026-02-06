// Funções utilitárias

import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata uma data para exibição
 */
export const formatDate = (date, formatString = 'dd/MM/yyyy') => {
  if (!date) return '-';
  
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(parsedDate)) return '-';
  
  return format(parsedDate, formatString, { locale: ptBR });
};

/**
 * Formata data e hora
 */
export const formatDateTime = (date, formatString = 'dd/MM/yyyy HH:mm') => {
  return formatDate(date, formatString);
};

/**
 * Formata apenas a hora
 */
export const formatTime = (date) => {
  return formatDate(date, 'HH:mm');
};

/**
 * Calcula a diferença em minutos entre duas datas
 */
export const getDurationInMinutes = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  
  if (!isValid(start) || !isValid(end)) return 0;
  
  const diffInMs = end.getTime() - start.getTime();
  return Math.floor(diffInMs / 60000); // Converter para minutos
};

/**
 * Formata a duração em formato legível
 */
export const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}min`;
};

/**
 * Obtém informações do status
 */
export const getStatusInfo = (status) => {
  const statusConfig = {
    PENDING: { color: 'warning', label: 'Pendente', icon: '⏳' },
    IN_PROGRESS: { color: 'info', label: 'Em Andamento', icon: '🔄' },
    COMPLETED: { color: 'success', label: 'Concluído', icon: '✅' },
    NEEDS_ATTENTION: { color: 'error', label: 'Atenção', icon: '⚠️' },
    SCHEDULED: { color: 'secondary', label: 'Agendado', icon: '📅' },
    CANCELLED: { color: 'default', label: 'Cancelado', icon: '❌' },
  };

  return statusConfig[status] || { color: 'default', label: status, icon: '' };
};

/**
 * Obtém informações do tipo de ambiente
 */
export const getRoomTypeInfo = (type) => {
  const typeConfig = {
    ROOM: { label: 'Sala', icon: '🏢', color: '#1976d2' },
    BATHROOM: { label: 'Banheiro', icon: '🚻', color: '#2196f3' },
    KITCHEN: { label: 'Cozinha', icon: '🍴', color: '#4caf50' },
    MEETING_ROOM: { label: 'Sala Reunião', icon: '👥', color: '#9c27b0' },
    COMMON_AREA: { label: 'Área Comum', icon: '🏘️', color: '#ff9800' },
  };

  return typeConfig[type] || { label: type, icon: '🏠', color: '#757575' };
};

/**
 * Obtém informações da prioridade
 */
export const getPriorityInfo = (priority) => {
  const priorityConfig = {
    LOW: { color: 'success', label: 'Baixa', icon: '⬇️' },
    MEDIUM: { color: 'warning', label: 'Média', icon: '➡️' },
    HIGH: { color: 'error', label: 'Alta', icon: '⬆️' },
    URGENT: { color: 'error', label: 'Urgente', icon: '🚨' },
  };

  return priorityConfig[priority] || { color: 'default', label: priority, icon: '' };
};

/**
 * Valida email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Gera iniciais do nome
 */
export const getInitials = (name) => {
  if (!name) return '?';
  
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Formata número para telefone
 */
export const formatPhone = (phone) => {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
};

/**
 * Calcula percentual de conclusão do checklist
 */
export const getChecklistProgress = (checklist) => {
  if (!checklist || Object.keys(checklist).length === 0) return 0;
  
  const totalItems = Object.keys(checklist).length;
  const completedItems = Object.values(checklist).filter(item => {
    if (typeof item === 'boolean') return item;
    if (typeof item === 'object') return Object.values(item).some(v => v);
    return false;
  }).length;
  
  return Math.round((completedItems / totalItems) * 100);
};
