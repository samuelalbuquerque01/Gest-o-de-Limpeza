// Constantes do sistema

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  CLEANER: 'CLEANER',
};

export const ROOM_TYPES = {
  ROOM: 'ROOM',
  BATHROOM: 'BATHROOM',
  KITCHEN: 'KITCHEN',
  MEETING_ROOM: 'MEETING_ROOM',
  COMMON_AREA: 'COMMON_AREA',
};

export const ROOM_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  NEEDS_ATTENTION: 'NEEDS_ATTENTION',
};

export const CLEANING_STATUS = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export const PRIORITY_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
};

export const CHECKLIST_ITEMS = {
  BATHROOM: {
    SUPPLY: ['soap', 'toilet_paper', 'paper_towel'],
    CLEANING: ['faucet', 'sink', 'toilet', 'trash_can', 'trash', 'floor', 'mirror', 'doors'],
  },
  ROOM: {
    CLEANING: ['floor', 'furniture', 'trash', 'alcohol', 'security'],
  },
  KITCHEN: {
    CLEANING: ['counter', 'sink', 'appliances', 'trash', 'floor', 'supplies'],
  },
};

export const NOTIFICATION_TYPES = {
  CLEANING_COMPLETED: 'CLEANING_COMPLETED',
  ROOM_NEEDS_ATTENTION: 'ROOM_NEEDS_ATTENTION',
  NEW_ASSIGNMENT: 'NEW_ASSIGNMENT',
  SYSTEM_ALERT: 'SYSTEM_ALERT',
};

// Cores para cada status
export const STATUS_COLORS = {
  PENDING: '#ff9800',
  IN_PROGRESS: '#2196f3',
  COMPLETED: '#4caf50',
  NEEDS_ATTENTION: '#f44336',
  SCHEDULED: '#9c27b0',
  CANCELLED: '#757575',
};

// Cores para prioridades
export const PRIORITY_COLORS = {
  LOW: '#4caf50',
  MEDIUM: '#ff9800',
  HIGH: '#f44336',
  URGENT: '#d32f2f',
};

// Horários padrão para limpeza
export const CLEANING_SCHEDULE = {
  MORNING_START: '08:00',
  MORNING_END: '12:00',
  AFTERNOON_START: '13:00',
  AFTERNOON_END: '18:00',
};