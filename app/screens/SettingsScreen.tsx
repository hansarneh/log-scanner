import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../state/authStore'

export default function SettingsScreen() {
  const router = useRouter()
  const { user, updateProfile, signOut } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Form state
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [fairName, setFairName] = useState(user?.fair_name || '')
  const [salesRepName, setSalesRepName] = useState(user?.sales_rep_name || '')

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Full name is required')
      return
    }

    setIsLoading(true)

    try {
      const result = await updateProfile({
        full_name: fullName.trim(),
        fair_name: fairName.trim(),
        sales_rep_name: salesRepName.trim()
      })

      if (result.success) {
        Alert.alert('Success', 'Profile updated successfully')
        setIsEditing(false)
      } else {
        Alert.alert('Error', result.error || 'Failed to update profile')
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    // Reset form to current user values
    setFullName(user?.full_name || '')
    setFairName(user?.fair_name || '')
    setSalesRepName(user?.sales_rep_name || '')
    setIsEditing(false)
  }

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut }
      ]
    )
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>User not authenticated</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user.email}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
              />
            ) : (
              <Text style={styles.value}>{user.full_name || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Fair Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={fairName}
                onChangeText={setFairName}
                placeholder="Enter fair name (e.g., Myplant 2025)"
              />
            ) : (
              <Text style={styles.value}>{user.fair_name || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Sales Representative</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={salesRepName}
                onChangeText={setSalesRepName}
                placeholder="Enter sales rep name"
              />
            ) : (
              <Text style={styles.value}>{user.sales_rep_name || 'Not set'}</Text>
            )}
          </View>
        </View>

        <View style={styles.buttonContainer}>
          {isEditing ? (
            <>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.editButton]}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.buttonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, styles.addProductButton]}
          onPress={() => router.push('/add-product')}
        >
          <Text style={styles.buttonText}>Legg til produkt</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.signOutButton]}
          onPress={handleSignOut}
        >
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonContainer: {
    marginBottom: 24,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  saveButton: {
    backgroundColor: '#34C759',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  addProductButton: {
    backgroundColor: '#34C759',
  },
  signOutButton: {
    backgroundColor: '#FF9500',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#FF3B30',
    marginTop: 50,
  },
})
