import React from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useDispatch } from 'react-redux';
import { toggleSidebar } from '../features/dataset/datasetSlice';
import UploadButton from './UploadButton';

function GlobalHeader() {
  const dispatch = useDispatch();

  return (
    <AppBar position="static" sx={{ zIndex: 1201 }}>
      <Toolbar>
        <IconButton
          size="large"
          edge="start"
          color="inherit"
          aria-label="menu"
          sx={{ mr: 2 }}
          onClick={() => dispatch(toggleSidebar())}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" component="div">
          LoRAForge
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <UploadButton />
      </Toolbar>
    </AppBar>
  );
}

export default GlobalHeader;