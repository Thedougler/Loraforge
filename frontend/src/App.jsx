import React, { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { CssBaseline, Box } from '@mui/material';
import GlobalHeader from './components/GlobalHeader';
import PhotoGrid from './components/PhotoGrid';
import UploadModal from './components/UploadModal';
import Sidebar from './components/Sidebar';
import { fetchDatasets, openUploadModal, uploadDataset } from './features/dataset/datasetSlice';
import { useDropzone } from 'react-dropzone';

function App() {
  const dispatch = useDispatch();
  const { isSidebarOpen, status, isUploadModalOpen } = useSelector((state) => state.dataset);

  const onDrop = useCallback((acceptedFiles) => {
    const formData = new FormData();
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const datasetName = file.name.split('.').slice(0, -1).join('.');
      formData.append('file', file);
      formData.append('name', datasetName);
      dispatch(uploadDataset(formData));
    }
  }, [dispatch]);

  const { getRootProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
  });

  useEffect(() => {
    if (isDragActive && !isUploadModalOpen) {
      dispatch(openUploadModal());
    }
  }, [isDragActive, isUploadModalOpen, dispatch]);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchDatasets());
    }
  }, [status, dispatch]);

  return (
    <div {...getRootProps()} style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <CssBaseline />
        <GlobalHeader />
        <Sidebar isOpen={isSidebarOpen} />
        <Box component="main" sx={{ flexGrow: 1, p: 3, transition: 'margin-left 0.3s', marginLeft: isSidebarOpen ? '250px' : 0 }}>
          <PhotoGrid />
        </Box>
        <UploadModal />
      </Box>
    </div>
  );
}

export default App;