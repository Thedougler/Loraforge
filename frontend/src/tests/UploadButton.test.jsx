import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import UploadButton from '../components/UploadButton';
import { openUploadModal } from '../features/dataset/datasetSlice';
import datasetReducer from '../features/dataset/datasetSlice';

const renderWithRedux = (component, { initialState } = {}) => {
  const store = configureStore({
    reducer: {
      dataset: datasetReducer,
    },
    preloadedState: initialState,
  });
  return { ...render(<Provider store={store}>{component}</Provider>), store };
};

describe('UploadButton', () => {
  it('dispatches openUploadModal action when clicked', () => {
    const { store } = renderWithRedux(<UploadButton />);

    fireEvent.click(screen.getByRole('button', { name: "Upload" }));

    // Check if the openUploadModal action was dispatched
    expect(store.getState().dataset.isUploadModalOpen).toBe(true);
  });
});