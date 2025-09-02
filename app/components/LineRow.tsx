import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { LocalOrderItem } from '../lib/db'

interface LineRowProps {
  item: LocalOrderItem
  onUpdateQty: (itemId: string, qty: number) => void
  onRemove: (itemId: string) => void
}

export const LineRow: React.FC<LineRowProps> = ({ item, onUpdateQty, onRemove }) => {
  const formatPrice = (kr: number) => {
    return `kr ${kr.toFixed(2)}`
  }

  const formatLineTotal = () => {
    const total = item.qty * item.price_kr
    return formatPrice(total)
  }

  return (
    <View style={styles.container}>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.eanText}>{item.ean}</Text>
        <Text style={styles.priceText}>{formatPrice(item.price_kr)}</Text>
      </View>
      
      <View style={styles.controls}>
        <View style={styles.qtyControls}>
          <TouchableOpacity
            style={styles.qtyButton}
            onPress={() => onUpdateQty(item.id, item.qty - 1)}
            disabled={item.qty <= 1}
          >
            <Text style={[styles.qtyButtonText, item.qty <= 1 && styles.qtyButtonDisabled]}>
              -
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.qtyText}>{item.qty}</Text>
          
          <TouchableOpacity
            style={styles.qtyButton}
            onPress={() => onUpdateQty(item.id, item.qty + 1)}
          >
            <Text style={styles.qtyButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.totalSection}>
          <Text style={styles.lineTotalText}>{formatLineTotal()}</Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onRemove(item.id)}
          >
            <Text style={styles.removeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: 'white',
  },
  productInfo: {
    flex: 1,
    marginRight: 16,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  eanText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  priceText: {
    fontSize: 14,
    color: '#666',
  },
  controls: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  qtyButtonDisabled: {
    opacity: 0.5,
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
    minWidth: 20,
    textAlign: 'center',
  },
  totalSection: {
    alignItems: 'flex-end',
  },
  lineTotalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
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
})
