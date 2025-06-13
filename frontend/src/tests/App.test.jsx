import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '../store'; // Correct path to store index.js
import App from '../App';

vi.mock('../components/UploadModal', () => ({ default: () => <div data-testid="mock-upload-modal" /> }));
vi.mock('react-dropzone', () => ({
  useDropzone: () => ({
    getRootProps: () => ({}),
    getInputProps: () => ({}),
    isDragActive: false,
  }),
}));
vi.mock('../components/GlobalHeader', () => ({ default: () => <div data-testid="mock-global-header" /> }));
vi.mock('../components/DatasetSelector', () => ({ default: () => <div data-testid="mock-dataset-selector" /> }));
vi.mock('../components/PhotoGrid', () => ({ default: () => <div data-testid="mock-photo-grid" /> }));
describe('App', () => {
  it('renders without crashing', () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );
  });
});