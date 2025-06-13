import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import GlobalHeader from '../components/GlobalHeader';
import datasetReducer from '../features/dataset/datasetSlice';
// Uncomment this if you need a uiSlice for isUploadModalOpen and close/open actions
// import uiReducer from '../features/ui/uiSlice';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

// Mock components that GlobalHeader renders
vi.mock('../components/DatasetSelector', () => ({ default: () => <div data-testid="mock-dataset-selector" /> }));
vi.mock('../components/UploadButton', () => ({ default: () => <button data-testid="mock-upload-button" /> }));

const server = setupServer(
  // Define your mock API handlers here if GlobalHeader itself makes direct API calls,
  // though typically it just renders other components that might.
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const renderWithRedux = (component, { initialState } = {}) => {
  const store = configureStore({
    reducer: {
      dataset: datasetReducer,
    },
    preloadedState: initialState,
  });
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('GlobalHeader', () => {
  it('renders the title, DatasetSelector, and UploadButton', () => {
    // Initial state setup for GlobalHeader, if needed
    renderWithRedux(<GlobalHeader />, {});

    expect(screen.getByText(/Loraforge/i)).toBeInTheDocument();
    expect(screen.getByTestId('mock-dataset-selector')).toBeInTheDocument();
    expect(screen.getByTestId('mock-upload-button')).toBeInTheDocument();
  });
});