// Work out the size an image ends up at after fitting inside maxWidth x maxHeight.
// Kept separate from optimizeImage so the maths can be tested without a canvas.
// The long side is scaled down to its limit and the other side follows, so the
// aspect ratio never changes. Images that already fit come back untouched.
export function computeImageSize(
  width: number,
  height: number,
  maxWidth: number = 800,
  maxHeight: number = 800
): { width: number; height: number } {
  if (width > height) {
    if (width > maxWidth) {
      height *= maxWidth / width;
      width = maxWidth;
    }
  } else {
    if (height > maxHeight) {
      width *= maxHeight / height;
      height = maxHeight;
    }
  }
  return { width, height };
}

/**
 * Optimizes an image by resizing and compressing it.
 * @param file The image file to optimize.
 * @param maxWidth The maximum width of the optimized image.
 * @param maxHeight The maximum height of the optimized image.
 * @param quality The quality of the optimized image (0 to 1).
 * @returns A promise that resolves to the optimized image as a Blob.
 */
export async function optimizeImage(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const { width, height } = computeImageSize(img.width, img.height, maxWidth, maxHeight);

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Canvas to Blob conversion failed'));
              }
            },
            'image/jpeg',
            quality
          );
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}
