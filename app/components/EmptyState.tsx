import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface EmptyStateProps {
  title: string
  message: string
  icon?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, message, icon }) => {
  return (
    <View style={styles.container}>
      {icon && (
        <Text style={styles.icon}>{icon}</Text>
      )}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#F8F9FA',
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
})
