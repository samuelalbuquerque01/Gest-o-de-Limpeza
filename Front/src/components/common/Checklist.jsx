import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Grid,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  CleaningServices,
  Bathroom,
  Kitchen,
  MeetingRoom,
  Refresh,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';

const Checklist = ({
  items = [],
  category = 'default',
  title = 'Checklist de Limpeza',
  showProgress = true,
  showCategoryIcons = true,
  collapsible = false,
  defaultExpanded = true,
  onChange,
  initialChecked = {},
}) => {
  const [checkedItems, setCheckedItems] = useState({});
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Inicializar checkedItems
  useEffect(() => {
    if (initialChecked && Object.keys(initialChecked).length > 0) {
      setCheckedItems(initialChecked);
    } else {
      const initial = {};
      items.forEach(item => {
        initial[item.id] = false;
      });
      setCheckedItems(initial);
    }
  }, [items, initialChecked]);

  const handleCheck = (itemId) => {
    const newCheckedItems = {
      ...checkedItems,
      [itemId]: !checkedItems[itemId],
    };
    setCheckedItems(newCheckedItems);
    
    if (onChange) {
      onChange(newCheckedItems);
    }
  };

  const handleCheckAll = (check) => {
    const newCheckedItems = {};
    items.forEach(item => {
      newCheckedItems[item.id] = check;
    });
    setCheckedItems(newCheckedItems);
    
    if (onChange) {
      onChange(newCheckedItems);
    }
  };

  const handleReset = () => {
    const newCheckedItems = {};
    items.forEach(item => {
      newCheckedItems[item.id] = false;
    });
    setCheckedItems(newCheckedItems);
    
    if (onChange) {
      onChange(newCheckedItems);
    }
  };

  // Calcular progresso
  const totalItems = items.length;
  const completedItems = Object.values(checkedItems).filter(v => v).length;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Obter ícone da categoria
  const getCategoryIcon = () => {
    switch (category.toLowerCase()) {
      case 'bathroom':
      case 'banheiro':
        return <Bathroom />;
      case 'kitchen':
      case 'cozinha':
        return <Kitchen />;
      case 'meeting':
      case 'reunião':
        return <MeetingRoom />;
      default:
        return <CleaningServices />;
    }
  };

  // Obter cor da categoria
  const getCategoryColor = () => {
    switch (category.toLowerCase()) {
      case 'bathroom':
      case 'banheiro':
        return '#2196f3';
      case 'kitchen':
      case 'cozinha':
        return '#4caf50';
      case 'meeting':
      case 'reunião':
        return '#9c27b0';
      default:
        return '#1976d2';
    }
  };

  // Agrupar itens por subcategoria se existir
  const groupedItems = items.reduce((groups, item) => {
    const group = item.subcategory || 'geral';
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(item);
    return groups;
  }, {});

  const header = (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      mb: 2,
      p: collapsible ? 1 : 0,
      cursor: collapsible ? 'pointer' : 'default',
    }}
    onClick={() => collapsible && setExpanded(!expanded)}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {showCategoryIcons && (
          <Box sx={{ color: getCategoryColor() }}>
            {getCategoryIcon()}
          </Box>
        )}
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Chip 
          label={`${completedItems}/${totalItems}`}
          size="small"
          color={progress === 100 ? "success" : "primary"}
          variant="outlined"
        />
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {collapsible && (
          <IconButton size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        )}
        <Tooltip title="Marcar todos">
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              handleCheckAll(true);
            }}
          >
            <CheckCircle />
          </IconButton>
        </Tooltip>
        <Tooltip title="Resetar">
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              handleReset();
            }}
          >
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  const progressBar = showProgress && (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" color="textSecondary">
          Progresso
        </Typography>
        <Typography variant="caption" color="textSecondary" fontWeight={600}>
          {progress}%
        </Typography>
      </Box>
      <LinearProgress 
        variant="determinate" 
        value={progress} 
        sx={{ 
          height: 8, 
          borderRadius: 4,
          backgroundColor: '#e0e0e0',
          '& .MuiLinearProgress-bar': {
            borderRadius: 4,
            backgroundColor: progress === 100 ? '#4caf50' : getCategoryColor(),
          }
        }}
      />
    </Box>
  );

  const checklistContent = (
    <>
      {progressBar}
      
      <FormGroup>
        {Object.keys(groupedItems).map((group, groupIndex) => {
          const groupItems = groupedItems[group];
          const groupCompleted = groupItems.filter(item => checkedItems[item.id]).length;
          const groupTotal = groupItems.length;
          
          return (
            <Box key={group} sx={{ mb: groupIndex < Object.keys(groupedItems).length - 1 ? 2 : 0 }}>
              {group !== 'geral' && (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" color="textSecondary" sx={{ textTransform: 'capitalize' }}>
                      {group}
                    </Typography>
                    <Chip 
                      label={`${groupCompleted}/${groupTotal}`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  <Divider sx={{ mb: 1 }} />
                </>
              )}
              
              <Grid container spacing={1}>
                {groupItems.map((item) => (
                  <Grid item xs={12} sm={6} key={item.id}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={checkedItems[item.id] || false}
                          onChange={() => handleCheck(item.id)}
                          color="primary"
                          size="small"
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body2">
                            {item.label}
                          </Typography>
                          {item.required && (
                            <Typography variant="caption" color="error" sx={{ ml: 0.5 }}>
                              *
                            </Typography>
                          )}
                        </Box>
                      }
                      sx={{
                        '& .MuiFormControlLabel-label': {
                          fontSize: '0.875rem',
                        }
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          );
        })}
      </FormGroup>
    </>
  );

  return (
    <Paper 
      sx={{ 
        p: 2, 
        borderRadius: 2,
        border: `1px solid ${getCategoryColor()}20`,
        backgroundColor: '#fafafa',
      }}
    >
      {header}
      
      {(!collapsible || expanded) && checklistContent}
      
      {totalItems === 0 && (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <CleaningServices sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body1" color="textSecondary">
            Nenhum item no checklist
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Adicione itens para criar um checklist
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default Checklist;