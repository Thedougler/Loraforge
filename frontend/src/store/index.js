import { configureStore } from '@reduxjs/toolkit';
import counterReducer from '../features/counter/counterSlice';
import datasetReducer from '../features/dataset/datasetSlice';

export const store = configureStore({
  reducer: {
    counter: counterReducer,
    dataset: datasetReducer,
  },
});