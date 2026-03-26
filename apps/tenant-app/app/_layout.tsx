
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
  const { isAuthenticated, loadFromStorage, setTenantProfile, logout } = useAuthStore();

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
      </Stack>
    </>
  );
}
