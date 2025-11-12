import * as React from 'react';
import { useEffect, useState } from 'react';
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
    title: 'Unified Login, Role-Based Access Wildlife Rescue Management  GIS Mapping  Citizen Rescue Requests',
    description:
      '',
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
  const [visibleCount, setVisibleCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Fade-in sequentially
  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev >= items.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 200); // fade in every 0.5s
    return () => clearInterval(interval);
  }, []);

  // Highlight/pulse effect
  useEffect(() => {
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % items.length);
      }, 1000);
      return () => clearInterval(interval);
    }, 1500);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <Stack
      sx={{
        flexDirection: 'column',
        alignSelf: 'center',
        gap: 4,
        maxWidth: 450,
      }}
    >
      {items.map((item, index) => (
        <Stack
          key={index}
          direction="column"
          sx={{
            gap: 1,
            opacity: index < visibleCount ? 1 : 0,
            transition: 'opacity 0.6s ease-in',
          }}
        >
          <Stack direction="row" alignItems="center" sx={{ gap: 1 }}>
            {item.icon}
            <Typography
              sx={{
                fontWeight: 'medium',
                transition: 'all 0.5s ease',
                color: index === activeIndex ? '#4caf50' : '#000000',
              }}
            >
              {item.title}
            </Typography>
          </Stack>
          {item.description ? (
            <Typography
              variant="body2"
              sx={{
                color: index === activeIndex ? '#4caf50' : '#000000',
                pl: 4,
                transition: 'all 0.5s ease',
              }}
            >
              {item.description}
            </Typography>
          ) : null}
        </Stack>
      ))}
    </Stack>
  );
}
