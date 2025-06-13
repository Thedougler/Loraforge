import React from 'react';
import { CssBaseline, Box } from '@mui/material';
import GlobalHeader from './components/GlobalHeader';
import PhotoGrid from './components/PhotoGrid';
import UploadModal from './components/UploadModal';

function App() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <CssBaseline />
      <GlobalHeader />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <PhotoGrid />
      </Box>
      <UploadModal />
    </Box>
  );
}

export default App;