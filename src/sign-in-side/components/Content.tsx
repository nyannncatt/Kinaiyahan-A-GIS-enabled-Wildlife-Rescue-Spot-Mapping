
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import SettingsSuggestRoundedIcon from '@mui/icons-material/SettingsSuggestRounded';
import ThumbUpAltRoundedIcon from '@mui/icons-material/ThumbUpAltRounded';


const items = [
  {
    icon: <SettingsSuggestRoundedIcon sx={{ color: 'text.secondary' }} />,
    title: 'Unified Login, Role-Based Access',
    description:
      'Wildlife Rescue Management • GIS Mapping • Citizen Rescue Requests',
  },
  {
    icon: <ConstructionRoundedIcon sx={{ color: 'text.secondary' }} />,
    title: 'Built to last',
    description:
      'Experience unmatched durability that goes above and beyond with lasting investment.',
  },
  {
    icon: <ThumbUpAltRoundedIcon sx={{ color: 'text.secondary' }} />,
    title: 'Great user experience',
    description:
      'Integrate our product into your routine with an intuitive and easy-to-use interface.',
  },
  {
    icon: <AutoFixHighRoundedIcon sx={{ color: 'text.secondary' }} />,
    title: 'Innovative functionality',
    description:
      'Stay ahead with features that set new standards, addressing your evolving needs better than the rest.',
  },
];

export default function Content() {
  return (
    <Stack
      sx={{ flexDirection: 'column', alignSelf: 'center', gap: 4, maxWidth: 450 }}
    >
      <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
      
      </Box>
      {items.map((item, index) => (
        <Stack key={index} direction="row" sx={{ gap: 2 }}>
          {item.icon}
          <div>
            <Typography gutterBottom sx={{ fontWeight: 'medium', color: index === 0 ? '#4caf50' : '#000000', transition: 'all 0.5s ease' }}>
              {item.title}
            </Typography>
            <Typography variant="body2" sx={{ color: index === 0 ? '#4caf50' : '#000000', transition: 'all 0.5s ease' }}>
              {item.description}
            </Typography>
          </div>
        </Stack>
      ))}
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" sx={{ color: '#000000', textAlign: 'left' }}>
          Calanawan, Tankulan, Manolo Fortich, Bukidnon
        </Typography>
        <Typography variant="body2" sx={{ color: '#000000', textAlign: 'left' }}>
          E-mail: cenromanolofortich@denr.gov.ph | Tel/Mobile No.: 0917-522-8580
        </Typography>
      </Box>
    </Stack>
  );
}
