
import Stack from '@mui/material/Stack';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';


import ColorModeIconDropdown from '../shared-theme/ColorModeIconDropdown';



export default function Header() {
  return (
    <Stack
      direction="row"
      sx={{
        display: { xs: 'none', md: 'flex' },
        alignItems: { xs: 'flex-start', md: 'center' },
        justifyContent: 'flex-end',
        pt: 1.5,
      }}
      spacing={2}
    >

      <Stack direction="row" sx={{ gap: 1 }}>
       
      
       
        <ColorModeIconDropdown />
      </Stack>
    </Stack>
  );
}
