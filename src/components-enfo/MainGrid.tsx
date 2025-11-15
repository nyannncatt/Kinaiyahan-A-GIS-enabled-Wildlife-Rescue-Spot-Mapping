import { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import WarningIcon from '@mui/icons-material/Warning';
import { motion } from 'framer-motion';
import WildlifeRescueStatistics from './WildlifeRescueStatistics';
import ProfileSection from './ProfileSection';
import AnalyticsSection from './AnalyticsSection';
import MapSection from './MapSection';
import { MapNavigationProvider } from '../context/MapNavigationContext';
import { getWildlifeRecords } from '../services/wildlifeRecords';
import { supabase } from '../services/supabase';

interface MainGridProps {
  onModalOpenChange?: (isOpen: boolean) => void;
  environmentalBg?: boolean;
  onDispersalModeChange?: (isActive: boolean) => void;
  onRelocationModeChange?: (isActive: boolean) => void;
}

export default function MainGrid({ onModalOpenChange, environmentalBg, onDispersalModeChange, onRelocationModeChange }: MainGridProps) {
  
  // State for wildlife records for analytics
  const [wildlifeRecords, setWildlifeRecords] = useState<any[]>([]);
  
  // Fetch wildlife records for analytics
  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const records = await getWildlifeRecords();
        setWildlifeRecords(records);
      } catch (error) {
        console.error('Error fetching wildlife records for analytics:', error);
      }
    };
    
    fetchRecords();
  }, []);

  // Compute analytics data
  const approvedRecords = wildlifeRecords.filter(r => r.approval_status === 'approved' || r.user_id !== null);
  
  // State for pending reports
  const [pendingCount, setPendingCount] = useState(0);
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const previousPendingCountRef = useRef(0);
  const isInitialLoadRef = useRef(true);
  const [newReportModalOpen, setNewReportModalOpen] = useState(false);
  
  // Audio context and initialization
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef(false);

  // Check if audio was already unlocked (from login page)
  useEffect(() => {
    const checkAudioUnlock = async () => {
      try {
        const { getAudioContext, isAudioUnlocked } = await import('../utils/audioUnlock');
        
        if (isAudioUnlocked()) {
          // Audio was already unlocked on login page
          const ctx = getAudioContext();
          if (ctx) {
            audioContextRef.current = ctx;
            audioUnlockedRef.current = true;
            console.log('Audio already unlocked from login - ready for notifications');
          }
        } else {
          // Fallback: unlock on first interaction in dashboard
          const unlockAudio = async () => {
            if (audioUnlockedRef.current) return;
            
            try {
              const { unlockAudio: unlock } = await import('../utils/audioUnlock');
              unlock();
              const ctx = getAudioContext();
              if (ctx) {
                audioContextRef.current = ctx;
                audioUnlockedRef.current = true;
              }
            } catch (error) {
              console.error('Error unlocking audio:', error);
            }
          };

          // Unlock on any user interaction (fallback)
          const events = ['click', 'touchstart', 'keydown', 'mousedown'];
          events.forEach(event => {
            document.addEventListener(event, unlockAudio, { once: true, passive: true });
          });

          return () => {
            events.forEach(event => {
              document.removeEventListener(event, unlockAudio);
            });
          };
        }
      } catch (error) {
        console.error('Error checking audio unlock:', error);
      }
    };

    checkAudioUnlock();
  }, []);

  // Function to play siren/alarm sound
  const playSirenSound = async () => {
    try {
      const { getAudioContext, isAudioUnlocked } = await import('../utils/audioUnlock');
      
      if (!isAudioUnlocked() && !audioUnlockedRef.current) {
        console.warn('Audio not unlocked yet - sound will play after first user interaction');
        return;
      }

      let audioContext = audioContextRef.current || getAudioContext();
      if (!audioContext) {
        // Fallback: create new context if needed
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
      }
      
      // Resume context if suspended (browser may suspend it)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Siren effect: oscillating frequency
      const startTime = audioContext.currentTime;
      const duration = 2; // 2 seconds for more noticeable sound
      
      oscillator.type = 'sine';
      
      // Create siren effect by oscillating frequency (more cycles)
      for (let i = 0; i < 8; i++) {
        const time = startTime + (i * duration / 8);
        oscillator.frequency.setValueAtTime(800, time);
        oscillator.frequency.setValueAtTime(1200, time + 0.1);
        oscillator.frequency.setValueAtTime(800, time + 0.2);
      }
      
      // Volume envelope
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0.4, startTime + duration - 0.1);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    } catch (error) {
      console.error('Error playing siren sound:', error);
    }
  };

  // Load pending reports count with real-time updates
  useEffect(() => {
    const loadPendingCount = async () => {
      try {
        const records = await getWildlifeRecords();
        const pendingRecords = records.filter(record => 
          record.approval_status === 'pending' && record.user_id === null
        );
        const newCount = pendingRecords.length;
        const previousCount = previousPendingCountRef.current;
        
        // Check if count increased (new report added) - but not on initial load
        if (!isInitialLoadRef.current && previousCount > 0 && newCount > previousCount) {
          // New pending report detected - play siren sound and show modal
          playSirenSound();
          setNewReportModalOpen(true);
        }
        
        setPendingCount(newCount);
        previousPendingCountRef.current = newCount;
        isInitialLoadRef.current = false;
      } catch (error) {
        console.error('Error loading pending count:', error);
      }
    };

    // Load initial count (don't play sound on initial load)
    loadPendingCount();

    // Set up real-time subscription for wildlife_records table
    // Listen to all INSERT events (no filter - filter in code for better reliability)
    const channel = supabase
      .channel('wildlife-records-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Only listen to INSERT events (new records)
          schema: 'public',
          table: 'wildlife_records'
        },
        (payload) => {
          console.log('Real-time event received:', payload);
          // Check if it's a pending report with no user_id (public report)
          const newRecord = payload.new as any;
          if (newRecord && newRecord.approval_status === 'pending' && newRecord.user_id === null) {
            console.log('New pending report detected! Playing siren...');
            // New pending report detected - play siren sound immediately and show modal
            playSirenSound();
            setNewReportModalOpen(true);
            // Reload count
            loadPendingCount();
          }
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    // Fallback: Refresh every 3 seconds as backup (in case real-time fails)
    const interval = setInterval(loadPendingCount, 3000);

    return () => {
      // Cleanup: unsubscribe from real-time and clear interval
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  // Function to scroll to record list section
  const scrollToRecordList = () => {
    setShowPendingOnly(false); // Reset filter
    const recordListElement = document.querySelector('[data-record-list]');
    if (recordListElement) {
      recordListElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    } else {
      // Fallback: scroll to bottom of page
      window.scrollTo({ 
        top: document.body.scrollHeight, 
        behavior: 'smooth' 
      });
    }
  };

  // Function to scroll to record list and show only pending reports
  const scrollToPendingReports = () => {
    setShowPendingOnly(true); // Set filter to show only pending
    const recordListElement = document.querySelector('[data-record-list]');
    if (recordListElement) {
      recordListElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    } else {
      // Fallback: scroll to bottom of page
      window.scrollTo({ 
        top: document.body.scrollHeight, 
        behavior: 'smooth' 
      });
    }
  };

  // Function to scroll back to map section
  const scrollToMap = () => {
    const mapElement = document.querySelector('[data-map-container]');
    if (mapElement) {
      mapElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    } else {
      // Fallback: scroll to top of page
      window.scrollTo({ 
        top: 0, 
        behavior: 'smooth' 
      });
    }
  };

  return (
    <MapNavigationProvider>
      <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
        {/* Map Section */}
        <MapSection 
          pendingCount={pendingCount}
          onScrollToRecordList={scrollToRecordList}
          onScrollToPendingReports={scrollToPendingReports}
          onModalOpenChange={onModalOpenChange}
          environmentalBg={environmentalBg}
          onDispersalModeChange={onDispersalModeChange}
          onRelocationModeChange={onRelocationModeChange}
        />
      
        {/* Wildlife Rescue Statistics Component */}
        <Box 
          component={motion.div}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          data-record-list sx={{ mt: 3, mb: 8 }}>
          <WildlifeRescueStatistics {...(showPendingOnly && { showPendingOnly })} environmentalBg={environmentalBg} />
        </Box>

        {/* Analytics Section */}
        <AnalyticsSection wildlifeRecords={wildlifeRecords} approvedRecords={approvedRecords} />

        {/* Profile Section */}
        <ProfileSection />
      </Box>

      {/* New Report Notification Modal */}
      <Dialog
        open={newReportModalOpen}
        onClose={() => setNewReportModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: environmentalBg
              ? 'linear-gradient(135deg, #ffffff 0%, #e8f5e8 50%, #4caf50 100%)'
              : '#ffffff',
            backgroundRepeat: environmentalBg ? 'no-repeat' : undefined,
            backgroundSize: environmentalBg ? '100% 100%' : undefined,
            backgroundAttachment: environmentalBg ? 'fixed' : undefined,
            border: '2px solid rgba(76, 175, 80, 0.4)',
            boxShadow: '0 8px 32px rgba(76, 175, 80, 0.3)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 2, textAlign: 'center' }}>
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" sx={{ mb: 2 }}>
            <Box
              component="img"
              src="/images/kinaiyahanlogonobg.png"
              alt="Kinaiyahan"
              sx={{ width: 56, height: 56, objectFit: 'contain' }}
            />
            <Typography
              component="p"
              variant="h5"
              sx={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 800,
                letterSpacing: '0.3em',
                color: '#2e7d32 !important',
                userSelect: 'none',
                lineHeight: 1,
                margin: 0,
              }}
            >
              ＫＩＮＡＩＹＡＨＡＮ
            </Typography>
          </Stack>
          <Typography component="p" variant="h6" sx={{ fontWeight: 600, color: '#2e7d32 !important', margin: 0 }}>
            New Report Arrived!
          </Typography>
          <Typography component="p" variant="body2" sx={{ mt: 0.5, color: '#2e7d32 !important', margin: 0 }}>
            A new wildlife report has been submitted and is now pending review.
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 1, textAlign: 'center' }}>
          <Box
            component={motion.div}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1.2, 1],
              opacity: [0, 1, 1]
            }}
            transition={{ 
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1]
            }}
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              mb: 3,
              mt: 1
            }}
          >
            <Box
              component={motion.div}
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, -5, 5, -5, 5, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'rgba(244, 67, 54, 0.1)',
                border: '3px solid rgba(244, 67, 54, 0.3)',
              }}
            >
              <WarningIcon 
                sx={{ 
                  fontSize: 48, 
                  color: '#f44336',
                  filter: 'drop-shadow(0 2px 4px rgba(244, 67, 54, 0.3))'
                }} 
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2, justifyContent: 'center', gap: 2 }}>
          <Button 
            onClick={() => {
              setNewReportModalOpen(false);
              scrollToPendingReports();
            }} 
            variant="outlined"
            sx={{
              borderColor: '#4caf50',
              color: '#1b5e20',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                borderColor: '#2e7d32',
                bgcolor: 'rgba(76, 175, 80, 0.1)',
              }
            }}
          >
            View Pending Reports
          </Button>
          <Button 
            onClick={() => setNewReportModalOpen(false)} 
            variant="outlined"
            sx={{
              borderColor: '#4caf50',
              color: '#1b5e20',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#2e7d32',
                bgcolor: 'rgba(76, 175, 80, 0.1)',
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </MapNavigationProvider>
  );
}
