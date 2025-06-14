import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { List, ListItem, ListItemButton, ListItemText, IconButton, Box, Typography, CircularProgress } from '@mui/material';
import { selectDataset } from '../features/dataset/datasetSlice';
import EditIcon from '@mui/icons-material/Edit';

function Sidebar({ isOpen }) {
  const dispatch = useDispatch();
  const { datasets, activeDatasetId, status, error } = useSelector((state) => state.dataset);

  const handleSelectDataset = (datasetId) => {
    dispatch(selectDataset(datasetId));
  };

  if (status === 'loading') {
    return <CircularProgress />;
  }

  if (status === 'failed') {
    return <Typography color="error">Error fetching datasets: {JSON.stringify(error)}</Typography>;
  }

  return (
    <Box
      sx={{
        width: 250,
        height: '100%',
        position: 'fixed',
        left: isOpen ? 0 : -250,
        top: 0,
        bgcolor: 'background.paper',
        boxShadow: 3,
        transition: 'left 0.3s',
        zIndex: 1200, // Higher than AppBar
        pt: '64px', // To be below the AppBar
      }}
    >
      <List>
        {datasets.map((dataset) => (
          <ListItem
            key={dataset.id}
            disablePadding
            secondaryAction={
              <IconButton edge="end" aria-label="rename">
                <EditIcon />
              </IconButton>
            }
          >
            <ListItemButton
              selected={dataset.id === activeDatasetId}
              onClick={() => handleSelectDataset(dataset.id)}
            >
              <ListItemText primary={dataset.name} />
            </ListItemButton>
          </ListItem>
        ))}
        {datasets.length === 0 && status !== 'loading' && (
          <ListItem>
            <ListItemText primary="No datasets available" />
          </ListItem>
        )}
      </List>
    </Box>
  );
}

export default Sidebar;