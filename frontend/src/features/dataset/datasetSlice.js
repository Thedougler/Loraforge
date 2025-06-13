import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeDatasetId: null,
};

export const datasetSlice = createSlice({
  name: 'dataset',
  initialState,
  reducers: {
    setActiveDataset: (state, action) => {
      state.activeDatasetId = action.payload;
    },
  },
});

export const { setActiveDataset } = datasetSlice.actions;

export default datasetSlice.reducer;