import React, { useState, useEffect } from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveDataset } from '../features/dataset/datasetSlice';

function DatasetSelector() {
  const dispatch = useDispatch();
  const activeDatasetId = useSelector((state) => state.dataset.activeDatasetId);
  const [datasets, setDatasets] = useState([]);

  useEffect(() => {
    fetch('/api/v1/datasets/')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        setDatasets(data);
        if (data.length > 0) {
          // If no dataset is currently active in Redux, set the first one as active
          // This handles initial load or after all datasets are cleared/reloaded.
          if (!activeDatasetId) {
            dispatch(setActiveDataset(data[0].id));
          }
        }
      })
      .catch(error => {
        console.error('Error fetching datasets:', error);
      });
  }, []); // Empty dependency array as this effect should run once on mount

  // Update local state if Redux activeDatasetId changes
  useEffect(() => {
    // Ensure that if Redux state changes (e.g., after an upload),
    // the selector reflects the active dataset.
    // If the activeDatasetId is null, reset the selector.
  }, [activeDatasetId]);

  const handleChange = (event) => {
    const newSelectedId = event.target.value;
    dispatch(setActiveDataset(newSelectedId));
  };

  return (
    <FormControl sx={{ m: 1, minWidth: 200 }}>
      <InputLabel id="dataset-selector-label">Select Dataset</InputLabel>
      <Select
        labelId="dataset-selector-label"
        id="dataset-selector"
        value={activeDatasetId || ''} // Use activeDatasetId from Redux
        onChange={handleChange}
        label="Select Dataset"
      >
        {datasets.map((dataset) => (
          <MenuItem key={dataset.id} value={dataset.id}>
            {dataset.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export default DatasetSelector;