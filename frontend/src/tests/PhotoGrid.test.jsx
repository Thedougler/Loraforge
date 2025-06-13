import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import PhotoGrid from '../components/PhotoGrid';
import datasetReducer from '../features/dataset/datasetSlice';

// Mock the PhotoThumbnail component as it's a child component
vi.mock('../components/PhotoThumbnail', () => ({ default: ({ photo }) => <div data-testid="mock-photo-thumbnail">{photo.filename}</div> }));

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

describe('PhotoGrid', () => {
  it('renders PhotoThumbnail components based on the photos state', () => {
    const mockPhotos = [
      { id: '1', url: '/media/image1.jpg', filename: 'image1.jpg' },
      { id: '2', url: '/media/image2.jpg', filename: 'image2.jpg' },
    ];

    renderWithRedux(<PhotoGrid />, {
      initialState: {
        dataset: {
          photos: mockPhotos,
          status: 'succeeded',
          error: null,
        },
      },
    });

    expect(screen.getByText('image1.jpg')).toBeInTheDocument();
    expect(screen.getByText('image2.jpg')).toBeInTheDocument();
    expect(screen.getAllByTestId('mock-photo-thumbnail')).toHaveLength(mockPhotos.length);
  });

  it('displays "No photos to display" when photos state is empty', () => {
    renderWithRedux(<PhotoGrid />, {
      initialState: {
        dataset: {
          photos: [],
          status: 'succeeded',
          error: null,
        },
      },
    });

    expect(screen.getByText(/No photos to display/i)).toBeInTheDocument();
  });

  it('displays loading message when status is loading', () => {
    renderWithRedux(<PhotoGrid />, {
      initialState: {
        dataset: {
          photos: [],
          status: 'loading',
          error: null,
        },
      },
    });

    expect(screen.getByText(/Loading photos/i)).toBeInTheDocument();
  });

  it('displays error message when there is an error', () => {
    const errorMessage = 'Failed to fetch photos';
    renderWithRedux(<PhotoGrid />, {
      initialState: {
        dataset: {
          photos: [],
          status: 'failed',
          error: errorMessage,
        },
      },
    });

    expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
  });
});