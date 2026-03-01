import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import { motion } from 'framer-motion';

export default function UserManual() {
  return (
    <Box 
      component={motion.div}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      data-user-manual
      sx={{ mt: 8, mb: 3, maxWidth: { xs: '100%', md: '1577px' }, mx: 'auto' }}
    >
      <Card sx={{ p: 2, boxShadow: 1 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ color: '#2e7d32 !important', mb: 2 }}>
          All Users Manual
        </Typography>
        
        <Box
          sx={{
            width: '100%',
            height: 'calc(100vh - 200px)',
            minHeight: 800,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
            backgroundColor: '#f5f5f5'
          }}
        >
          <iframe
            src="https://www.canva.com/design/DAG4mLsKSmE/view?embed"
            title="Kinaiyahan User Manual"
            style={{
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            allowFullScreen
          />
        </Box>
        
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2, textAlign: 'center' }}>
          If the manual does not load, you can{' '}
          <a 
            href="https://www.canva.com/design/DAG4mLsKSmE/Yef-fNcgOlUnJ_2jW2tDVA/view?utm_content=DAG4mLsKSmE&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=had3ac90a71" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#2e7d32', textDecoration: 'none' }}
          >
            open it in a new tab
          </a>
        </Typography>
      </Card>
    </Box>
  );
}
