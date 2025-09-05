import React, { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native'
import { Camera, CameraView, useCameraPermissions } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import Constants from 'expo-constants'

interface CameraScannerProps {
  onScan: (ean: string) => void
  onClose?: () => void
  visible?: boolean
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ 
  onScan, 
  onClose,
  visible = true 
}) => {
  const [permission, requestPermission] = useCameraPermissions()
  const [lastScan, setLastScan] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(visible)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const cameraRef = useRef<CameraView>(null)

  // Check if running in simulator
  const isSimulator = Constants.platform?.ios?.simulator || Constants.platform?.android?.emulator

  // Show simulator message instead of camera
  if (isSimulator) {
    return (
      <View style={styles.container}>
        <View style={styles.simulatorContainer}>
          <Text style={styles.simulatorTitle}>Kamera ikke tilgjengelig</Text>
          <Text style={styles.simulatorText}>
            Kamera-funksjonen kan ikke testes i simulatoren.{'\n'}
            Test på en fysisk enhet for å bruke skanning.
          </Text>
          {__DEV__ && (
            <TouchableOpacity 
              style={styles.testButton}
              onPress={() => handleBarcodeScanned({ type: 'ean13', data: '1234567890123' })}
            >
              <Text style={styles.testButtonText}>Test Scan (Simulator)</Text>
            </TouchableOpacity>
          )}
          {onClose && (
            <TouchableOpacity 
              style={[styles.button, { marginTop: 20 }]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Lukk</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  // Error boundary for camera component
  if (hasError) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Kamera-feil</Text>
          <Text style={styles.errorText}>{errorMessage || 'Kunne ikke åpne kamera'}</Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => {
              setHasError(false)
              setErrorMessage('')
              setLastScan(null)
            }}
          >
            <Text style={styles.buttonText}>Prøv igjen</Text>
          </TouchableOpacity>
          {onClose && (
            <TouchableOpacity 
              style={[styles.button, { marginTop: 10, backgroundColor: '#666' }]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Lukk</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  useEffect(() => {
    setIsActive(visible)
    if (visible) {
      setLastScan(null)
    }
  }, [visible])

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (!data) return
    
    // Debounce: avoid spam by checking last scanned value
    if (data === lastScan) return
    
    // Validate EAN length (8-13 digits)
    if (data.length >= 8 && data.length <= 13 && /^\d+$/.test(data)) {
      setLastScan(data)
      
      // Provide haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      
      // Call the onScan callback
      onScan(data)
      
      console.log('EAN funnet:', data)
    } else {
      // Invalid barcode
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Alert.alert('Ugyldig strekkode', `Strekkoden må være 8-13 siffer. Fikk: "${data}" (${data.length} tegn)`)
    }
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.message}>Ber om kamera-tillatelse...</Text>
        </View>
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.message}>Ingen tilgang til kamera</Text>
          <Text style={styles.permissionSubtext}>
            Appen trenger tilgang til kameraet for å skanne strekkoder
          </Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={async () => {
              try {
                const result = await requestPermission()
                if (!result.granted) {
                  setErrorMessage('Kamera-tillatelse ble avvist. Vennligst gå til innstillinger og aktiver kamera-tilgang.')
                  setHasError(true)
                }
              } catch (error) {
                console.error('Error requesting camera permission:', error)
                setErrorMessage('Kunne ikke be om kamera-tillatelse')
                setHasError(true)
              }
            }}
          >
            <Text style={styles.buttonText}>Be om tillatelse</Text>
          </TouchableOpacity>
          {onClose && (
            <TouchableOpacity 
              style={[styles.button, { marginTop: 10, backgroundColor: '#666' }]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Lukk</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }


  if (!isActive) {
    return null
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        onModernBarcodeScanned={handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8'] as const,
        }}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onError={(error) => {
          console.error('CameraScanner: Camera error:', error)
          setErrorMessage(`Kamera-feil: ${error.message || 'Ukjent feil'}`)
          setHasError(true)
        }}
      />
      
      {/* Overlay with scanning area */}
      <View style={styles.overlay}>
        <View style={styles.scanArea}>
          <View style={styles.corner} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        
        <Text style={styles.instructionText}>
          Sikt mot strekkoden – støtter EAN-8 og EAN-13
        </Text>
        
        {lastScan && (
          <View style={styles.scannedOverlay}>
            <Text style={styles.scannedText}>✓ Skannet: {lastScan}</Text>
          </View>
        )}
        
        {/* Test button for debugging */}
        {__DEV__ && (
          <TouchableOpacity 
            style={styles.testButton}
            onPress={() => handleBarcodeScanned({ type: 'ean13', data: '1234567890123' })}
          >
            <Text style={styles.testButtonText}>Test Scan</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Close button */}
      {onClose && (
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={onClose}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 150,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#00ff00',
    borderWidth: 3,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    top: 0,
    left: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    left: 'auto',
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    top: 'auto',
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  scannedOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    backgroundColor: 'rgba(0, 255, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  scannedText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  message: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  testButton: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
  },
  permissionSubtext: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
  },
  errorTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  simulatorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
  },
  simulatorTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  simulatorText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
})
