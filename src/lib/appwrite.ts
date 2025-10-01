import { Client, Storage, ID } from 'appwrite';

// Check if Appwrite is configured
const isAppwriteConfigured = () => {
  return !!(
    import.meta.env.VITE_APPWRITE_ENDPOINT &&
    import.meta.env.VITE_APPWRITE_PROJECT_ID &&
    import.meta.env.VITE_BUCKET_ID
  );
};

// Only initialize client if Appwrite is configured
let client: Client | null = null;
let storage: Storage | null = null;

if (isAppwriteConfigured()) {
  client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT!)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID!);
  
  storage = new Storage(client);
}

export { storage };

export const uploadImage = async (file: File): Promise<string> => {
  // If Appwrite is not configured, return a placeholder or throw a specific error
  if (!isAppwriteConfigured() || !storage) {
    throw new Error('APPWRITE_NOT_CONFIGURED');
  }

  try {
    const fileId = ID.unique();
    const response = await storage.createFile({
      bucketId: import.meta.env.VITE_BUCKET_ID!,
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
  if (!isAppwriteConfigured() || !storage) {
    // If Appwrite is not configured, silently ignore delete requests
    console.warn('Appwrite not configured, skipping image deletion');
    return;
  }

  try {
    await storage.deleteFile({
      bucketId: import.meta.env.VITE_BUCKET_ID!,
      fileId: fileId
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    throw new Error('Failed to delete image');
  }
};

export { client, isAppwriteConfigured };
