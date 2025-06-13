import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async Thunks
export const fetchDatasets = createAsyncThunk('dataset/fetchDatasets', async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get('/api/v1/datasets/');
    return response.data;
  } catch (error) {
    console.error('Error fetching datasets:', error);
    return rejectWithValue(error.response ? error.response.data : 'An unexpected error occurred');
  }
});

export const fetchPhotosForDataset = createAsyncThunk('dataset/fetchPhotosForDataset', async (datasetId, { rejectWithValue }) => {
  try {
    const response = await axios.get(`/api/v1/datasets/${datasetId}/images/`);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response.data);
  }
});

export const uploadDataset = createAsyncThunk('dataset/uploadDataset', async (formData, { dispatch, rejectWithValue }) => {
  try {
    const response = await axios.post('/api/v1/datasets/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    // After upload, refresh the datasets list
    dispatch(fetchDatasets());
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response.data);
  }
});


const initialState = {
  datasets: [],
  photos: [],
  activeDatasetId: null,
  isUploadModalOpen: false,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

export const datasetSlice = createSlice({
  name: 'dataset',
  initialState,
  reducers: {
    selectDataset: (state, action) => {
      state.activeDatasetId = action.payload;
      // When a new dataset is selected, clear the old photos
      state.photos = [];
    },
    openUploadModal: (state) => {
      state.isUploadModalOpen = true;
    },
    closeUploadModal: (state) => {
      state.isUploadModalOpen = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchDatasets
      .addCase(fetchDatasets.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchDatasets.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.datasets = action.payload;
        // If no dataset is active, or the active one no longer exists, set the first one as active.
        const activeDatasetExists = state.activeDatasetId && action.payload.some(d => d.id === state.activeDatasetId);
        if (!activeDatasetExists && action.payload.length > 0) {
          state.activeDatasetId = action.payload[0].id;
        } else if (action.payload.length === 0) {
          state.activeDatasetId = null;
        }
      })
      .addCase(fetchDatasets.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // fetchPhotosForDataset
      .addCase(fetchPhotosForDataset.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchPhotosForDataset.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.photos = action.payload;
      })
      .addCase(fetchPhotosForDataset.rejected, (state, action) => {
        state.status = 'failed';
        state.photos = [];
        state.error = action.payload;
      })
      // uploadDataset
      .addCase(uploadDataset.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(uploadDataset.fulfilled, (state) => {
        state.status = 'succeeded';
        state.isUploadModalOpen = false; // Close modal on successful upload
        // Note: fetchDatasets is dispatched directly within the uploadDataset thunk on success
      })
      .addCase(uploadDataset.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        state.isUploadModalOpen = false; // Close modal on failed upload as well, or handle error display within the modal
      });
  },
});

export const { selectDataset, openUploadModal, closeUploadModal } = datasetSlice.actions;

export default datasetSlice.reducer;