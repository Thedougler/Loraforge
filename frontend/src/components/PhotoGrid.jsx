import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { styled } from '@mui/system';

const ImageContainer = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', // Adjust min image size here
  gap: theme.spacing(1),
  padding: theme.spacing(1), // Add some padding around the grid
  width: '100%',
  '& img': {
    width: '100%',
    height: 'auto',
    display: 'block',
    borderRadius: theme.shape.borderRadius,
    objectFit: 'cover', // Ensures image covers the area without distortion
  },
}));

function PhotoGrid() {
  const activeDatasetId = useSelector((state) => state.dataset.activeDatasetId);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (activeDatasetId) {
      setLoading(true);
      setError(null);
      const fetchImages = async () => {
        try {
          // Assuming the backend endpoint returns a list of image objects with 'id' and 'name'
          // and that /api/v1/images/{id}/data serves the actual image data.
          const response = await axios.get(`/api/v1/datasets/${activeDatasetId}/images/`);
          setImages(response.data);
        } catch (err) {
          console.error("Error fetching images:", err);
          setError("Failed to load images for this dataset.");
          setImages([]);
        } finally {
          setLoading(false);
        }
      };

      fetchImages();
    } else {
      setImages([]);
      setLoading(false);
      setError(null);
    }
  }, [activeDatasetId]);

  if (loading) {
    return <Typography>Loading images...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  if (!activeDatasetId) {
    return <Typography>Please select a dataset or upload a new one to view images.</Typography>;
  }

  if (images.length === 0) {
    return <Typography>No images found for the active dataset.</Typography>;
  }

  return (
    <ImageContainer>
      {images.map((image) => (
        <React.Fragment key={image.id}>
          <img
            src={`/api/v1/images/${image.id}/file`} // Use the direct data endpoint for full size image
            alt={image.filename}
            loading="lazy"
          />
        </React.Fragment>
      ))}
    </ImageContainer>
  );
}

export default PhotoGrid;