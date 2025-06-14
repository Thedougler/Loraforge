import React, { useEffect } from 'react';
import { FormControl, InputLabel, Select, MenuItem, Box, CircularProgress, Typography } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { fetchDatasets, selectDataset } from '../features/dataset/datasetSlice';

function DatasetSelector() {
  const dispatch = useDispatch();
  const { datasets, activeDatasetId, status, error } = useSelector((state) => state.dataset);
  const selectedDataset = datasets.find(d => d.id === activeDatasetId);


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
            <MenuItem key={dataset.id} value={dataset.id}>
              {dataset.name}
            </MenuItem>
          ))}
          {datasets.length === 0 && status !== 'loading' && (
            <MenuItem value="" disabled>No datasets available</MenuItem>
          )}
        </Select>
      </FormControl>
    </Box>
  );
}

export default DatasetSelector;