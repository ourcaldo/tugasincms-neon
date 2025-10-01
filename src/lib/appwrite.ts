import { Client, Storage, ID } from 'appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

export const storage = new Storage(client);

export const uploadImage = async (file: File): Promise<string> => {
  try {
    const fileId = ID.unique();
    const response = await storage.createFile(
      process.env.NEXT_PUBLIC_BUCKET_ID || '',
      fileId,
      file
    );
    
    return `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${process.env.NEXT_PUBLIC_BUCKET_ID}/files/${response.$id}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image');
  }
};

export const deleteImage = async (fileId: string): Promise<void> => {
  try {
    await storage.deleteFile(process.env.NEXT_PUBLIC_BUCKET_ID || '', fileId);
  } catch (error) {
    console.error('Error deleting image:', error);
    throw new Error('Failed to delete image');
  }
};

export { client };