import React from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Grid, Box, Typography } from '@mui/material';
import PhotoThumbnail from './PhotoThumbnail';

const PhotoGrid = () => {
  const photos = useSelector((state) => state.dataset.photos);
  const status = useSelector((state) => state.dataset.status);
  const error = useSelector((state) => state.dataset.error);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  if (status === 'loading') {
    return <Typography>Loading photos...</Typography>;
  }

  if (error) {
    const errorMessage = error.detail || (typeof error === 'object' ? JSON.stringify(error) : error);
    return <Typography color="error">Error: {errorMessage}</Typography>;
  }

  if (!photos || photos.length === 0) {
    return <Typography>No photos to display. Select a dataset or upload new images.</Typography>;
  }

  return (
    <Box sx={{ flexGrow: 1, p: 2 }}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Grid container spacing={2}>
          {photos.map((photo) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={photo.id}>
              <PhotoThumbnail photo={photo} />
            </Grid>
          ))}
        </Grid>
      </motion.div>
    </Box>
  );
};

export default PhotoGrid;