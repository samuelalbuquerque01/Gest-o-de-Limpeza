import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

const StatCard = ({ 
  title, 
  value, 
  icon, 
  color = '#1976d2', 
  subtitle, 
  trend, 
  trendValue,
  onClick,
  loading = false,
}) => {
  const handleClick = () => {
    if (onClick && !loading) {
      onClick();
    }
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': onClick ? { 
          transform: 'translateY(-4px)',
          boxShadow: 4 
        } : {},
        opacity: loading ? 0.7 : 1,
      }}
      onClick={handleClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography color="textSecondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            
            <Typography variant="h3" component="div" sx={{ fontWeight: 700, color, mb: 1 }}>
              {loading ? '...' : value}
            </Typography>
            
            {subtitle && (
              <Typography variant="body2" color="textSecondary">
                {loading ? 'Carregando...' : subtitle}
              </Typography>
            )}
            
            {trend && trendValue && !loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {trend === 'up' ? (
                  <TrendingUp sx={{ fontSize: 16, color: '#4caf50', mr: 0.5 }} />
                ) : (
                  <TrendingDown sx={{ fontSize: 16, color: '#f44336', mr: 0.5 }} />
                )}
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: trend === 'up' ? '#4caf50' : '#f44336',
                    fontWeight: 600 
                  }}
                >
                  {trendValue}%
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ ml: 0.5 }}>
                  vs período anterior
                </Typography>
              </Box>
            )}
          </Box>
          
          {icon && !loading && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: color + '10',
              color: color,
              fontSize: 24,
            }}>
              {icon}
            </Box>
          )}
          
          {loading && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 48,
              height: 48,
            }}>
              <Box 
                sx={{ 
                  width: 24, 
                  height: 24, 
                  borderRadius: '50%', 
                  border: `2px solid ${color}20`,
                  borderTopColor: color,
                  animation: 'spin 1s linear infinite',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  }
                }}
              />
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;