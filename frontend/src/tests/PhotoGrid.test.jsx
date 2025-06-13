import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import PhotoGrid from '../components/PhotoGrid';
import datasetReducer from '../features/dataset/datasetSlice';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Mock the API responses
const server = setupServer(
  http.get('/api/v1/datasets/:datasetId/images/', ({ params }) => {
    const { datasetId } = params;
    if (datasetId === 'test-dataset-id') {
      return HttpResponse.json([
        { id: 'image-1', filename: 'image1.jpg', path: 'image1.jpg', dataset_id: datasetId, mime_type: 'image/jpeg' },
        { id: 'image-2', filename: 'image2.png', path: 'image2.png', dataset_id: datasetId, mime_type: 'image/png' },
      ]);
    }
    return new HttpResponse(null, { status: 404 });
  }),
  http.get('/api/v1/images/:imageId/file', ({ params }) => {
    const { imageId } = params;
    // Return a dummy image response. In a real-world scenario, you might return
    // an actual small image binary, but for testing src attributes, this is sufficient.
    if (imageId === 'image-1') {
      return new HttpResponse('mock jpeg content', { headers: { 'Content-Type': 'image/jpeg' } });
    }
    if (imageId === 'image-2') {
      return new HttpResponse('mock png content', { headers: { 'Content-Type': 'image/png' } });
    }
    return new HttpResponse(null, { status: 404 });
  }),
);

// Establish API mocking before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());
// Clean up after the tests are finished.
afterAll(() => server.close());

const renderWithRedux = (
  component,
  { initialState, store = configureStore({ reducer: { dataset: datasetReducer }, preloadedState: initialState }) } = {}
) => {
  return {
    ...render(<Provider store={store}>{component}</Provider>),
    store,
  };
};

describe('PhotoGrid', () => {
  it('displays a message to select a dataset when no activeDatasetId is present', () => {
    renderWithRedux(<PhotoGrid />, { initialState: { dataset: { activeDatasetId: null } } });
    expect(screen.getByText(/Please select a dataset/i)).toBeInTheDocument();
  });

  it('displays loading message when fetching images', () => {
    renderWithRedux(<PhotoGrid />, { initialState: { dataset: { activeDatasetId: 'test-dataset-id' } } });
    expect(screen.getByText(/Loading images.../i)).toBeInTheDocument();
  });

  it('displays error message when image fetching fails', async () => {
    server.use(
      http.get('/api/v1/datasets/:datasetId/images/', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );
    renderWithRedux(<PhotoGrid />, { initialState: { dataset: { activeDatasetId: 'test-dataset-id' } } });
    await waitFor(() => expect(screen.getByText(/Failed to load images for this dataset/i)).toBeInTheDocument());
  });

  it('renders images correctly when valid data is provided', async () => {
    const { store } = renderWithRedux(<PhotoGrid />, { initialState: { dataset: { activeDatasetId: 'test-dataset-id' } } });

    await waitFor(() => {
      expect(screen.getByAltText('image1.jpg')).toBeInTheDocument();
      expect(screen.getByAltText('image2.png')).toBeInTheDocument();
    });

    const image1 = screen.getByAltText('image1.jpg');
    const image2 = screen.getByAltText('image2.png');

    // Assert that the src attribute is correctly constructed
    expect(image1.src).toMatch(/\/api\/v1\/images\/image-1\/file$/);
    expect(image2.src).toMatch(/\/api\/v1\/images\/image-2\/file$/);
  });

  it('displays "No images found" when dataset has no images', async () => {
    server.use(
      http.get('/api/v1/datasets/:datasetId/images/', () => {
        return HttpResponse.json([]);
      })
    );
    renderWithRedux(<PhotoGrid />, { initialState: { dataset: { activeDatasetId: 'test-dataset-id' } } });
    await waitFor(() => expect(screen.getByText(/No images found for the active dataset/i)).toBeInTheDocument());
  });
});