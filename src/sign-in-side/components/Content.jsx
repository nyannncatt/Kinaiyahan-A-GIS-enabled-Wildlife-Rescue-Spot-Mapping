import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PetsRoundedIcon from '@mui/icons-material/PetsRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';

const items = [
  {
    icon: <PetsRoundedIcon sx={{ color: 'text.secondary' }} />,
    title: 'Wildlife Rescue Management',
    description:
      'Empowers CENRO to efficiently track, document, and monitor rescued animals using GIS technology.',
  },
  {
    icon: <MapRoundedIcon sx={{ color: 'text.secondary' }} />,
    title: 'Geospatial Mapping',
    description:
      'Integrates GIS for precise location tracking and visualization of rescue operations.',
  },
  {
    icon: <AssignmentRoundedIcon sx={{ color: 'text.secondary' }} />,
    title: 'Comprehensive Rescue Records',
    description:
      'Stores detailed data for each rescue, supporting analysis and informed decision-making.',
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
