import React, { useState, useEffect, useRef } from 'react';
import { Button, Box, Typography, TextField, LinearProgress } from '@mui/material';
import { styled } from '@mui/system';
import { CheckCircle, ErrorOutline } from '@mui/icons-material';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { setActiveDataset } from '../features/dataset/datasetSlice';

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
  const dispatch = useDispatch();
  const [selectedFile, setSelectedFile] = useState(null);
  const [datasetName, setDatasetName] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(''); // PENDING, RUNNING, SUCCESS, FAILURE
  const [taskProgress, setTaskProgress] = useState(0); // 0-100
  const pollingIntervalRef = useRef(null);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setUploadMessage('');
  };

  const handleDatasetNameChange = (event) => {
    setDatasetName(event.target.value);
  };

  const handleUpload = async () => {
    if (!selectedFile || !datasetName.trim()) {
      setUploadMessage('Please select a file and enter a dataset name.');
      return;
    }

    // Reset task-related states for a new upload
    setTaskId(null);
    setTaskStatus('');
    setTaskProgress(0);
    if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
    }

    setIsLoading(true);
    setUploadMessage('Uploading file...');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('name', datasetName); // Add dataset name to form data

    try {
      // Assuming the backend is running on the same host but different port or a proxy is configured
      // For development, you might need to adjust the URL if your backend is on a different origin
      const response = await axios.post('/api/v1/datasets/', formData, { // Corrected endpoint
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 202 && response.data.task_id) {
        setTaskId(response.data.task_id);
        setUploadMessage('File uploaded. Processing started...');
        setTaskStatus('PENDING'); // Initial status
      } else {
        setUploadMessage('Upload successful, but no task ID received.');
        setIsLoading(false); // End loading if no task to track
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
      setUploadMessage(`Upload failed: ${error.response?.status ? `${error.response.status} - ` : ''}${errorMessage}`);
      setTaskStatus('FAILURE');
      setIsLoading(false); // End loading on failure
    }
  };

  useEffect(() => {
    if (taskId) {
      // Clear any existing interval to prevent multiple polling loops
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      pollingIntervalRef.current = setInterval(async () => {
        try {
          const response = await axios.get(`/api/v1/tasks/${taskId}/status`);
          const { status, progress, message } = response.data;
          setTaskStatus(status);
          setTaskProgress(progress || 0);
          setUploadMessage(`Processing: ${message || status}`);

          if (status === 'SUCCESS' || status === 'FAILURE') {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
            setIsLoading(false); // Processing complete
            if (status === 'SUCCESS') {
              setUploadMessage('Dataset processed successfully!');
              setSelectedFile(null); // Clear selected file after successful upload
              setDatasetName(''); // Clear dataset name input
              // Dispatch action to set the new dataset as active
              if (response.data.dataset_id) {
                dispatch(setActiveDataset(response.data.dataset_id));
              }
            } else {
              setUploadMessage(`Processing failed: ${message || 'An error occurred.'}`);
            }
          }
        } catch (error) {
          console.error('Error polling task status:', error);
          setUploadMessage(`Failed to get task status: ${error.message}`);
          setTaskStatus('FAILURE');
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          setIsLoading(false); // Stop loading on polling error
        }
      }, 3000); // Poll every 3 seconds
    }

    // Cleanup function for when the component unmounts or taskId changes
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [taskId]); // Rerun effect when taskId changes

  const isFormDisabled = isLoading || (taskId && (taskStatus === 'PENDING' || taskStatus === 'RUNNING'));

  return (
    <Box sx={{ my: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, border: '1px dashed grey', p: 3, borderRadius: 2 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        Upload Dataset Archive
      </Typography>
      <TextField
        label="Dataset Name"
        variant="outlined"
        fullWidth
        value={datasetName}
        onChange={handleDatasetNameChange}
        sx={{ mb: 2 }}
        disabled={isFormDisabled}
      />
      <Button
        component="label"
        variant="contained"
        disabled={isFormDisabled}
        >
        Select File
        <VisuallyHiddenInput type="file" onChange={handleFileChange} accept=".zip,.rar" />
      </Button>
      {selectedFile && !isFormDisabled && ( // Only show selected file before upload or if not disabled
        <Typography variant="body1" sx={{ mt: 1 }}>
          Selected: {selectedFile.name}
        </Typography>
      )}

      {(taskStatus === 'PENDING' || taskStatus === 'RUNNING') && (
        <Box sx={{ width: '100%', mt: 2 }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            {`Processing: ${taskProgress}%`}
          </Typography>
          <LinearProgress variant="determinate" value={taskProgress} />
        </Box>
      )}

      {uploadMessage && (
        <Typography variant="body2" sx={{ mt: 2, color:
          taskStatus === 'FAILURE' ? 'error.main' :
          taskStatus === 'SUCCESS' ? 'success.main' : 'text.primary'
        }}>
          {uploadMessage}
          {taskStatus === 'SUCCESS' && <CheckCircle sx={{ ml: 1, verticalAlign: 'middle' }} color="success" />}
          {taskStatus === 'FAILURE' && <ErrorOutline sx={{ ml: 1, verticalAlign: 'middle' }} color="error" />}
        </Typography>
      )}

      <Button
        variant="contained"
        onClick={handleUpload}
        disabled={isFormDisabled || !selectedFile || !datasetName.trim()}
        sx={{ mt: 2 }}
      >
        {isLoading && !taskId ? 'Uploading...' :
         (taskStatus === 'PENDING' || taskStatus === 'RUNNING' ? 'Processing...' : 'Upload Dataset')}
      </Button>

    </Box>
  );
}

export default DatasetUpload;