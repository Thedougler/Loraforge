import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardMedia } from '@mui/material';

const PhotoThumbnail = ({ photo }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ cursor: 'pointer' }}
    >
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardMedia
          component="img"
          image={`/api/v1/images/${photo.id}/file`}
          alt={photo.filename}
          sx={{
            flexGrow: 1,
            overflow: 'hidden',
            objectFit: 'cover',
            width: '100%',
            height: '100%', // Ensure the image takes full height of the CardMedia
          }}
        />
      </Card>
    </motion.div>
  );
};

export default PhotoThumbnail;