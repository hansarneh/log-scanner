import React, { useEffect, useState, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native'
import { Camera } from 'expo-camera'
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics'
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
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [lastScan, setLastScan] = useState<string | null>(null)
  const [scanningEnabled, setScanningEnabled] = useState(true)
  const cameraRef = useRef<Camera | null>(null)

  // Simulator-sjekk (robust på tvers av SDK 50)
  const isSimulator =
    (Constants?.isDevice === false) && (Platform.OS === 'ios' || Platform.OS === 'android')

  useEffect(() => {
    if (!visible) return
    
    const requestPermission = async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync()
        setHasPermission(status === 'granted')
      } catch (error) {
        console.error('Error requesting camera permission:', error)
        setHasPermission(false)
      }
    }
    
    requestPermission()
  }, [visible])

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
              onPress={() => {
                const testEAN = '1234567890123'
                setLastScan(testEAN)
                onScan(testEAN)
              }}
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

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.message}>Ber om kameratilgang…</Text>
        </View>
      </View>
    )
  }

  if (!hasPermission) {
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
                const { status } = await Camera.requestCameraPermissionsAsync()
                setHasPermission(status === 'granted')
              } catch (error) {
                console.error('Error requesting camera permission:', error)
                Alert.alert('Feil', 'Kunne ikke be om kamera-tillatelse')
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

  if (!visible) {
    return null
  }

  const handleBarcodeScanned = ({ data, type }: { data: string; type: string }) => {
    console.log('🔍 Barcode scanned:', { data, type, length: data?.length })
    
    if (!data) {
      console.log('❌ No data in barcode')
      return
    }
    
    // EAN validering (8–13 siffer) - mer fleksibel
    if (/^\d{8,13}$/.test(data) || data.length >= 8) {
      if (data !== lastScan) {
        setLastScan(data)
        setScanningEnabled(false)        // debounce 1
        setTimeout(() => setScanningEnabled(true), 500) // debounce 2
        
        // Provide haptic feedback
        notificationAsync(NotificationFeedbackType.Success)
        
        // Call the onScan callback
        onScan(data)
        
        console.log('✅ EAN funnet og lagt til:', type, data)
      }
    } else {
      // Invalid barcode
      console.log('❌ Ugyldig strekkode:', { data, type, length: data.length })
      notificationAsync(NotificationFeedbackType.Error)
      Alert.alert('Ugyldig strekkode', `Strekkoden må være 8–13 siffer. Fikk: "${data}" (${data.length} tegn).`)
    }
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={(r) => (cameraRef.current = r)}
        style={StyleSheet.absoluteFill}
        ratio="16:9"
        // NB: SDK 50 bruker "onBarCodeScanned" (ikke modern-API)
        onBarCodeScanned={
          scanningEnabled
            ? handleBarcodeScanned
            : undefined
        }
        // Begrens til EAN-typer for bedre ytelse
        barCodeScannerSettings={{
          barCodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'],
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
          Sikt mot strekkoden (EAN-8/13)
        </Text>
        
        {lastScan && (
          <View style={styles.scannedOverlay}>
            <Text style={styles.scannedText}>✓ Skannet: {lastScan}</Text>
          </View>
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
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
})