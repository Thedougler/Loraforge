import React from 'react';
import { Button } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useDispatch } from 'react-redux';
import { openUploadModal } from '../features/dataset/datasetSlice';

function UploadButton() {
  const dispatch = useDispatch();

  const handleClick = () => {
    dispatch(openUploadModal());
  };

  return (
    <Button
      variant="contained"
      color="primary"
      startIcon={<CloudUploadIcon />}
      onClick={handleClick}
    >
      Upload
    </Button>
  );
}

export default UploadButton;