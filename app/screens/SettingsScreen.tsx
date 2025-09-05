import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Switch
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
  const [orderEmailNotifications, setOrderEmailNotifications] = useState(true)
  const [orderSummaryEmail, setOrderSummaryEmail] = useState(user?.email || '')

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Full name is required')
      return
    }

    setIsLoading(true)

    try {
      const result = await updateProfile({
        full_name: fullName.trim()
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
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContent}>
        <View style={styles.content}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Tilbake</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Innstillinger</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Brukerprofil</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>E-post</Text>
            <Text style={styles.value}>{user.email}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Fullt navn</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Skriv inn ditt fulle navn"
              />
            ) : (
              <Text style={styles.value}>{user.full_name || 'Ikke satt'}</Text>
            )}
          </View>


        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>E-post preferanser</Text>
          
          <View style={styles.field}>
            <View style={styles.switchField}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.label}>Send ordreoppsummeringer</Text>
                <Text style={styles.switchDescription}>
                  Få e-post med ordreoppsummering når ordrer fullføres
                </Text>
              </View>
              <Switch
                value={orderEmailNotifications}
                onValueChange={setOrderEmailNotifications}
                trackColor={{ false: '#E0E0E0', true: '#065A4D' }}
                thumbColor={orderEmailNotifications ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>

          {orderEmailNotifications && (
            <View style={styles.field}>
              <Text style={styles.label}>E-post for ordreoppsummeringer</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={orderSummaryEmail}
                  onChangeText={setOrderSummaryEmail}
                  placeholder="E-post adresse for ordreoppsummeringer"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <Text style={styles.value}>{orderSummaryEmail || user.email}</Text>
              )}
            </View>
          )}
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
    </SafeAreaView>
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
  scrollContent: {
    flexGrow: 1,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#065A4D',
    fontWeight: '600',
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
    backgroundColor: '#065A4D',
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
  switchField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
})
