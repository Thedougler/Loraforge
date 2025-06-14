import { render, screen, act, fireEvent, waitFor, within } from '@testing-library/react';
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

  it('allows renaming a dataset by switching to an input field and a confirm button', async () => {
    renderWithRedux(<DatasetSelector />);

    // Wait for the datasets to be loaded and "Dataset A" to be visible
    await screen.findByText('Dataset A');
    
    // There isn't an explicit "rename" button in the current HTML.
    // Assuming there will be some interactive element next to the dataset name
    // that triggers the rename functionality. For now, let's look for a generic button
    // or simulate an action on the dataset name itself if that's how the UI works.
    // If there is an actual icon/button, we will need to adjust this selector.

    // Let's first open the dropdown to see the list of datasets
    fireEvent.mouseDown(screen.getByRole('combobox'));
    
    // Find "Dataset A" in the list of options.
    const datasetAOption = await screen.findByRole('option', { name: "Dataset A" });

    // Find the rename button specifically for "Dataset A" within its MenuItem
    const renameButton = within(datasetAOption).getByRole('button', { name: /rename dataset Dataset A/i });
    fireEvent.click(renameButton);

    // Expect the dataset name to become an input field with the original name
    const datasetInput = await screen.findByRole('textbox', { name: /rename dataset Dataset A/i });
    expect(datasetInput).toBeInTheDocument();
    expect(datasetInput.tagName).toBe('INPUT');
    expect(datasetInput).toHaveValue('Dataset A');

    // Expect the rename button to change into a confirm button/icon
    const confirmButton = screen.getByRole('button', { name: /confirm rename/i });
    expect(confirmButton).toBeInTheDocument();
  });
});
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import DatasetSelector from '../components/DatasetSelector';

describe('DatasetSelector', () => {
  test('allows renaming a dataset', () => {
    const { getByText, getByDisplayValue } = render(<DatasetSelector />);
    
    // Assuming there's a dataset named "Dataset 1"
    const renameButton = getByText('rename');
    fireEvent.click(renameButton);
    
    // Check if the input field is displayed with the current dataset name
    const inputField = getByDisplayValue('Dataset 1');
    expect(inputField).toBeInTheDocument();
    
    // Check if the rename button has changed to a confirm icon
    expect(renameButton).toHaveTextContent('confirm'); // Adjust based on actual confirm icon text
  });
});