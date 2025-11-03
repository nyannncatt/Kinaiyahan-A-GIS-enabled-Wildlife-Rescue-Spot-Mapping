import React from 'react';
import { Box, List, ListItem, ListItemButton, ListItemText, Typography } from '@mui/material';

export default function AdminMenuContent() {
  const tabs = [
    { id: 'tab1', label: 'Tab 1' },
    { id: 'tab2', label: 'Tab 2' },
    { id: 'tab3', label: 'Tab 3' },
    { id: 'tab4', label: 'Tab 4' },
  ];

  return (
    <Box sx={{ overflow: 'auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2, textAlign: 'center', p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Admin Menu</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '12px' }}>Navigation</Typography>
      </Box>

      <Box sx={{ px: 2 }}>
        <List dense>
          {tabs.map((t) => (
            <ListItem key={t.id} disablePadding>
              <ListItemButton>
                <ListItemText primary={t.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Box>
  );
}


