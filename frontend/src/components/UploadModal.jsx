import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { closeUploadModal, uploadDataset } from '../features/dataset/datasetSlice';
import { Modal, Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 'clamp(300px, 50vw, 500px)', // Responsive width
  bgcolor: 'background.paper',
  borderRadius: '8px', // Rounded corners
  boxShadow: 24,
  p: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  alignItems: 'center', // Center content horizontally
  textAlign: 'center', // Center text
};

const dropzoneStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 20px', // More vertical padding
  borderWidth: 2,
  borderRadius: '8px', // Rounded corners
  borderColor: '#eeeeee',
  borderStyle: 'dashed',
  backgroundColor: '#fafafa',
  color: '#bdbdbd',
  outline: 'none',
  transition: 'border .24s ease-in-out, background-color .24s ease-in-out',
  cursor: 'pointer',
  minHeight: '150px', // Increased height
};

const activeDropzoneStyle = {
  borderColor: 'primary.main',
  backgroundColor: 'action.hover',
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
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const datasetName = file.name.split('.').slice(0, -1).join('.');
      formData.append('file', file);
      formData.append('name', datasetName);
      dispatch(uploadDataset(formData));
    }
  }, [dispatch]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const currentDropzoneStyle = isDragActive
  ? { ...dropzoneStyle, ...activeDropzoneStyle }
  : dropzoneStyle;


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
          >
            <Box sx={style}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Typography id="upload-modal-title" variant="h5" component="h2">
                  Upload Your Dataset
                </Typography>
                <IconButton onClick={handleClose} aria-label="close upload modal">
                  <CloseIcon />
                </IconButton>
              </Box>
              <div {...getRootProps({ style: currentDropzoneStyle })}>
                <input {...getInputProps()} />
                {isDragActive ? (
                  <Typography>Drop the files here ...</Typography>
                ) : (
                  <Typography>Drag & drop a zip file here, or click to select</Typography>
                )}
              </div>
              {status === 'loading' && <Typography>Uploading...</Typography>}
              {status === 'failed' && <Typography color="error">Upload failed. Please try again.</Typography>}
            </Box>
          </motion.div>
        </Modal>
      )}
    </AnimatePresence>
  );
};

export default UploadModal;