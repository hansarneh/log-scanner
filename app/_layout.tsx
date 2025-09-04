import React from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import AuthWrapper from './components/AuthWrapper'

export default function RootLayout() {
  return (
    <AuthWrapper>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="scan" />
        <Stack.Screen name="review" />
        <Stack.Screen name="orders" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="add-product" />
      </Stack>
    </AuthWrapper>
  )
}
