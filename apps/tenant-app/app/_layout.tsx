
import { useEffect, useRef } from 'react';
import { Stack, router } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/stores/auth.store';
import { userService } from '@/services/user.service';
import { registerForPushNotifications } from '@/services/notification.service';

// Show notifications even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { isAuthenticated, loadFromStorage, setTenantProfile, logout } = useAuthStore();
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    async function init() {
      await loadFromStorage();
      await SplashScreen.hideAsync();
    }
    void init();
  }, []);

  // Register for push notifications when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    registerForPushNotifications();

    // Listen for incoming notifications while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
    });

    // Listen for user tapping on a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification tapped:', response);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
      return;
    }
    // Fetch profile to check approval status
    userService.getMe()
      .then((res) => {
        const profile = res.data.tenantProfile;
        if (!profile) {
          router.replace('/(auth)/setup');
        } else if (profile.approvalStatus === 'PENDING') {
          setTenantProfile(profile);
          router.replace('/(auth)/pending');
        } else if (profile.approvalStatus === 'APPROVED') {
          setTenantProfile(profile);
          router.replace('/(tabs)');
        } else {
          // REJECTED — logout and restart
          void logout();
        }
      })
      .catch(() => {
        void logout().then(() => router.replace('/(auth)/login'));
      });
  }, [isAuthenticated]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="providers/category/[category]" options={{ headerShown: true, title: 'Providers' }} />
        <Stack.Screen name="providers/[providerId]/index" options={{ headerShown: true, title: 'Provider' }} />
        <Stack.Screen name="providers/[providerId]/book" options={{ headerShown: true, title: 'Book Service' }} />
        <Stack.Screen name="bookings/[id]" options={{ headerShown: true, title: 'Booking Details' }} />
        <Stack.Screen name="community/[postId]" options={{ headerShown: true, title: 'Post' }} />
        <Stack.Screen name="complaints/new" options={{ headerShown: true, title: 'File Complaint' }} />
        <Stack.Screen name="payments/checkout" options={{ headerShown: true, title: 'Payment' }} />
      </Stack>
    </>
  );
}
