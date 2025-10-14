import React, { useEffect, useState, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native'
import { Camera } from 'expo-camera'
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics'
import Constants from 'expo-constants'

export interface ScanFeedback {
  ean: string
  productName?: string
  price?: number
  found: boolean
}

interface CameraScannerProps {
  onScan: (ean: string) => void
  onClose?: () => void
  visible?: boolean
  lastScanFeedback?: ScanFeedback
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ 
  onScan, 
  onClose,
  visible = true,
  lastScanFeedback
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [lastScan, setLastScan] = useState<string | null>(null)
  const [scanningEnabled, setScanningEnabled] = useState(true)
  const [showFeedback, setShowFeedback] = useState(false)
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
    
    if (!data || !scanningEnabled) {
      return
    }
    
    // Streng EAN-validering: KUN siffer, 8-13 lengde
    if (!/^\d{8,13}$/.test(data)) {
      console.log('❌ Ugyldig strekkode:', { data, type, length: data.length })
      notificationAsync(NotificationFeedbackType.Error)
      Alert.alert(
        'Ugyldig strekkode', 
        `Kun EAN-8/EAN-13 strekkoder støttes.\nSkannet: "${data}" (${data.length} tegn)`
      )
      return
    }
    
    // Deaktiver skanning midlertidig for å unngå duplikater
    setScanningEnabled(false)
    setTimeout(() => setScanningEnabled(true), 800)
    
    setLastScan(data)
    setShowFeedback(true)
    
    // Skjul feedback etter 2 sekunder
    setTimeout(() => setShowFeedback(false), 2000)
    
    // Haptic feedback
    notificationAsync(NotificationFeedbackType.Success)
    
    // Call the onScan callback
    onScan(data)
    
    console.log('✅ EAN funnet og lagt til:', type, data)
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={(r) => (cameraRef.current = r)}
        style={StyleSheet.absoluteFill}
        ratio="16:9"
        autoFocus={Camera.Constants.AutoFocus.on}
        // NB: SDK 50 bruker "onBarCodeScanned" (ikke modern-API)
        onBarCodeScanned={
          scanningEnabled
            ? handleBarcodeScanned
            : undefined
        }
        // Begrens til EAN-typer for bedre ytelse
        barCodeScannerSettings={{
          barCodeTypes: [
            Camera.Constants.BarCodeType.ean13,
            Camera.Constants.BarCodeType.ean8
          ],
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
        
        {showFeedback && lastScanFeedback && (
          <View style={[
            styles.scannedOverlay, 
            !lastScanFeedback.found && styles.scannedOverlayError
          ]}>
            {lastScanFeedback.found ? (
              <>
                <Text style={styles.scannedText}>✓ {lastScanFeedback.productName}</Text>
                {lastScanFeedback.price !== undefined && (
                  <Text style={styles.scannedPrice}>{lastScanFeedback.price.toFixed(2)} kr</Text>
                )}
                <Text style={styles.scannedEAN}>EAN: {lastScanFeedback.ean}</Text>
              </>
            ) : (
              <>
                <Text style={styles.scannedText}>⚠️ Produkt ikke funnet</Text>
                <Text style={styles.scannedEAN}>EAN: {lastScanFeedback.ean}</Text>
                <Text style={styles.scannedHint}>Legg til manuelt fra skjermen</Text>
              </>
            )}
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
    bottom: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 255, 0, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  scannedOverlayError: {
    backgroundColor: 'rgba(255, 152, 0, 0.95)',
  },
  scannedText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scannedPrice: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  scannedEAN: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  scannedHint: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    marginTop: 4,
    fontStyle: 'italic',
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