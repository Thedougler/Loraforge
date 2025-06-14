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

export const uploadDataset = createAsyncThunk('dataset/uploadDataset', async (formData, { dispatch, getState, rejectWithValue }) => {
    console.log('Current state:', getState());
  const pollTaskStatus = async (taskId) => {
    const interval = 2000; // Poll every 2 seconds
    const maxAttempts = 30; // Timeout after 1 minute
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(`/api/v1/tasks/${taskId}/status`);
        if (response.data.status === 'SUCCESS') {
          return response.data;
        } else if (response.data.status === 'FAILURE') {
          throw new Error('Upload task failed');
        }
      } catch (error) {
        throw new Error('Failed to poll task status');
      }
      attempts++;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error('Polling timed out');
  };

  try {
    const initialResponse = await axios.post('/api/v1/datasets/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const taskId = initialResponse.data.id;
    if (!taskId) {
      throw new Error('Task ID not found in response');
    }

    const taskResult = await pollTaskStatus(taskId);

    const { datasets: originalDatasets } = getState().dataset;
    const updatedDatasets = await dispatch(fetchDatasets()).unwrap();

    let newDataset;
    if (taskResult && taskResult.dataset_id) {
      newDataset = updatedDatasets.find(d => d.id === taskResult.dataset_id);
    } else {
      // Fallback: find the dataset that is not in the original list
      const originalDatasetIds = new Set(originalDatasets.map(d => d.id));
      newDataset = updatedDatasets.find(d => !originalDatasetIds.has(d.id));
    }

    if (newDataset) {
      dispatch(selectDataset(newDataset.id));
      return newDataset.id;
    } else {
        // if the new dataset is not found, select the last one as a fallback
        const newDatasetId = updatedDatasets[updatedDatasets.length - 1].id;
        dispatch(selectDataset(newDatasetId));
        return newDatasetId;
    }
  } catch (error) {
    console.error('Error in uploadDataset thunk:', error);
    return rejectWithValue(error.response ? error.response.data : error.message);
  }
});

const initialState = {
  datasets: [],
  photos: [],
  activeDatasetId: null,
  isUploadModalOpen: false,
  isSidebarOpen: false, // Add this line
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

export const selectDataset = createAsyncThunk('dataset/selectDataset', async (datasetId, { dispatch }) => {
  dispatch(datasetSlice.actions._selectDataset(datasetId));
  await dispatch(fetchPhotosForDataset(datasetId));
  return datasetId;
});

export const datasetSlice = createSlice({
  name: 'dataset',
  initialState,
  reducers: {
    _selectDataset: (state, action) => {
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
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
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

export const { openUploadModal, closeUploadModal, toggleSidebar } = datasetSlice.actions;

export default datasetSlice.reducer;