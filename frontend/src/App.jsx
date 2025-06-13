import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { increment, decrement, incrementByAmount } from './features/counter/counterSlice';
import { Box, Button, Typography, Container } from '@mui/material';
import DatasetUpload from './components/DatasetUpload';
import DatasetSelector from './components/DatasetSelector';
import PhotoGrid from './components/PhotoGrid';
import { motion } from 'framer-motion';
import { setActiveDataset } from './features/dataset/datasetSlice';

function App() {
const count = useSelector((state) => state.counter.value);
  const activeDatasetId = useSelector(state => state.dataset.activeDatasetId);
  const dispatch = useDispatch();
  
  useEffect(() => {
    // This effect ensures DatasetSelector updates Redux state
    // when a dataset is programmatically selected (e.g., after upload)
    // or when the component initializes and a default dataset is chosen.
    // However, DatasetSelector will now directly dispatch setActiveDataset.
    // This part can be removed if DatasetSelector directly manages activeDatasetId in Redux.
    // For now, keeping it here to ensure PhotoGrid still gets a value if needed before refactoring DatasetSelector.
  }, [activeDatasetId]);

  return (
    <Container component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
      <Box sx={{ my: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Vite + React + Redux + MUI + Framer Motion
        </Typography>
        <Typography variant="h5">Count: {count}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" onClick={() => dispatch(increment())}>
            Increment
          </Button>
          <Button variant="contained" onClick={() => dispatch(decrement())}>
            Decrement
          </Button>
          <Button variant="contained" onClick={() => dispatch(incrementByAmount(5))}>
            Increment by 5
          </Button>
        </Box>
        <DatasetUpload />
        <DatasetSelector />
        <PhotoGrid />
      </Box>
    </Container>
  );
}

export default App;