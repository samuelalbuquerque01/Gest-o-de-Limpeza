const { format, parseISO, isValid, differenceInMinutes } = require('date-fns');
const { ptBR } = require('date-fns/locale');

function formatDate(date, formatString = 'dd/MM/yyyy') {
  if (!date) return '-';
  
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(parsedDate)) return '-';
  
  return format(parsedDate, formatString, { locale: ptBR });
}

function formatDateTime(date, formatString = 'dd/MM/yyyy HH:mm') {
  return formatDate(date, formatString);
}

function formatTime(date) {
  return formatDate(date, 'HH:mm');
}

function calculateDuration(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  
  if (!isValid(start) || !isValid(end)) return 0;
  
  return differenceInMinutes(end, start);
}

function formatDuration(minutes) {
  if (!minutes) return '0 min';
  
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}min`;
}

function getInitials(name) {
  if (!name || typeof name !== 'string') return '?';
  
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatPhone(phone) {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
}

function getChecklistProgress(checklist) {
  if (!checklist || typeof checklist !== 'object') return 0;
  
  const items = Object.values(checklist);
  if (items.length === 0) return 0;
  
  const completedItems = items.filter(item => {
    if (typeof item === 'boolean') return item;
    if (typeof item === 'object') return Object.values(item).some(v => v);
    return false;
  }).length;
  
  return Math.round((completedItems / items.length) * 100);
}

function generateQRCodeData(prefix, id, timestamp = Date.now()) {
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}:${id}:${timestamp}:${random}`;
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

module.exports = {
  formatDate,
  formatDateTime,
  formatTime,
  calculateDuration,
  formatDuration,
  getInitials,
  formatPhone,
  getChecklistProgress,
  generateQRCodeData,
  isValidEmail,
  sanitizeInput
};