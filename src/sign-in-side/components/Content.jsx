import * as React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PetsRoundedIcon from '@mui/icons-material/PetsRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import ArrowCircleRightRoundedIcon from '@mui/icons-material/ArrowCircleRightRounded';


const items = [
  {
    icon: <ArrowCircleRightRoundedIcon sx={{ color: 'text.secondary' }} />,
    title: 'Unified Login, Role-Based Access',
    description:
       'Sign in once, and you’ll be directed to the correct site based on your role.',
  },
  {
    icon: <PetsRoundedIcon sx={{ color: 'text.secondary' }} />,
    title: 'Wildlife Rescue Management',
    description:
      'Empowers CENRO to efficiently track, document, and monitor rescued animals using GIS technology.',
  },
  {
    icon: <MapRoundedIcon sx={{ color: 'text.secondary' }} />,
    title: 'GIS Mapping',
    description:
      'Integrates GIS for precise location tracking and visualization of rescue operations.',
  },
  {
    icon: <SupportAgentRoundedIcon sx={{ color: 'text.secondary' }} />,
    title: 'Citizen Rescue Requests',
    description:
      'Offers an intuitive form for the public to report wildlife emergencies and request assistance.',
  },
];

export default function Content() {
  return (
    <Stack
      sx={{
        flexDirection: 'column',
        alignSelf: 'center',
        gap: 4,
        maxWidth: 450,
      }}
    >
      <Box sx={{ display: { xs: 'none', md: 'flex' } }} />
      {items.map((item, index) => (
        <Stack key={index} direction="column" sx={{ gap: 1 }}>
       
          <Stack direction="row" alignItems="center" sx={{ gap: 1 }}>
            {item.icon}
            <Typography sx={{ fontWeight: 'medium' }}>
              {item.title}
            </Typography>
          </Stack>
         
          <Typography variant="body2" sx={{ color: 'text.secondary', pl: 4 }}>
            {item.description}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}
