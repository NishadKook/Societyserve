import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { api } from './api';

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // Check and request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined, // uses the projectId from app.json automatically
    });
    const token = tokenData.data;

    // Register token with backend
    const platform = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
    await api.post('/notifications/register-device', { token, platform });

    console.log('Push token registered:', token);
    return token;
  } catch (error) {
    console.log('Failed to register for push notifications:', error);
    return null;
  }
}

export async function removePushToken(token: string): Promise<void> {
  try {
    await api.delete('/notifications/remove-device', { data: { token } });
  } catch (error) {
    console.log('Failed to remove push token:', error);
  }
}
