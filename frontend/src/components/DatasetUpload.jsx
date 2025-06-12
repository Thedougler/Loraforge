import React, { useState } from 'react';
import { Button, Box, Typography } from '@mui/material';
import { styled } from '@mui/system';
import axios from 'axios';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

function DatasetUpload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setUploadMessage('');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadMessage('Please select a file first.');
      return;
    }

    setUploadMessage('Uploading...');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      // Assuming the backend is running on the same host but different port or a proxy is configured
      // For development, you might need to adjust the URL if your backend is on a different origin
      const response = await axios.post('/datasets/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.task_id) {
        setUploadMessage(`Upload started! Task ID: ${response.data.task_id}`);
        setSelectedFile(null); // Clear selected file after successful upload
      } else {
        setUploadMessage('Upload successful, but no task ID received.');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadMessage(`Upload failed: ${error.message || 'Unknown error'}`);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        setUploadMessage(`Upload failed: ${error.response.status} - ${error.response.data.detail || error.response.statusText}`);
      }
    }
  };

  return (
    <Box sx={{ my: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, border: '1px dashed grey', p: 3, borderRadius: 2 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        Upload Dataset Archive
      </Typography>
      <Button
        component="label"
        variant="contained"
        >
        Select File
        <VisuallyHiddenInput type="file" onChange={handleFileChange} accept=".zip,.rar,.tar.gz" />
      </Button>
      {selectedFile && (
        <Typography variant="body1">
          Selected: {selectedFile.name}
        </Typography>
      )}
      <Button
        variant="contained"
        onClick={handleUpload}
        disabled={!selectedFile || uploadMessage === 'Uploading...'}
        sx={{ mt: 2 }}
      >
        Upload
      </Button>
      {uploadMessage && (
        <Typography variant="body2" sx={{ mt: 2, color: uploadMessage.startsWith('Upload failed') ? 'error.main' : 'text.primary' }}>
          {uploadMessage}
        </Typography>
      )}
    </Box>
  );
}

export default DatasetUpload;