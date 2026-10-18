import { useState, useEffect, memo } from 'react';
import { getReciterAvatarUrl, getReciterFallbackUrl } from '../utils/reciterPhotos';

/**
 * ReciterAvatar — Renders a reciter photo with instant offline SVG fallback.
 */
const ReciterAvatar = memo(({ name, className = '', alt = '', width, height }) => {
  const primaryUrl = getReciterAvatarUrl(name);
  const fallbackUrl = getReciterFallbackUrl();

  const [imgSrc, setImgSrc] = useState(primaryUrl);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(getReciterAvatarUrl(name));
    setHasError(false);
  }, [name]);

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


