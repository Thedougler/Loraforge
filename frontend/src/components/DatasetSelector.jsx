import React, { useEffect, useState } from 'react';
import { FormControl, InputLabel, Select, MenuItem, Box, CircularProgress, Typography, IconButton, TextField } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import { useSelector, useDispatch } from 'react-redux';
import { fetchDatasets, selectDataset } from '../features/dataset/datasetSlice';

function DatasetSelector() {
  const dispatch = useDispatch();
  const { datasets, activeDatasetId, status, error } = useSelector((state) => state.dataset);
  const selectedDataset = datasets.find(d => d.id === activeDatasetId);

  const [editingDatasetId, setEditingDatasetId] = useState(null);
  const [newDatasetName, setNewDatasetName] = useState('');


  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchDatasets());
    }
  }, [status, dispatch]);

  const handleChange = (event) => {
    const newDatasetId = event.target.value;
    if (newDatasetId) {
      dispatch(selectDataset(newDatasetId));
    }
  };

  if (status === 'loading') {
    return <CircularProgress />;
  }

  const handleEditClick = (event, dataset) => {
    event.stopPropagation(); // Stop the MenuItem from closing the select
    setEditingDatasetId(dataset.id);
    setNewDatasetName(dataset.name);
  };

  const handleConfirmClick = (event, datasetId) => {
    event.stopPropagation(); // Stop the MenuItem from closing the select
    // In this task, we don't actually persist the rename.
    // We just exit the editing mode.
    console.log(`Confirmed rename for dataset ID ${datasetId} to "${newDatasetName}"`);
    setEditingDatasetId(null);
    setNewDatasetName('');
  };

  const handleInputChange = (event) => {
    setNewDatasetName(event.target.value);
  };

  if (status === 'failed') {
    return <Typography color="error">Error fetching datasets: {JSON.stringify(error)}</Typography>;
  }

  return (
    <Box sx={{ minWidth: 180 }}>
      <FormControl fullWidth size="small" variant="outlined">
        <InputLabel id="dataset-select-label">Dataset</InputLabel>
        <Select
          labelId="dataset-select-label"
          id="dataset-select"
          value={selectedDataset?.id || ''}
          label="Dataset"
          onChange={handleChange}
          disabled={status === 'loading'}
        >
          {datasets.map((dataset) => (
            <MenuItem key={dataset.id} value={dataset.id}
             // Disable the menu item's normal click behavior if we are editing
            onClick={editingDatasetId === dataset.id ? (e) => e.stopPropagation() : undefined}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                {editingDatasetId === dataset.id ? (
                  <TextField
                    variant="standard"
                    value={newDatasetName}
                    onChange={handleInputChange}
                    onClick={(e) => e.stopPropagation()} // Prevent select from closing when clicking input
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleConfirmClick(e, dataset.id);
                      }
                    }}
                    InputProps={{
                      disableUnderline: true, // Remove underline
                    }}
                    sx={{ flexGrow: 1 }}
                    inputProps={{
                      'aria-label': `rename dataset ${dataset.name}`, // ARIA label for testing
                    }}
                  />
                ) : (
                  <Typography sx={{ flexGrow: 1 }}>{dataset.name}</Typography>
                )}

                {editingDatasetId === dataset.id ? (
                  <IconButton
                    edge="end"
                    aria-label="confirm rename"
                    onClick={(event) => handleConfirmClick(event, dataset.id)}
                    size="small"
                  >
                    <CheckIcon />
                  </IconButton>
                ) : (
                  <IconButton
                    edge="end"
                    aria-label={`rename dataset ${dataset.name}`}
                    onClick={(event) => handleEditClick(event, dataset)}
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                )}
              </Box>
            </MenuItem>
          ))}
          {datasets.length === 0 && status !== 'loading' && (
            <MenuItem value="" disabled>
                 <Typography>No datasets available</Typography>
            </MenuItem>
          )}
        </Select>
      </FormControl>
    </Box>
  );
}

export default DatasetSelector;