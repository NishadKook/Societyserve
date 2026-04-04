import * as ImagePicker from 'expo-image-picker';
import { api } from './api';

interface SignedUrlResponse {
  signedUrl: string;
  publicUrl: string;
  filePath: string;
}

export const uploadService = {
  getSignedUrl: (folder: string, fileName: string) =>
    api.post<SignedUrlResponse>('/uploads/signed-url', { folder, fileName }),

  uploadFile: async (signedUrl: string, fileUri: string): Promise<void> => {
    const response = await fetch(fileUri);
    const blob = await response.blob();

    const uploadRes = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': blob.type || 'image/jpeg',
      },
      body: blob,
    });

    if (!uploadRes.ok) {
      throw new Error(`Upload failed with status ${uploadRes.status}`);
    }
  },

  deleteFile: (filePath: string) =>
    api.delete('/uploads', { data: { filePath } }),
};

export async function pickImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permission to access photos was denied');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }

  return result.assets[0].uri;
}
