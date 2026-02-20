import { Client, Storage, ID } from 'appwrite';

// Check if Appwrite is configured
const isAppwriteConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT &&
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_BUCKET_ID
  );
};

// M-4: Lazy initialization — only create client when first needed
let client: Client | null = null;
let storage: Storage | null = null;

function getStorage(): Storage | null {
  if (!isAppwriteConfigured()) return null;
  if (!storage) {
    client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '')
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');
    storage = new Storage(client);
  }
  return storage;
}

export { storage };

export const uploadImage = async (file: File): Promise<string> => {
  const store = getStorage();
  if (!store) {
    throw new Error('APPWRITE_NOT_CONFIGURED');
  }

  try {
    const fileId = ID.unique();
    const response = await store.createFile({
      bucketId: process.env.NEXT_PUBLIC_BUCKET_ID || '',
      fileId: fileId,
      file: file
    });
    
    return `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${process.env.NEXT_PUBLIC_BUCKET_ID}/files/${response.$id}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image');
  }
};

export const deleteImage = async (fileId: string): Promise<void> => {
  const store = getStorage();
  if (!store) {
    console.warn('Appwrite not configured, skipping image deletion');
    return;
  }

  try {
    await store.deleteFile({
      bucketId: process.env.NEXT_PUBLIC_BUCKET_ID || '',
      fileId: fileId
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    throw new Error('Failed to delete image');
  }
};

export { client, isAppwriteConfigured };
