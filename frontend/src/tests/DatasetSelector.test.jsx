import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import DatasetSelector from '../components/DatasetSelector';
import datasetReducer, { selectDataset } from '../features/dataset/datasetSlice';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const mockDatasets = [
  { id: '1', name: 'Dataset A' },
  { id: '2', name: 'Dataset B' },
];

const server = setupServer(
  http.get('/api/v1/datasets', () => {
    return HttpResponse.json(mockDatasets);
  }),
  http.get('/api/v1/datasets/:id/images', ({ params }) => {
    // Mock an empty array or specific image data depending on what's needed for the test
    return HttpResponse.json([]);
  })
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
  return { ...render(<Provider store={store}>{component}</Provider>), store };
};

describe('DatasetSelector', () => {
  it('fetches and displays datasets', async () => {
    renderWithRedux(<DatasetSelector />);

    // Wait for the initial dataset to be loaded and selected.
    expect(await screen.findByRole('combobox')).toHaveTextContent('Dataset A');

    // Open the select dropdown
    fireEvent.mouseDown(screen.getByRole('combobox'));

    // Check for the options in the listbox.
    // The options have a role of 'option'.
    expect(await screen.findByRole('option', { name: 'Dataset A' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Dataset B' })).toBeInTheDocument();
  });

  it('selects a new dataset and displays it', async () => {
    const { store } = renderWithRedux(<DatasetSelector />);
    
    // Wait for the component to finish loading datasets
    await screen.findByText('Dataset A');

    // The combobox should display the name of the initially active dataset.
    // Based on the slice logic, it should be "Dataset A".
    expect(screen.getByRole('combobox')).toHaveTextContent('Dataset A');

    // User opens the dropdown
    fireEvent.mouseDown(screen.getByRole('combobox'));

    // User clicks on "Dataset B"
    fireEvent.click(await screen.findByText('Dataset B'));

    // After selection, the combobox should update to show "Dataset B"
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveTextContent('Dataset B');
    });

    // Also, verify that the Redux state was updated correctly
    expect(store.getState().dataset.activeDatasetId).toBe('2');
  });
});