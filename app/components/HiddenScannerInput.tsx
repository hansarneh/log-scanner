import React, { useRef, useEffect } from 'react'
import { TextInput, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'

interface HiddenScannerInputProps {
  onScan: (ean: string) => void
  autoFocus?: boolean
}

export const HiddenScannerInput: React.FC<HiddenScannerInputProps> = ({ 
  onScan, 
  autoFocus = true 
}) => {
  const inputRef = useRef<TextInput>(null)
  const scanBuffer = useRef('')
  const lastScanTime = useRef(0)
  const DEBOUNCE_MS = 500

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Small delay to ensure component is mounted
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [autoFocus])

  const handleTextChange = (text: string) => {
    const now = Date.now()
    
    // Check if this is a new scan (time gap > debounce)
    if (now - lastScanTime.current > DEBOUNCE_MS) {
      scanBuffer.current = ''
    }
    
    lastScanTime.current = now
    scanBuffer.current += text
    
    // Check if we have a complete scan (ends with Enter)
    if (scanBuffer.current.includes('\n') || scanBuffer.current.includes('\r')) {
      const ean = scanBuffer.current.trim().replace(/[\r\n]/g, '')
      
      if (ean.length >= 8 && ean.length <= 13) {
        // Valid EAN length
        onScan(ean)
        
        // Provide haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        
        // Clear buffer and refocus
        scanBuffer.current = ''
        inputRef.current?.clear()
        inputRef.current?.focus()
      }
    }
  }

  const handleKeyPress = (e: any) => {
    // Handle Enter key explicitly
    if (e.nativeEvent.key === 'Enter') {
      const ean = scanBuffer.current.trim()
      if (ean.length >= 8 && ean.length <= 13) {
        onScan(ean)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        scanBuffer.current = ''
        inputRef.current?.clear()
        inputRef.current?.focus()
      }
    }
  }

  return (
    <TextInput
      ref={inputRef}
      style={styles.hiddenInput}
      onChangeText={handleTextChange}
      onKeyPress={handleKeyPress}
      autoFocus={autoFocus}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="off"
      spellCheck={false}
      blurOnSubmit={false}
      returnKeyType="next"
      placeholder=""
      value=""
    />
  )
}

const styles = StyleSheet.create({
  hiddenInput: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    width: 1,
    height: 1,
    opacity: 0,
    zIndex: -1,
  }
})
