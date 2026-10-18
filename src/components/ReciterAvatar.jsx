import { useState, useEffect, memo } from 'react';
import { getReciterAvatarUrl, generateInitialsSvgDataUri } from '../utils/reciterPhotos';

/**
 * ReciterAvatar — Renders a reciter photo with instant offline SVG fallback.
 */
const ReciterAvatar = memo(({ name, src, className = '', alt = '', width, height }) => {
  const primaryUrl = src || getReciterAvatarUrl(name);
  const fallbackUrl = generateInitialsSvgDataUri(name || 'Qari');

  const [imgSrc, setImgSrc] = useState(primaryUrl);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(src || getReciterAvatarUrl(name));
    setHasError(false);
  }, [src, name]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallbackUrl);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt || name || 'Reciter'}
      className={`reciter-avatar-img ${className}`}
      onError={handleError}
      loading="lazy"
      decoding="async"
      width={width}
      height={height}
    />
  );
});

ReciterAvatar.displayName = 'ReciterAvatar';

export default ReciterAvatar;


