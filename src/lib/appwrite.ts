import { Client, Storage, ID } from 'appwrite';

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || '')
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '');

export const storage = new Storage(client);

export const uploadImage = async (file: File): Promise<string> => {
  try {
    const fileId = ID.unique();
    const response = await storage.createFile({
      bucketId: import.meta.env.VITE_BUCKET_ID || '',
      fileId: fileId,
      file: file
    });
    
    return `${import.meta.env.VITE_APPWRITE_ENDPOINT}/storage/buckets/${import.meta.env.VITE_BUCKET_ID}/files/${response.$id}/view?project=${import.meta.env.VITE_APPWRITE_PROJECT_ID}`;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image');
  }
};

export const deleteImage = async (fileId: string): Promise<void> => {
  try {
    await storage.deleteFile({
      bucketId: import.meta.env.VITE_BUCKET_ID || '',
      fileId: fileId
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    throw new Error('Failed to delete image');
  }
};

export { client };