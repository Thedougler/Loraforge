import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { closeUploadModal, uploadDataset } from '../features/dataset/datasetSlice';
import { Modal, Box, IconButton, Typography, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

const dropzoneStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  borderWidth: 2,
  borderRadius: 2,
  borderColor: '#eeeeee',
  borderStyle: 'dashed',
  backgroundColor: '#fafafa',
  color: '#bdbdbd',
  outline: 'none',
  transition: 'border .24s ease-in-out',
  cursor: 'pointer',
  minHeight: '100px',
};

const UploadModal = () => {
  const dispatch = useDispatch();
  const isUploadModalOpen = useSelector((state) => state.dataset.isUploadModalOpen);
  const status = useSelector((state) => state.dataset.status);

  const handleClose = () => {
    dispatch(closeUploadModal());
  };

  const onDrop = useCallback((acceptedFiles) => {
    const formData = new FormData();
    // The backend expects a single file under the key 'file' and a 'name' for the dataset.
    // We'll use the first accepted file and derive a name from it.
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const datasetName = file.name.split('.').slice(0, -1).join('.'); // Use filename without extension as dataset name
      formData.append('file', file);
      formData.append('name', datasetName);
      dispatch(uploadDataset(formData));
    }
  }, [dispatch]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <AnimatePresence>
      {isUploadModalOpen && (
        <Modal
          open={isUploadModalOpen}
          onClose={handleClose}
          aria-labelledby="upload-modal-title"
          aria-describedby="upload-modal-description"
          closeAfterTransition
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            style={style}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography id="upload-modal-title" variant="h6" component="h2">
                Upload Dataset
              </Typography>
              <IconButton onClick={handleClose} aria-label="close upload modal">
                <CloseIcon />
              </IconButton>
            </Box>
            <div {...getRootProps({ style: dropzoneStyle })}>
              <input {...getInputProps()} />
              {isDragActive ? (
                <Typography>Drop the files here ...</Typography>
              ) : (
                <Typography>Drag 'n' drop some files here, or click to select files</Typography>
              )}
            </div>
            {status === 'loading' && <Typography>Uploading...</Typography>}
            {status === 'failed' && <Typography color="error">Upload failed. Please try again.</Typography>}
          </motion.div>
        </Modal>
      )}
    </AnimatePresence>
  );
};

export default UploadModal;