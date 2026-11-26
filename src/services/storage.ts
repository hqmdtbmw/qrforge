import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';
import { optimizeImage } from '../lib/image';

export async function uploadImage(file: File, path: string, maxWidth = 800, maxHeight = 800, quality = 0.8) {
  console.log(`[Storage] Starting upload for ${file.name} to ${path}`);
  try {
    let uploadData: Blob | File = file;
    
    try {
      console.log(`[Storage] Optimizing image...`);
      uploadData = await optimizeImage(file, maxWidth, maxHeight, quality);
      console.log(`[Storage] Optimization complete. Size: ${uploadData.size} bytes`);
    } catch (optError) {
      console.warn(`[Storage] Optimization failed, uploading original file:`, optError);
      uploadData = file;
    }

    const storageRef = ref(storage, path);
    console.log(`[Storage] Uploading to Firebase...`);
    const snapshot = await uploadBytes(storageRef, uploadData);
    console.log(`[Storage] Upload successful. Fetching download URL...`);
    const url = await getDownloadURL(snapshot.ref);
    console.log(`[Storage] Download URL: ${url}`);
    return url;
  } catch (error) {
    console.error('[Storage] Upload error:', error);
    throw error;
  }
}

export async function deleteImage(url: string) {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
}
