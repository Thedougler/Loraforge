import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import UploadModal from '../components/UploadModal';
import { closeUploadModal } from '../features/dataset/datasetSlice';
import datasetReducer from '../features/dataset/datasetSlice';

// Mock react-dropzone as it's a direct dependency of UploadModal
vi.mock('react-dropzone', () => ({
  useDropzone: () => ({
    getRootProps: () => ({}),
    getInputProps: () => ({}),
    isDragActive: false,
  }),
}));

// Mock the UploadModal's internal components if any (UploadForm is no longer used directly)
// Removed mock for UploadForm as it's no longer used in UploadModal directly.

const renderWithRedux = (component, { initialState } = {}) => {
  const store = configureStore({
    reducer: {
      dataset: datasetReducer,
    },
    preloadedState: initialState,
  });
  return { ...render(<Provider store={store}>{component}</Provider>), store };
};

describe('UploadModal', () => {
  it('renders correctly when isUploadModalOpen is true', () => {
    renderWithRedux(<UploadModal />, {
      initialState: {
        dataset: {
          isUploadModalOpen: true,
        },
      },
    });

    expect(screen.getByText('Upload Dataset')).toBeInTheDocument();
  });

  it('does not render when isUploadModalOpen is false', () => {
    renderWithRedux(<UploadModal />, {
      initialState: {
        dataset: {
          isUploadModalOpen: false,
        },
      },
    });

    expect(screen.queryByText('Upload New Image')).not.toBeInTheDocument();
  });

  it('dispatches closeUploadModal action when the close button is clicked', () => {
    const { store } = renderWithRedux(<UploadModal />, {
      initialState: {
        dataset: {
          isUploadModalOpen: true,
        },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /close upload modal/i }));

    expect(store.getState().dataset.isUploadModalOpen).toBe(false);
  });
});