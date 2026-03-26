import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/stores/auth.store';
import { userService } from '@/services/user.service';

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
  const { isAuthenticated, loadFromStorage, setProviderProfile } = useAuthStore();

  useEffect(() => {
    async function init() {
      await loadFromStorage();
      await SplashScreen.hideAsync();
    }
    void init();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
      return;
    }
    userService.getMe()
      .then((res) => {
        const profile = res.data.providerProfile;
        if (!profile) {
          router.replace('/(auth)/setup');
        } else {
          setProviderProfile(profile);
          router.replace('/(tabs)');
        }
      })
      .catch(() => {
        router.replace('/(auth)/login');
      });
  }, [isAuthenticated]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="bookings/[id]" options={{ headerShown: true, title: 'Booking Details' }} />
        <Stack.Screen name="join-society" options={{ headerShown: true, title: 'Join a Society' }} />
        <Stack.Screen name="services/index" options={{ headerShown: true, title: 'My Services' }} />
      </Stack>
    </>
  );
}
