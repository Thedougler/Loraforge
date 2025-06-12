import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { increment, decrement, incrementByAmount } from './features/counter/counterSlice';
import { Box, Button, Typography, Container } from '@mui/material';
import DatasetUpload from './components/DatasetUpload';
import { motion } from 'framer-motion';

function App() {
  const count = useSelector((state) => state.counter.value);
  const dispatch = useDispatch();

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
      </Box>
    </Container>
  );
}

export default App;