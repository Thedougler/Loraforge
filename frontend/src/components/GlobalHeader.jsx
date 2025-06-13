import React from 'react';
import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import DatasetSelector from './DatasetSelector';
import UploadButton from './UploadButton';

function GlobalHeader() {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div">
          LoRAForge
        </Typography>
        <DatasetSelector />
        <Box sx={{ flexGrow: 1 }} />
        <UploadButton />
      </Toolbar>
    </AppBar>
  );
}

export default GlobalHeader;