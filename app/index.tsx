import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ScrollView,
  Dimensions,
  TextInput,
  FlatList,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { productsCache } from './lib/productsCache'
import { useOrderStore } from './state/orderStore'
import Constants from 'expo-constants'
import { Colors, Typography, Spacing, BorderRadius, Shadows, Images, Icons, CardStyles, ButtonStyles } from './lib/design'
import { debounce } from './lib/debounce'
import { CameraScanner } from './components/CameraScanner'

const { width } = Dimensions.get('window')

export default function IndexScreen() {
  const router = useRouter()
  const { orderItems, currentOrder, startNewOrder, addManualItem } = useOrderStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [showCameraScanner, setShowCameraScanner] = useState(false)
  const fairName = (() => {
    try {
      return Constants.expoConfig?.extra?.FAIR_NAME || 'LOG MESSE'
    } catch (error) {
      console.warn('Failed to get fair name from constants:', error)
      return 'LOG MESSE'
    }
  })()

  useEffect(() => {
    // Preload products cache
    productsCache.syncProducts()
  }, [])

  // Debounced search function
  const debouncedSearch = debounce(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    setIsSearching(true)
    try {
      const results = await productsCache.searchProducts(query.trim())
      setSearchResults(results)
      setShowSearchResults(true)
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, 300)

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    debouncedSearch(query)
  }

  const handleProductSelect = (product: any) => {
    setSearchQuery('')
    setShowSearchResults(false)
    setSearchResults([])
    // Navigate to cart with scanner
    router.push('/cart?scan=true')
  }

  const handleNewOrder = () => {
    router.push('/new-order')
  }

  const handleViewOrders = () => {
    router.push('/orders')
  }

  const handleAddProduct = () => {
    router.push('/add-product')
  }

  const handleScan = async () => {
    // Create a new order if none exists
    if (!currentOrder) {
      try {
        await startNewOrder({
          fair_name: 'Fair Scanner',
          sales_rep: 'User',
          customer_name: 'Walk-in Customer',
          customer_email: '',
          note: ''
        })
      } catch (error) {
        console.error('Error creating order:', error)
        Alert.alert('Feil', 'Kunne ikke opprette ordre')
        return
      }
    }
    // Open camera scanner directly
    setShowCameraScanner(true)
  }

  const handleScanResult = async (ean: string) => {
    try {
      const { addScannedItem } = useOrderStore.getState()
      await addScannedItem(ean)
      setShowCameraScanner(false)
      // Navigate to cart to show the added item
      router.push('/cart')
    } catch (error) {
      console.error('Error handling scan result:', error)
      setShowCameraScanner(false)
    }
  }

  const handleAddToCart = async (product: any) => {
    try {
      console.log('Adding to cart:', product.name)
      
      // Validate product data
      if (!product.ean || !product.name || product.price_kr === undefined) {
        console.error('Invalid product data:', product)
        Alert.alert('Feil', 'Produktdata er ugyldig')
        return
      }
      
      // Use the current order from the hook
      let orderId = currentOrder?.id
      console.log('Current order ID:', orderId)
      
      // If no active order, create one
      if (!orderId) {
        console.log('Creating new order...')
        try {
          const newOrderId = await startNewOrder({
            fair_name: fairName,
            sales_rep: 'User', // TODO: Get from user profile
            customer_name: 'Walk-in Customer', // TODO: Get from user input
            customer_email: '',
            note: ''
          })
          console.log('New order ID:', newOrderId)
          
          if (!newOrderId) {
            throw new Error('Failed to create new order')
          }
          
          orderId = newOrderId
        } catch (orderError) {
          console.error('Error creating new order:', orderError)
          Alert.alert('Feil', 'Kunne ikke opprette ny ordre')
          return
        }
      }
      
      if (orderId) {
        console.log('Adding item to order:', orderId)
        try {
          // Add product to order
          await addManualItem(
            product.ean,
            product.name,
            product.price_kr,
            0, // No discount initially
            undefined, // No discount reason
            product.sku // Pass SKU value
          )
          
          console.log('Item added successfully')
          
          // Close search and show success feedback
          setShowSearchResults(false)
          setSearchQuery('')
        } catch (addError) {
          console.error('Error adding item to order:', addError)
          Alert.alert('Feil', 'Kunne ikke legge til produkt i ordre')
          return
        }
      } else {
        console.error('Failed to get order ID')
        Alert.alert('Feil', 'Kunne ikke finne aktiv ordre')
        return
      }
    } catch (error) {
      console.error('Error adding to cart:', error)
      Alert.alert('Feil', 'En uventet feil oppstod ved å legge til produkt')
    }
  }

  const renderSearchResult = ({ item }: { item: any }) => (
    <View style={styles.searchResultItem}>
      <TouchableOpacity 
        style={styles.searchResultContent}
        onPress={() => handleProductSelect(item)}
      >
        <Text style={styles.searchResultName}>{item.name}</Text>
        <View style={styles.searchResultDetails}>
          {item.sku && <Text style={styles.searchResultSku}>SKU: {item.sku}</Text>}
          <Text style={styles.searchResultPrice}>{item.price_kr} kr</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.addToCartButton}
        onPress={() => handleAddToCart(item)}
      >
        <Text style={styles.addToCartIcon}>+</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header with Logo and Cart */}
      <View style={styles.topHeader}>
        <Image 
          source={{ uri: Images.logo }} 
          style={styles.logo}
          resizeMode="contain"
        />
        <TouchableOpacity style={styles.cartButton} onPress={() => router.push('/cart')}>
          <Text style={styles.cartIcon}>{Icons.ShoppingCart}</Text>
          {orderItems.size > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{orderItems.size}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Section with Results */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>{Icons.Search}</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Søk i produktdatabase..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor={Colors.textLight}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {isSearching && (
            <Text style={styles.searchingIndicator}>🔍</Text>
          )}
        </View>
        
        {/* Search Results - Now positioned relative to searchSection */}
        {showSearchResults && searchResults.length > 0 && (
          <View style={styles.searchResultsContainer}>
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              style={styles.searchResultsList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}
        
        {showSearchResults && searchResults.length === 0 && searchQuery.trim().length >= 2 && !isSearching && (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>Ingen produkter funnet</Text>
          </View>
        )}
      </View>



      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Main Actions Section */}
          <View style={styles.section}>
            {/* Scan Card */}
            <TouchableOpacity style={styles.mainActionCard} onPress={handleScan}>
              <View style={[styles.cardGradient, { backgroundColor: Colors.primary }]}>
                <View style={styles.cardContent}>
                  <View style={styles.cardIconContainer}>
                    <Text style={styles.cardIcon}>{Icons.Scan}</Text>
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>Skann strekkode</Text>
                    <Text style={styles.cardSubtitle}>Skanne produkter direkte</Text>
                  </View>
                  <Text style={styles.cardArrow}>→</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* New Order Card */}
            <TouchableOpacity style={styles.mainActionCard} onPress={handleNewOrder}>
              <View style={[styles.cardGradient, { backgroundColor: Colors.primary }]}>
                <View style={styles.cardContent}>
                  <View style={styles.cardIconContainer}>
                    <Text style={styles.cardIcon}>{Icons.ShoppingCart}</Text>
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>Ny ordre</Text>
                    <Text style={styles.cardSubtitle}>Opprett en ny ordre for kunde</Text>
                  </View>
                  <Text style={styles.cardArrow}>→</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* View Orders Card */}
            <TouchableOpacity style={styles.mainActionCard} onPress={handleViewOrders}>
              <View style={[styles.cardGradient, { backgroundColor: Colors.primary }]}>
                <View style={styles.cardContent}>
                  <View style={styles.cardIconContainer}>
                    <Text style={styles.cardIcon}>{Icons.Orders}</Text>
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>Se ordrer</Text>
                    <Text style={styles.cardSubtitle}>Bla gjennom alle ordrer</Text>
                  </View>
                  <Text style={styles.cardArrow}>→</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Add Product Card */}
            <TouchableOpacity style={styles.mainActionCard} onPress={handleAddProduct}>
              <View style={[styles.cardGradient, { backgroundColor: Colors.primary }]}>
                <View style={styles.cardContent}>
                  <View style={styles.cardIconContainer}>
                    <Text style={styles.cardIcon}>{Icons.Products}</Text>
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>Legg til produkt</Text>
                    <Text style={styles.cardSubtitle}>Administrer produktkatalog</Text>
                  </View>
                  <Text style={styles.cardArrow}>→</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Settings Card */}
            <TouchableOpacity style={styles.mainActionCard} onPress={() => router.push('/settings')}>
              <View style={[styles.cardGradient, { backgroundColor: Colors.primary }]}>
                <View style={styles.cardContent}>
                  <View style={styles.cardIconContainer}>
                    <Text style={styles.cardIcon}>⚙️</Text>
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>Innstillinger</Text>
                    <Text style={styles.cardSubtitle}>Brukerprofil og preferanser</Text>
                  </View>
                  <Text style={styles.cardArrow}>→</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Stats Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Statistikk</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Ordre i dag</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Produkter</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Kunder</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Camera Scanner Modal */}
      {showCameraScanner && (
        <CameraScanner
          onScan={handleScanResult}
          onClose={() => setShowCameraScanner(false)}
          visible={showCameraScanner}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadows.small,
  },
  logo: {
    width: 120,
    height: 80,
    alignSelf: 'center',
  },
  cartButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Shadows.small,
  },
  cartIcon: {
    fontSize: 20,
    color: Colors.white,
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  searchSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  searchIcon: {
    fontSize: 18,
    color: Colors.textLight,
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: Spacing.sm,
  },
  searchingIndicator: {
    fontSize: 20,
    marginLeft: Spacing.sm,
  },

  searchResultsContainer: {
    position: 'relative',
    marginTop: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.medium,
    zIndex: 9999,
    elevation: 9999, // For Android
  },
  searchResultsList: {
    maxHeight: 200, // Limit height for results
    backgroundColor: Colors.white,
  },

  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultName: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  searchResultDetails: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
  },
  searchResultSku: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginRight: Spacing.sm,
  },
  searchResultPrice: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  searchResultArrow: {
    fontSize: 24,
    color: Colors.textLight,
  },
  addToCartButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
    ...Shadows.small,
  },
  addToCartIcon: {
    fontSize: 20,
    color: Colors.white,
    fontWeight: 'bold',
  },
  noResultsContainer: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  noResultsText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  mainActionCard: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  cardGradient: {
    padding: Spacing.lg,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconContainer: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  cardIcon: {
    fontSize: 28,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    ...Typography.h4,
    color: Colors.white,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  cardSubtitle: {
    ...Typography.bodySmall,
    color: Colors.white,
    opacity: 0.9,
  },
  cardArrow: {
    fontSize: 24,
    color: Colors.white,
    fontWeight: 'bold',
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.text,
    marginBottom: Spacing.md,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: Spacing.xs,
    ...Shadows.small,
  },
  statNumber: {
    ...Typography.h2,
    color: Colors.primary,
    fontWeight: '700' as const,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
})
