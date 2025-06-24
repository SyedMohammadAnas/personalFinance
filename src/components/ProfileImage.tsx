"use client";

import Image from "next/image";
import { User } from "lucide-react";
import { useState, useEffect, useRef } from "react";

/**
 * Props for the ProfileImage component
 */
interface ProfileImageProps {
  src: string | null | undefined;  // Image source URL (typically from Google profile)
  alt: string;                     // Alt text for accessibility
  size?: number;                   // Size in pixels (default: 24px)
  fallbackDelay?: number;          // Time to wait before showing fallback (default: 5000ms)
}

/**
 * ProfileImage Component
 *
 * A resilient image component specially designed for profile pictures.
 *
 * Features:
 * - Handles loading errors gracefully with fallback icon
 * - Detects and recovers from image load timeouts
 * - Automatically retries loading when browser tab becomes visible again
 * - Handles hydration safely by avoiding dynamic values during initial render
 * - Works well with Google profile images that can sometimes time out
 *
 * Usage:
 * ```tsx
 * <ProfileImage
 *   src={user.image}
 *   alt={user.name}
 *   size={96}
 * />
 * ```
 *
 * @param props Component properties (see ProfileImageProps interface)
 * @returns A profile image or fallback icon in a circular container
 */
export default function ProfileImage({
  src,
  alt,
  size = 24,
  fallbackDelay = 5000 // Default timeout before showing fallback
}: ProfileImageProps) {
  // Track if the image has errored during loading
  const [imgError, setImgError] = useState(false);

  // Track if the image is currently loading
  const [isLoading, setIsLoading] = useState(true);

  // References to maintain state between renders
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const attemptCountRef = useRef(0);
  const maxAttempts = 3;

  // Track if the component has been hydrated (client-side only)
  const [imageUrl, setImageUrl] = useState<string | null | undefined>(src);
  const isHydrated = useRef(false);

  // Set up image loading behavior after initial render
  useEffect(() => {
    // Mark component as hydrated (client-side only)
    isHydrated.current = true;

    // Now that we're on the client, we can update the image URL with cache-busting
    // This is important for Google profile images which can have caching issues
    if (src && src.includes('googleusercontent.com')) {
      setImageUrl(`${src}${src.includes('?') ? '&' : '?'}v=${Date.now()}`);
    } else {
      setImageUrl(src);
    }

    // Exit early if no source is provided
    if (!src) return;

    // Clear any existing timeout to prevent memory leaks
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Handler for tab visibility changes - attempts to reload the image
    // when the user returns to the tab if the previous load failed
    const handleVisibilityChange = () => {
      // When tab becomes visible again, retry loading if we previously had an error
      if (!document.hidden && imgError && attemptCountRef.current < maxAttempts) {
        console.log("Tab visible again, retrying image load");
        attemptCountRef.current += 1;
        setImgError(false);
        setIsLoading(true);

        // Update the image URL with a new timestamp when retrying
        if (src && src.includes('googleusercontent.com')) {
          setImageUrl(`${src}${src.includes('?') ? '&' : '?'}v=${Date.now()}`);
        }
      }
    };

    // Register the visibility change handler
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Reset loading state for new image source
    setImgError(false);
    setIsLoading(true);
    attemptCountRef.current = 0;

    // Set a timeout to show fallback if image takes too long to load
    // This prevents indefinite loading spinner if the image request hangs
    timeoutRef.current = setTimeout(() => {
      if (isLoading) {
        console.log("Image load timeout exceeded, showing fallback");
        setImgError(true);
      }
    }, fallbackDelay);

    // Clean up on unmount or when src changes
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [src, fallbackDelay, imgError, isLoading]);

  return (
    <div
      className="relative rounded-full overflow-hidden bg-gray-100 flex items-center justify-center"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {/* Show image if source is available and no errors occurred */}
      {src && !imgError ? (
        <Image
          src={imageUrl as string}
          alt={alt}
          fill
          sizes={`${size}px`}
          className="object-cover"
          onError={() => {
            console.log("Image load error, showing fallback");
            setImgError(true);
            setIsLoading(false);
          }}
          onLoad={() => {
            console.log("Image loaded successfully");
            setIsLoading(false);
            attemptCountRef.current = 0; // Reset attempt count on successful load
          }}
          priority={size > 48} // Prioritize larger images like profile avatars
          unoptimized={true} // Skip Next.js optimization for profile images
          referrerPolicy="no-referrer"
        />
      ) : (
        // Fallback icon shown when image fails to load or no source provided
        <User
          className="text-gray-400"
          style={{
            width: `${Math.max(size/2, 16)}px`,
            height: `${Math.max(size/2, 16)}px`
          }}
        />
      )}
    </div>
  );
}
