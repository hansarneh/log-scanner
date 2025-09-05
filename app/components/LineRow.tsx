import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert } from 'react-native'
import { LocalOrderItem } from '../lib/db'

interface LineRowProps {
  item: LocalOrderItem
  onUpdateQty: (itemId: string, qty: number) => void
  onRemove: (itemId: string) => void
  onUpdateDiscount?: (itemId: string, discount_percent: number, discount_reason?: string) => void
}

export const LineRow: React.FC<LineRowProps> = ({ item, onUpdateQty, onRemove, onUpdateDiscount }) => {
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [discountInput, setDiscountInput] = useState(item.discount_percent?.toString() || '0')
  const [reasonInput, setReasonInput] = useState(item.discount_reason || '')
  const [isEditingQty, setIsEditingQty] = useState(false)
  const [qtyInput, setQtyInput] = useState(item.qty.toString())

  const formatPrice = (kr: number) => {
    return `${kr.toFixed(0)} kr`
  }

  const formatLineTotal = () => {
    const discountedPrice = item.price_kr * (1 - (item.discount_percent || 0) / 100)
    const total = item.qty * discountedPrice
    return formatPrice(total)
  }

  const handleDiscountSave = () => {
    const discountPercent = parseFloat(discountInput) || 0
    if (discountPercent < 0 || discountPercent > 100) {
      Alert.alert('Feil', 'Rabatt må være mellom 0 og 100%')
      return
    }
    
    if (onUpdateDiscount) {
      onUpdateDiscount(item.id, discountPercent, reasonInput.trim() || undefined)
    }
    setShowDiscountModal(false)
  }

  const handleQtyEdit = () => {
    setIsEditingQty(true)
    setQtyInput(item.qty.toString())
  }

  const handleQtySave = () => {
    const newQty = parseInt(qtyInput) || 1
    if (newQty < 1) {
      Alert.alert('Feil', 'Antall må være minst 1')
      return
    }
    
    onUpdateQty(item.id, newQty)
    setIsEditingQty(false)
  }

  const handleQtyCancel = () => {
    setQtyInput(item.qty.toString())
    setIsEditingQty(false)
  }

  return (
    <View style={styles.container}>
      {/* Product Info */}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.skuText}>{item.sku || item.ean}</Text>
      </View>
      
      {/* Price */}
      <Text style={styles.priceText}>{formatPrice(item.price_kr)}</Text>
      
      {/* Quantity Display */}
      <View style={styles.qtySection}>
        {isEditingQty ? (
          <TextInput
            style={styles.qtyTextInput}
            value={qtyInput}
            onChangeText={setQtyInput}
            keyboardType="number-pad"
            autoFocus={true}
            selectTextOnFocus={true}
            onSubmitEditing={handleQtySave}
            onBlur={handleQtySave}
            returnKeyType="done"
          />
        ) : (
          <TouchableOpacity
            style={styles.qtyInput}
            onPress={handleQtyEdit}
          >
            <Text style={styles.qtyText}>{item.qty}</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Discount */}
      <View style={styles.discountSection}>
        <TouchableOpacity
          style={styles.discountButton}
          onPress={() => setShowDiscountModal(true)}
        >
          <Text style={styles.discountButtonText}>
            {item.discount_percent > 0 ? `${item.discount_percent}%` : '%'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Total */}
      <Text style={styles.totalText}>{formatLineTotal()}</Text>
      
      {/* Remove Button */}
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemove(item.id)}
      >
        <Text style={styles.removeButtonText}>×</Text>
      </TouchableOpacity>

      {/* Discount Modal */}
      <Modal
        visible={showDiscountModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDiscountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rediger rabatt</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Rabatt (%)</Text>
              <TextInput
                style={styles.input}
                value={discountInput}
                onChangeText={setDiscountInput}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Årsak (valgfri)</Text>
              <TextInput
                style={styles.input}
                value={reasonInput}
                onChangeText={setReasonInput}
                placeholder="F.eks. Bulk rabatt"
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDiscountModal(false)}
              >
                <Text style={styles.cancelButtonText}>Avbryt</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleDiscountSave}
              >
                <Text style={styles.saveButtonText}>Lagre</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: 'white',
    minHeight: 50,
  },
  productInfo: {
    flex: 2.5,
    marginRight: 6,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  skuText: {
    fontSize: 11,
    color: '#666',
  },
  priceText: {
    fontSize: 12,
    color: '#666',
    width: 55,
    textAlign: 'right',
    marginRight: 6,
  },
  qtySection: {
    alignItems: 'center',
    marginRight: 6,
  },
  qtyInput: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  qtyTextInput: {
    width: 36,
    height: 28,
    backgroundColor: 'white',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#065A4D',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  discountSection: {
    marginRight: 6,
  },
  discountButton: {
    width: 32,
    height: 28,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  discountButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065A4D',
  },
  totalText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    width: 60,
    textAlign: 'right',
    marginRight: 6,
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  saveButton: {
    backgroundColor: '#065A4D',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})
