import { router } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';

export default function Index() {
  useEffect(() => {
    // We're using setTimeout to ensure the component is fully mounted before navigation
    const redirect = setTimeout(() => {
      router.replace('/(auth)/signin');
    }, 100);
    
    return () => clearTimeout(redirect);
  }, []);

  // Show a loading indicator while redirecting
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#4F46E5" />
      <Text style={{ marginTop: 10 }}>Loading...</Text>
    </View>
  );
}