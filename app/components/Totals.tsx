import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { LocalOrderItem } from '../lib/db'

interface TotalsProps {
  items: LocalOrderItem[]
}

export const Totals: React.FC<TotalsProps> = ({ items }) => {
  const subtotal = items.length > 0 ? items.reduce((sum, item) => sum + (item.qty * item.price_kr), 0) : 0
  const totalDiscount = items.length > 0 ? items.reduce((sum, item) => {
    const discountAmount = item.qty * item.price_kr * ((item.discount_percent || 0) / 100)
    return sum + discountAmount
  }, 0) : 0
  const total = subtotal - totalDiscount

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.totalLabel}>Delsum:</Text>
        <Text style={styles.totalValue}>kr {subtotal.toFixed(2)}</Text>
      </View>
      {totalDiscount > 0 && (
        <View style={styles.row}>
          <Text style={styles.discountLabel}>Rabatt:</Text>
          <Text style={styles.discountValue}>-kr {totalDiscount.toFixed(2)}</Text>
        </View>
      )}
      <View style={styles.row}>
        <Text style={styles.finalTotalLabel}>Totalt:</Text>
        <Text style={styles.finalTotalValue}>kr {total.toFixed(2)}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  finalTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  finalTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  discountLabel: {
    fontSize: 14,
    color: '#666',
  },
  discountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
  },
})
