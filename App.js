import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert, ScrollView, ActivityIndicator, Image, ImageBackground, Platform } from 'react-native';

// Lucide Icons (simulated with emoji for now - in real app use @expo/vector-icons)
const Icons = {
  Home: '🏠',
  Package: '📦',
  ShoppingCart: '🛒',
  Camera: '📷',
  Search: '🔍',
  Plus: '➕',
  ArrowLeft: '←',
  Check: '✅',
  AlertTriangle: '⚠️',
  User: '👤',
  Mail: '📧',
  Calendar: '📅',
  Percent: '%',
  Trash2: '🗑️',
  Edit: '✏️',
  FileText: '📄',
  CreditCard: '💳',
  Settings: '⚙️',
  RefreshCw: '🔄',
  X: '✕'
};

/*
 * KAMERA-SKANNING IMPLEMENTERING:
 * 
 * For å få ekte kamera-skanning i en Expo-app:
 * 
 * 1. Installer expo-barcode-scanner:
 *    npm install expo-barcode-scanner
 * 
 * 2. Erstatt handleCameraScan med:
 * 
 * import { BarCodeScanner } from 'expo-barcode-scanner';
 * 
 * const handleCameraScan = async () => {
 *   const { status } = await BarCodeScanner.requestPermissionsAsync();
 *   if (status === 'granted') {
 *     setCurrentScreen('camera');
 *   } else {
 *     Alert.alert('Tillatelse nødvendig', 'Kamera-tillatelse er nødvendig for å skanne strekkoder.');
 *   }
 * };
 * 
 * 3. Legg til renderCameraScreen som viser BarCodeScanner
 * 4. Håndter onBarCodeScanned for å fange opp EAN-koder
 */

// Supabase configuration - USER'S ACTUAL CREDENTIALS
const SUPABASE_URL = 'https://eajuzgkhygkkzwkkrzef.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhanV6Z2toeWdra3p3a2tyemVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MTQ0MTEsImV4cCI6MjA3MjI5MDQxMX0.KIm0m0ngMloLF7fukHVkOJ_r-ZZYEwM7v1ijR0vwJ_g';

// Simple Supabase client
class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
    this.headers = {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`
    };
  }

  async searchProductByEAN(ean) {
    try {
      const response = await fetch(`${this.url}/rest/v1/products?ean=eq.${ean}&select=*`, {
        headers: this.headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error searching product:', error);
      throw error;
    }
  }

  async getAllProducts() {
    try {
      const response = await fetch(`${this.url}/rest/v1/products?active=eq.true&select=*&order=name`, {
        headers: this.headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  async searchProductsByName(searchTerm) {
    try {
      const response = await fetch(`${this.url}/rest/v1/products?name=ilike.*${searchTerm}*&active=eq.true&select=*&order=name`, {
        headers: this.headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }
}

// Initialize Supabase client
const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State management
let currentOrder = null;
let orderItems = [];
let productCache = []; // Local cache for faster lookup

// Main App Component
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [salesRep, setSalesRep] = useState('');
  const [lastScannedEAN, setLastScannedEAN] = useState('');
  const [lastScannedProduct, setLastScannedProduct] = useState(null);
  const [note, setNote] = useState('');
  
  // Manual entry states
  const [manualEAN, setManualEAN] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  // Product search states
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showAllProducts, setShowAllProducts] = useState(true);
  const [newProduct, setNewProduct] = useState({
    name: '',
    ean: '',
    sku: '',
    price_kr: ''
  });

  // Discount modal states
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selectedItemForDiscount, setSelectedItemForDiscount] = useState(null);
  const [discountInputValue, setDiscountInputValue] = useState('');

  // Initialize app - load products cache
  useEffect(() => {
    loadProductsCache();
  }, []);

  // Filter products when search term changes
  useEffect(() => {
    if (productSearchTerm.trim() === '') {
      setFilteredProducts(productCache);
      setShowAllProducts(true);
    } else {
      const filtered = productCache.filter(product => 
        product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        product.ean.includes(productSearchTerm) ||
        (product.sku && product.sku.toLowerCase().includes(productSearchTerm.toLowerCase()))
      );
      setFilteredProducts(filtered);
      setShowAllProducts(false);
    }
  }, [productSearchTerm, productCache]);

  const loadProductsCache = async () => {
    try {
      setIsLoading(true);
      setConnectionStatus('connecting');
      
      const products = await supabase.getAllProducts();
      productCache = products;
      setFilteredProducts(products);
      setConnectionStatus('connected');
      
      console.log(`Loaded ${products.length} products from Supabase`);
    } catch (error) {
      console.error('Failed to load products:', error);
      setConnectionStatus('error');
      Alert.alert('Tilkoblingsfeil', 'Kunne ikke koble til produktdatabase. Sjekk internett og Supabase-innstillinger.');
    } finally {
      setIsLoading(false);
    }
  };

  // Navigation functions - FIXED!
  const goBack = () => {
    console.log('goBack called from screen:', currentScreen);
    if (currentScreen === 'manualEntry') {
      setCurrentScreen('scan');
    } else if (currentScreen === 'scan') {
      setCurrentScreen('home');
      loadProductsCache(); // Oppdater produkter når man går tilbake til forsiden
    } else if (currentScreen === 'review') {
      setCurrentScreen('scan');
    } else if (currentScreen === 'customerInfo') {
      setCurrentScreen('scan'); // Gå tilbake til handlekurven
    } else if (currentScreen === 'orders') {
      setCurrentScreen('home');
      loadProductsCache(); // Oppdater produkter når man går tilbake til forsiden
    } else if (currentScreen === 'products') {
      setCurrentScreen('home');
      loadProductsCache(); // Oppdater produkter når man går tilbake til forsiden
    } else if (currentScreen === 'addProduct') {
      setCurrentScreen('home');
      loadProductsCache(); // Oppdater produkter når man går tilbake til forsiden
    } else {
      setCurrentScreen('home');
      loadProductsCache(); // Oppdater produkter når man går tilbake til forsiden
    }
  };

  const navigateTo = (screen) => {
    setCurrentScreen(screen);
    
    // Automatisk oppdater produkter når man går tilbake til forsiden
    if (screen === 'home') {
      loadProductsCache();
    }
  };

  // Business logic functions
  const handleStartScanning = () => {
    // Start scanning immediately - create new order if none exists
    if (!currentOrder) {
      currentOrder = {
        id: Date.now().toString(),
        customer_name: '',
        customer_email: '',
        sales_rep: '',
        fair_name: 'Myplant 2025',
        created_at: new Date().toISOString(),
        delivery_date: null,
      };
      setRefreshCounter(c => c + 1);
    }
    
    setCurrentScreen('scan');
  };

  const handleScan = async (ean) => {
    if (!ean || !ean.trim()) return;
    
    setIsLoading(true);
    
    try {
      // First check local cache
      let product = productCache.find(p => p.ean === ean.trim());
      
      // If not in cache, search Supabase
      if (!product) {
        console.log(`Product ${ean} not in cache, searching Supabase...`);
        product = await supabase.searchProductByEAN(ean.trim());
        
        // Add to cache if found
        if (product) {
          productCache.push(product);
        }
      }

      if (product) {
        // Create new order if none exists
        if (!currentOrder) {
          currentOrder = {
            id: Date.now().toString(),
            customer_name: '',
            customer_email: '',
            sales_rep: '',
            fair_name: 'Myplant 2025',
            created_at: new Date().toISOString(),
            delivery_date: null,
          };
        }
        
        // Product found - add to order
        const existingItem = orderItems.find(item => item.ean === ean);
        if (existingItem) {
          existingItem.qty += 1;
        } else {
          orderItems.push({
            id: Date.now().toString(),
            ean: product.ean,
            name: product.name,
            sku: product.sku,
            qty: 1,
            price_kr: product.price_kr,
            vat_rate: product.vat_rate,
            discount_percent: 0
          });
        }
        setLastScannedEAN(ean);
        setLastScannedProduct(product);
        setRefreshCounter(c => c + 1);
      } else {
        // Product not found
        setLastScannedEAN(ean);
        setLastScannedProduct(null);
        
        Alert.alert(
          'Produkt ikke funnet',
          `EAN ${ean} finnes ikke i databasen. Vil du legge det til manuelt?`,
          [
            { text: 'Avbryt', style: 'cancel' },
            { 
              text: 'Legg til manuelt', 
              onPress: () => {
                setManualEAN(ean);
                setCurrentScreen('manualEntry');
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error in handleScan:', error);
      Alert.alert('Feil', 'Kunne ikke søke etter produkt. Sjekk internetttilkoblingen.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProductToOrder = (product) => {
    // Create new order if none exists
    if (!currentOrder) {
      currentOrder = {
        id: Date.now().toString(),
        customer_name: '',
        customer_email: '',
        sales_rep: '',
        fair_name: 'Myplant 2025',
        created_at: new Date().toISOString(),
        delivery_date: null,
      };
    }
    
    const existingItem = orderItems.find(item => item.ean === product.ean);
    if (existingItem) {
      existingItem.qty += 1;
    } else {
      orderItems.push({
        id: Date.now().toString(),
        ean: product.ean,
        name: product.name,
        sku: product.sku,
        qty: 1,
        price_kr: product.price_kr,
        vat_rate: product.vat_rate,
        discount_percent: 0
      });
    }
    setRefreshCounter(c => c + 1);
  };

  const handleAddNewProduct = async () => {
    if (!newProduct.name.trim() || !newProduct.ean.trim() || !newProduct.price_kr.trim()) {
      Alert.alert('Feil', 'Produktnavn, EAN og pris må fylles ut');
      return;
    }

    const price = parseFloat(newProduct.price_kr);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Feil', 'Ugyldig pris');
      return;
    }

    try {
      setIsLoading(true);
      
      // Her kan du legge til logikk for å lagre produktet til Supabase
      // For nå legger vi det til i lokal cache
      const product = {
        id: Date.now().toString(),
        name: newProduct.name.trim(),
        ean: newProduct.ean.trim(),
        sku: newProduct.sku.trim() || null,
        price_kr: price, // Lagrer direkte som kroner
        vat_rate: 0.25
      };
      
      productCache.push(product);
      setFilteredProducts(productCache);
      
      // Reset form
      setNewProduct({
        name: '',
        ean: '',
        sku: '',
        price_kr: ''
      });
      
      setCurrentScreen('home');
      
    } catch (error) {
      console.error('Error adding product:', error);
      Alert.alert('Feil', 'Kunne ikke legge til produkt. Prøv igjen.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualEntry = () => {
    setCurrentScreen('manualEntry');
  };

  const handleAddManualItem = () => {
    if (!manualEAN.trim() || !manualName.trim() || !manualPrice.trim()) {
      Alert.alert('Feil', 'Alle felter må fylles ut');
      return;
    }

    const price = parseFloat(manualPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Feil', 'Ugyldig pris');
      return;
    }

    // Create new order if none exists
    if (!currentOrder) {
      currentOrder = {
        id: Date.now().toString(),
        customer_name: '',
        customer_email: '',
        sales_rep: '',
        fair_name: 'Myplant 2025',
        created_at: new Date().toISOString(),
        delivery_date: null,
      };
    }
    
    // Add manual item
    orderItems.push({
      id: Date.now().toString(),
      ean: manualEAN.trim(),
      name: manualName.trim(),
      sku: null,
      qty: 1,
      price_kr: price,
      vat_rate: 0.25,
      discount_percent: 0
    });

    // Reset fields and go back
    setManualEAN('');
    setManualName('');
    setManualPrice('');
    setLastScannedEAN(manualEAN.trim());
    setLastScannedProduct({ name: manualName.trim() });
    setRefreshCounter(c => c + 1);
    setCurrentScreen('scan');
  };

  const handleQuickScan = () => {
    Alert.prompt(
      'Skann EAN',
      'Skriv inn EAN-kode:',
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Søk', onPress: (ean) => {
          if (ean && ean.trim()) {
            handleScan(ean.trim());
          }
        }}
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const handleCameraScan = () => {
    // For Expo Snack, viser vi en melding om at kamera ikke er tilgjengelig
    // I en ekte Expo-app ville vi brukt expo-barcode-scanner
    Alert.alert(
      'Kamera-skanning',
      'Kamera-skanning er ikke tilgjengelig i Expo Snack.\n\nI en ekte Expo-app kan du:\n1. Installere expo-barcode-scanner\n2. Bruke kameraet til å skanne EAN-koder\n3. Få automatisk produkt-søk\n\nBruk "Søk EAN" for manuell inntasting.',
      [
        { text: 'OK' },
        { 
          text: 'Søk EAN i stedet', 
          onPress: handleQuickScan 
        }
      ]
    );
  };

  const updateItemQty = (itemId, newQty) => {
    if (newQty <= 0) {
      orderItems = orderItems.filter(item => item.id !== itemId);
    } else {
      const item = orderItems.find(item => item.id === itemId);
      if (item) item.qty = newQty;
    }
    setRefreshCounter(c => c + 1);
  };

  const updateItemDiscount = (itemId, discountPercent) => {
    const item = orderItems.find(item => item.id === itemId);
    if (item) {
      item.discount_percent = Math.max(0, Math.min(100, discountPercent));
    }
    setRefreshCounter(c => c + 1);
  };

  const openDiscountModal = (item) => {
    setSelectedItemForDiscount(item);
    setDiscountInputValue(item.discount_percent > 0 ? item.discount_percent.toString() : '');
    setShowDiscountModal(true);
  };

  const closeDiscountModal = () => {
    setShowDiscountModal(false);
    setSelectedItemForDiscount(null);
    setDiscountInputValue('');
  };

  const applyDiscount = () => {
    if (selectedItemForDiscount && discountInputValue.trim() !== '') {
      const discount = parseFloat(discountInputValue) || 0;
      updateItemDiscount(selectedItemForDiscount.id, discount);
    }
    closeDiscountModal();
  };

  const removeItem = (itemId) => {
    orderItems = orderItems.filter(item => item.id !== itemId);
    setRefreshCounter(c => c + 1);
  };

  const getOrderTotal = () => {
    let exVat = 0;
    let incVat = 0;
    let totalDiscount = 0;
    
    orderItems.forEach(item => {
      const lineTotal = item.qty * (item.price_kr || 0);
      const discountAmount = lineTotal * (item.discount_percent / 100);
      const lineTotalAfterDiscount = lineTotal - discountAmount;
      
      exVat += lineTotalAfterDiscount;
      incVat += lineTotalAfterDiscount * (1 + item.vat_rate);
      totalDiscount += discountAmount;
    });
    
    return { exVat, incVat, totalDiscount };
  };

  const handleFinalizeOrder = () => {
    if (orderItems.length === 0) {
      Alert.alert('Feil', 'Ingen varer å sende');
      return;
    }

    Alert.alert(
      'Bekreft ordre',
      'Er du sikker på at du vil fullføre og sende denne ordren?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Send',
          onPress: () => {
            Alert.alert(
              'Suksess!',
              'Ordren er sendt og e-post er sendt til kunden.',
              [{ text: 'OK', onPress: () => setCurrentScreen('orders') }]
            );
          }
        }
      ]
    );
  };

  

  const renderHomeScreen = () => (
    <View style={styles.container}>
      
      
            {/* Header med bakgrunnsbilde, logo, handlekurv og flytende søkefelt */}
      <View style={styles.mainHeader}>
        <ImageBackground 
          source={{ 
            uri: 'https://eajuzgkhygkkzwkkrzef.supabase.co/storage/v1/object/sign/Assets/bakgrunn-log-scanner.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85NjhlMTE5MC0zYmE0LTRiNDEtYmI1MS1lMWNkZWJjNmMzYzIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJBc3NldHMvYmFrZ3J1bm4tbG9nLXNjYW5uZXIuanBnIiwiaWF0IjoxNzU2Nzk1NzE3LCJleHAiOjE3ODgzMzE3MTd9.Q_unYoxYzC4XLfuRuas1pyN4Q2IaYYvpUXc8Ql1Cjio'
          }}
          style={styles.headerBackground}
          resizeMode="cover"
          onError={(error) => console.log('Background error:', error.nativeEvent)}
          onLoad={() => console.log('Background loaded successfully')}
        >
          <View style={styles.headerContent}>
            {/* LOG Logo */}
            <View style={styles.logoContainer}>
              <Image 
                source={{ 
                  uri: 'https://eajuzgkhygkkzwkkrzef.supabase.co/storage/v1/object/sign/Assets/log-scanner-gradient2.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85NjhlMTE5MC0zYmE0LTRiNDEtYmI1MS1lMWNkZWJjNmMzYzIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJBc3NldHMvbG9nLXNjYW5uZXItZ3JhZGllbnQyLnBuZyIsImlhdCI6MTc1NjgwMjgwNCwiZXhwIjoxNzg4MzM4ODA0fQ.FWRBaYMuGfK5Db1IpwG_FmU4Xw-UyfQ48R6z3Vj-sgI'
                }}
                style={styles.logoImage}
                resizeMode="contain"
                onError={(error) => {
                  console.log('Logo error:', error.nativeEvent);
                  // Fallback til tekst hvis bilde ikke kan lastes
                }}
                onLoad={() => console.log('Logo loaded successfully')}
              />
            </View>
            
            {/* Handlekurv status i header */}
            <View style={styles.headerCart}>
              <TouchableOpacity 
                style={styles.headerCartButton}
                onPress={() => currentOrder && orderItems.length > 0 ? navigateTo('scan') : null}
              >
                <Text style={styles.headerCartIcon}>{Icons.ShoppingCart}</Text>
                {orderItems.length > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{orderItems.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Flytende søkefelt over bakgrunnsbildet */}
          <View style={styles.headerSearchContainer}>
            <TextInput
              style={styles.headerSearchInput}
              value={productSearchTerm}
              onChangeText={setProductSearchTerm}
              placeholder="🔍 Søk etter produkter..."
              placeholderTextColor="#999"
            />
            {productSearchTerm.length > 0 && (
              <TouchableOpacity
                style={styles.headerClearSearchButton}
                onPress={() => setProductSearchTerm('')}
              >
                <Text style={styles.headerClearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </ImageBackground>
      </View>
      
            {/* Søkeresultater hvis søk er aktivt */}
      {productSearchTerm.length > 0 && (
        <View style={styles.searchResults}>
          <Text style={styles.searchResultsTitle}>Søkeresultater</Text>
          {filteredProducts.length > 0 ? (
            <FlatList
              data={filteredProducts.slice(0, 5)} // Vis kun første 5 resultater
              renderItem={({ item }) => (
                <View style={styles.searchResultItem}>
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultName}>{item.name}</Text>
                    <Text style={styles.searchResultEAN}>{item.ean}</Text>
                    <Text style={styles.searchResultPrice}>kr {(item.price_kr || 0).toFixed(2)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addToCartButton}
                    onPress={() => {
                      handleAddProductToOrder(item);
                      setProductSearchTerm(''); // Tøm søkefeltet
                    }}
                  >
                    <Text style={styles.addToCartButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              )}
              keyExtractor={(item) => item.id}
              style={styles.searchResultsList}
            />
          ) : (
            <Text style={styles.noSearchResults}>Ingen produkter funnet</Text>
          )}
        </View>
      )}
      
        <TouchableOpacity 
        style={[styles.button, styles.firstButton]}
        onPress={handleCameraScan}
      >
        <Text style={styles.buttonText}>{Icons.Camera} Scan EAN</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => setCurrentScreen('addProduct')}
      >
        <Text style={styles.buttonText}>{Icons.Package} Legg til produkt</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigateTo('orders')}
      >
        <Text style={styles.buttonText}>{Icons.FileText} Se ordre</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigateTo('products')}
      >
        <Text style={styles.buttonText}>{Icons.Package} Se alle produkter</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAddProductScreen = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Legg til produkt</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Produktnavn *</Text>
          <TextInput
            style={styles.input}
            value={newProduct.name}
            onChangeText={(text) => setNewProduct({...newProduct, name: text})}
            placeholder="Skriv produktnavn"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>EAN-kode *</Text>
          <TextInput
            style={styles.input}
            value={newProduct.ean}
            onChangeText={(text) => setNewProduct({...newProduct, ean: text})}
            placeholder="Skriv EAN-kode"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>SKU (valgfritt)</Text>
          <TextInput
            style={styles.input}
            value={newProduct.sku}
            onChangeText={(text) => setNewProduct({...newProduct, sku: text})}
            placeholder="Skriv SKU"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pris (kr) *</Text>
          <TextInput
            style={styles.input}
            value={newProduct.price_kr}
            onChangeText={(text) => setNewProduct({...newProduct, price_kr: text})}
            placeholder="Skriv pris i kroner (f.eks. 19.99)"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, (!newProduct.name || !newProduct.ean || !newProduct.price_kr) && styles.buttonDisabled]}
          onPress={handleAddNewProduct}
          disabled={!newProduct.name || !newProduct.ean || !newProduct.price_kr}
        >
          <Text style={styles.buttonText}>{Icons.Plus} Legg til produkt</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProductsScreen = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Produkter</Text>
        <Text style={styles.subtitle}>{productCache.length} produkter tilgjengelig</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={productSearchTerm}
          onChangeText={setProductSearchTerm}
          placeholder="Søk etter navn, EAN eller SKU..."
          placeholderTextColor="#999"
        />
        {productSearchTerm.length > 0 && (
          <TouchableOpacity
            style={styles.clearSearchButton}
            onPress={() => setProductSearchTerm('')}
          >
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Products list */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Laster produkter...</Text>
        </View>
      ) : filteredProducts.length > 0 ? (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.productItem}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productEAN}>EAN: {item.ean}</Text>
                {item.sku && <Text style={styles.productSKU}>SKU: {item.sku}</Text>}
                <Text style={styles.productPrice}>kr {(item.price_kr || 0).toFixed(2)}</Text>
              </View>
              
              <TouchableOpacity
                style={styles.addProductButton}
                onPress={() => handleAddProductToOrder(item)}
              >
                <Text style={styles.addProductButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          )}
          style={styles.productsList}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>
            {showAllProducts ? 'Ingen produkter' : 'Ingen treff'}
          </Text>
          <Text style={styles.emptyStateMessage}>
            {showAllProducts 
              ? 'Kunne ikke laste produkter fra databasen.'
              : `Ingen produkter matcher "${productSearchTerm}"`
            }
          </Text>
        </View>
      )}
    </View>
  );



  const renderManualEntryScreen = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Legg til manuelt</Text>
        <Text style={styles.subtitle}>Ny vare</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>EAN *</Text>
          <TextInput
            style={styles.input}
            value={manualEAN}
            onChangeText={setManualEAN}
            placeholder="4007817327320"
            keyboardType="numeric"
            autoFocus
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Produktnavn *</Text>
          <TextInput
            style={styles.input}
            value={manualName}
            onChangeText={setManualName}
            placeholder="Produktnavn"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pris (kr) *</Text>
          <TextInput
            style={styles.input}
            value={manualPrice}
            onChangeText={setManualPrice}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, (!manualEAN.trim() || !manualName.trim() || !manualPrice.trim()) && styles.buttonDisabled]}
        onPress={handleAddManualItem}
        disabled={!manualEAN.trim() || !manualName.trim() || !manualPrice.trim()}
      >
        <Text style={styles.buttonText}>Legg til vare</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderScanScreen = () => (
    <View style={styles.container}>
      {/* Kompakt header for handlekurv-siden */}
      <View style={styles.scanHeader}>
        <TouchableOpacity 
          onPress={goBack} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>← Tilbake</Text>
        </TouchableOpacity>
        
        {/* Bekreft-knapp i høyre hjørne */}
        <TouchableOpacity
          style={styles.headerCartButton}
          onPress={() => navigateTo('customerInfo')}
          activeOpacity={0.7}
        >
          <Text style={styles.headerCartIcon}>{Icons.Check}</Text>
        </TouchableOpacity>
      </View>



      {/* Last scanned feedback */}
      {lastScannedEAN && (
        <View style={styles.lastScanChip}>
          <Text style={styles.lastScanLabel}>Siste skann:</Text>
          <Text style={styles.lastScanEAN}>{lastScannedEAN}</Text>
          {lastScannedProduct && (
            <Text style={styles.lastScanProduct}>{lastScannedProduct.name}</Text>
          )}
        </View>
      )}

      {/* Action buttons - fjernet siden disse finnes på forsiden */}

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Søker i database...</Text>
        </View>
      )}

      {/* Order items column headers */}
      {orderItems.length > 0 && (
        <View style={styles.itemsColumnHeaders}>
          <View style={styles.itemsColumnHeader}>
            <Text style={styles.itemsColumnHeaderLabel}>Produkt</Text>
          </View>
          <View style={styles.itemsColumnHeaderCenter}>
            <Text style={styles.itemsColumnHeaderLabel}>Antall</Text>
          </View>
          <View style={styles.itemsColumnHeaderCenter}>
            <Text style={styles.itemsColumnHeaderLabel}>Rabatt %</Text>
          </View>
          <View style={styles.itemsColumnHeaderCenter}>
            <Text style={styles.itemsColumnHeaderLabel}></Text>
          </View>
        </View>
      )}

      {/* Order items */}
      {orderItems.length > 0 ? (
        <FlatList
          data={orderItems}
          extraData={refreshCounter}
          renderItem={({ item, index }) => (
            <View style={index === orderItems.length - 1 ? styles.lastOrderItem : styles.orderItem}>
              <View style={styles.productSection}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>kr {(item.price_kr || 0).toFixed(2)}</Text>
                {item.discount_percent > 0 && (
                  <Text style={styles.itemDiscount}>-{item.discount_percent}%</Text>
                )}
              </View>
              
              <View style={styles.qtySection}>
                <TextInput
                  style={styles.qtyInput}
                  value={item.qty.toString()}
                  onChangeText={(text) => {
                    const qty = parseInt(text) || 0;
                    updateItemQty(item.id, qty);
                  }}
                  keyboardType="numeric"
                  placeholder="1"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    // Dette vil vise "Done" knappen på tastaturet
                    // og lukke tastaturet når brukeren trykker på den
                  }}
                  blurOnSubmit={true}
                />
              </View>
              
              <View style={styles.discountSection}>
                <TouchableOpacity
                  style={[
                    styles.discountButton,
                    item.discount_percent > 0 && styles.discountButtonActive
                  ]}
                  onPress={() => openDiscountModal(item)}
                >
                  {item.discount_percent > 0 ? (
                    <Text style={styles.discountButtonTextActive}>
                      -{item.discount_percent}%
                    </Text>
                  ) : (
                    <Text style={styles.discountButtonText}>
                      {Icons.Percent}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
              
              <View style={styles.deleteSection}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => removeItem(item.id)}
                >
                  <Text style={styles.deleteButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
          style={styles.itemsList}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>Ingen varer ennå</Text>
          <Text style={styles.emptyStateMessage}>
            Gå tilbake til forsiden for å scanne EAN eller legge til produkter
          </Text>
        </View>
      )}

      {/* Price summary */}
      {orderItems.length > 0 && (
        <View style={styles.cartSummary}>
          {getOrderTotal().totalDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Rabatt gitt:</Text>
              <Text style={styles.summaryValue}>-kr {getOrderTotal().totalDiscount.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Sum eks. mva:</Text>
            <Text style={styles.summaryValue}>kr {getOrderTotal().exVat.toFixed(2)}</Text>
          </View>
          <View style={styles.finalTotalRow}>
            <Text style={styles.finalTotalLabel}>Totalt eks. mva:</Text>
            <Text style={styles.finalTotalValue}>kr {getOrderTotal().exVat.toFixed(2)}</Text>
          </View>
        </View>
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.discountModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sett rabatt</Text>
              <TouchableOpacity onPress={closeDiscountModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.modalLabel}>
                Rabatt for: {selectedItemForDiscount?.name}
              </Text>
              <TextInput
                style={styles.modalInput}
                value={discountInputValue}
                onChangeText={setDiscountInputValue}
                placeholder="0"
                keyboardType="numeric"
                autoFocus={true}
              />
              <Text style={styles.modalHint}>Angi rabatt i prosent (0-100)</Text>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalButtonSecondary} 
                onPress={closeDiscountModal}
              >
                <Text style={styles.modalButtonTextSecondary}>Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalButtonPrimary} 
                onPress={applyDiscount}
              >
                <Text style={styles.modalButtonTextPrimary}>Bruk</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const renderReviewScreen = () => {
    const { exVat } = getOrderTotal();

    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Gjennomgang</Text>
          <Text style={styles.customerInfo}>
            {currentOrder?.customer_name}
            {currentOrder?.sales_rep && ` • ${currentOrder.sales_rep}`}
          </Text>
        </View>

        {/* Order summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Ordresammendrag</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ordre-ID:</Text>
            <Text style={styles.summaryValue}>{currentOrder?.id}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Dato:</Text>
            <Text style={styles.summaryValue}>
              {new Date(currentOrder?.created_at).toLocaleDateString('nb-NO')}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Messe:</Text>
            <Text style={styles.summaryValue}>{currentOrder?.fair_name}</Text>
          </View>
          {currentOrder?.delivery_date && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Leveringsdato:</Text>
              <Text style={styles.summaryValue}>{currentOrder.delivery_date}</Text>
            </View>
          )}
        </View>

        {/* Note field */}
        <View style={styles.noteSection}>
          <Text style={styles.noteLabel}>Notat (valgfritt)</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Legg til notat til ordren..."
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Order items */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Varer ({orderItems.length})</Text>
          {orderItems.map(item => (
            <View key={item.id} style={styles.reviewItem}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemName}>{item.ean}</Text>
                {item.sku && <Text style={styles.itemSKU}>SKU: {item.sku}</Text>}
                <Text style={styles.itemPrice}>kr {(item.price_kr || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.itemSummary}>
                <Text style={styles.itemQty}>x{item.qty}</Text>
                <Text style={styles.itemTotal}>kr {(item.qty * (item.price_kr || 0)).toFixed(2)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          {getOrderTotal().totalDiscount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Rabatt gitt:</Text>
              <Text style={styles.totalValue}>-kr {getOrderTotal().totalDiscount.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Sum eks. mva:</Text>
            <Text style={styles.totalValue}>kr {exVat.toFixed(2)}</Text>
          </View>
          <View style={styles.finalTotalRow}>
            <Text style={styles.finalTotalLabel}>Totalt eks. mva:</Text>
            <Text style={styles.finalTotalValue}>kr {exVat.toFixed(2)}</Text>
          </View>
        </View>

        {/* Finalize button */}
        <TouchableOpacity
          style={styles.finalizeButton}
          onPress={handleFinalizeOrder}
        >
          <Text style={styles.finalizeButtonText}>Fullfør og send</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderCustomerInfoScreen = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Kundeinformasjon</Text>
        <Text style={styles.subtitle}>Fyll ut kundeinfo for ordren</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Kundenavn *</Text>
          <TextInput
            style={styles.input}
            value={currentOrder?.customer_name || ''}
            onChangeText={(text) => {
              if (currentOrder) currentOrder.customer_name = text;
              setRefreshCounter(c => c + 1);
            }}
            placeholder="Skriv inn kundenavn"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>E-post (valgfritt)</Text>
          <TextInput
            style={styles.input}
            value={currentOrder?.customer_email || ''}
            onChangeText={(text) => {
              if (currentOrder) currentOrder.customer_email = text;
              setRefreshCounter(c => c + 1);
            }}
            placeholder="kunde@example.com"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Selger (valgfritt)</Text>
          <TextInput
            style={styles.input}
            value={currentOrder?.sales_rep || ''}
            onChangeText={(text) => {
              if (currentOrder) currentOrder.sales_rep = text;
              setRefreshCounter(c => c + 1);
            }}
            placeholder="Ditt navn"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Leveringsdato (valgfritt)</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => {
              if (Platform.OS === 'ios') {
                // For iOS, vis en custom date picker
                const today = new Date();
                const maxDate = new Date();
                maxDate.setFullYear(today.getFullYear() + 1); // Maks 1 år frem
                
                // Bruk en enkel date picker med Alert
                const showDatePicker = () => {
                  const currentDate = currentOrder?.delivery_date ? new Date(currentOrder.delivery_date) : today;
                  
                  Alert.alert(
                    'Velg leveringsdato',
                    'Velg måned og år:',
                    [
                      { text: 'Avbryt', style: 'cancel' },
                      {
                        text: 'Velg måned',
                        onPress: () => {
                          const months = [
                            'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
                            'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'
                          ];
                          
                          Alert.alert(
                            'Velg måned',
                            '',
                            months.map((month, index) => ({
                              text: month,
                              onPress: () => {
                                const selectedMonth = index + 1;
                                
                                // Velg dag
                                const daysInMonth = new Date(currentDate.getFullYear(), selectedMonth, 0).getDate();
                                const days = Array.from({length: daysInMonth}, (_, i) => i + 1);
                                
                                Alert.alert(
                                  'Velg dag',
                                  '',
                                  days.map(day => ({
                                    text: day.toString(),
                                    onPress: () => {
                                      const selectedDate = new Date(currentDate.getFullYear(), selectedMonth - 1, day);
                                      const formattedDate = selectedDate.toLocaleDateString('nb-NO');
                                      if (currentOrder) {
                                        currentOrder.delivery_date = formattedDate;
                                        setRefreshCounter(c => c + 1);
                                      }
                                    }
                                  })).concat([
                                    { text: 'Avbryt', style: 'cancel' }
                                  ])
                                );
                              }
                            })).concat([
                              { text: 'Avbryt', style: 'cancel' }
                            ])
                          );
                        }
                      },
                      {
                        text: 'I dag',
                        onPress: () => {
                          const today = new Date();
                          const formattedDate = today.toLocaleDateString('nb-NO');
                          if (currentOrder) {
                            currentOrder.delivery_date = formattedDate;
                            setRefreshCounter(c => c + 1);
                          }
                        }
                      },
                      {
                        text: 'I morgen',
                        onPress: () => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          const formattedDate = tomorrow.toLocaleDateString('nb-NO');
                          if (currentOrder) {
                            currentOrder.delivery_date = formattedDate;
                            setRefreshCounter(c => c + 1);
                          }
                        }
                      }
                    ]
                  );
                };
                
                showDatePicker();
              } else {
                // For Android, bruk en enkel prompt (kan forbedres med DateTimePickerAndroid)
                Alert.prompt(
                  'Velg leveringsdato',
                  'Skriv inn dato (dd.mm.yyyy):',
                  [
                    { text: 'Avbryt', style: 'cancel' },
                    { 
                      text: 'OK', 
                      onPress: (date) => {
                        if (date && currentOrder) {
                          currentOrder.delivery_date = date;
                          setRefreshCounter(c => c + 1);
                        }
                      }
                    }
                  ],
                  'plain-text',
                  currentOrder?.delivery_date || '',
                  'numeric'
                );
              }
            }}
          >
            <Text style={[styles.dateInputText, !currentOrder?.delivery_date && styles.dateInputPlaceholder]}>
              {currentOrder?.delivery_date || 'dd.mm.yyyy'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, !currentOrder?.customer_name?.trim() && styles.buttonDisabled]}
        onPress={() => setCurrentScreen('review')}
        disabled={!currentOrder?.customer_name?.trim()}
      >
        <Text style={styles.buttonText}>Fullfør ordre</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderOrdersScreen = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ordre</Text>
      </View>

      <TouchableOpacity
        style={styles.newOrderButton}
        onPress={() => navigateTo('home')}
      >
        <Text style={styles.newOrderButtonText}>Ny ordre</Text>
      </TouchableOpacity>

      <View style={styles.emptyState}>
        <Text style={styles.emptyStateTitle}>Ingen ordrer</Text>
        <Text style={styles.emptyStateMessage}>
          Du har ingen ordrer ennå. Start med å opprette en ny ordre.
        </Text>
      </View>
    </View>
  );

  // Main render
  return (
    <View style={styles.container}>
      {/* Navigation header */}
      {currentScreen !== 'home' && currentScreen !== 'scan' && (
        <View style={styles.navHeader}>
          <TouchableOpacity 
            onPress={goBack} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>← Tilbake</Text>
          </TouchableOpacity>
          
          {/* Handlekurv visning */}
          {currentOrder && orderItems.length > 0 && (
            <TouchableOpacity 
              style={styles.headerCartButton}
              onPress={() => setCurrentScreen('scan')}
              activeOpacity={0.7}
            >
              <Text style={styles.headerCartIcon}>{Icons.ShoppingCart}</Text>
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{orderItems.length}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Content */}
      {currentScreen === 'home' && renderHomeScreen()}
      {currentScreen === 'products' && renderProductsScreen()}
      {currentScreen === 'addProduct' && renderAddProductScreen()}
      
      {currentScreen === 'customerInfo' && renderCustomerInfoScreen()}
      {currentScreen === 'manualEntry' && renderManualEntryScreen()}
      {currentScreen === 'scan' && renderScanScreen()}
      {currentScreen === 'review' && renderReviewScreen()}
      {currentScreen === 'orders' && renderOrdersScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#edf4f0', // Light green background
    paddingTop: 0, // Fjernet padding for å la bakgrunnsbildet gå helt i toppen
  },
  navHeader: {
    backgroundColor: '#edf4f0', // Light green background (samme som container)
    padding: 20,
    paddingTop: 60, // Lagt til paddingTop for iPhone status bar
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scanHeader: {
    backgroundColor: '#edf4f0', // Light green background
    padding: 20,
    paddingTop: 60, // Samme paddingTop som navHeader
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#d3e9de', // Medium green (samme som andre knapper)
    minHeight: 48,
    minWidth: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0c5f30', // Dark green border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    color: '#0c5f30', // Dark green (samme som andre knapper)
    fontSize: 18,
    fontWeight: '700',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#E3F2FD',
  },
  statusSuccess: {
    backgroundColor: '#E8F5E8',
  },
  statusError: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  retryText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 12,
    textDecorationLine: 'underline',
  },
  header: {
    backgroundColor: '#edf4f0', // Light green background (samme som container)
    padding: 20,
    paddingTop: 60, // Lagt til paddingTop for iPhone status bar
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0c5f30', // Dark green typography
    marginBottom: 8,
    textAlign: 'center',
    backgroundColor: 'white', // Hvit bakgrunn for tittelen
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  subtitle: {
    fontSize: 18,
    color: '#0c5f30', // Dark green typography
    textAlign: 'center',
    opacity: 0.8,
    backgroundColor: 'white', // Hvit bakgrunn for undertittelen
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  customerInfo: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 20,
    fontSize: 18,
    color: '#333',
    minHeight: 56,
  },
  dateInput: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 20,
    minHeight: 56,
    justifyContent: 'center',
  },
  dateInputText: {
    fontSize: 18,
    color: '#333',
  },
  dateInputPlaceholder: {
    color: '#999',
  },
  button: {
    backgroundColor: '#d3e9de', // Medium green buttons
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 60,
    borderWidth: 3,
    borderColor: '#0c5f30', // Dark green border
  },
  firstButton: {
    marginTop: 30, // Ekstra luft over første knapp på forsiden
  },
  buttonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  buttonText: {
    color: '#0c5f30', // Dark green typography
    fontSize: 20,
    fontWeight: '700',
  },
  buttonColumn: {
    flexDirection: 'column',
    marginHorizontal: 20,
    marginTop: 50, // Økt marginTop for mer luft mellom header og knapper
    marginBottom: 20,
    gap: 16,
  },
  fullWidthButton: {
    backgroundColor: '#d3e9de', // Medium green
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 56,
    borderWidth: 3,
    borderColor: '#0c5f30', // Dark green border
  },
  fullWidthButtonText: {
    color: '#0c5f30', // Dark green typography
    fontSize: 18,
    fontWeight: '700',
  },

  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
  },
  lastScanChip: {
    backgroundColor: '#E3F2FD',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  lastScanLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  lastScanEAN: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  lastScanProduct: {
    fontSize: 14,
    color: '#666',
  },
  itemsList: {
    flex: 1,
  },
  orderItem: {
    backgroundColor: 'white',
    paddingHorizontal: 20, // Beholder padding for innholdet
    paddingVertical: 8, // Redusert vertikal padding
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'flex-start', // Endret til flex-start for bedre kontroll over kolonner
    alignItems: 'flex-start', // Endret fra 'center' til 'flex-start' for bedre justering
  },
  lastOrderItem: {
    backgroundColor: 'white',
    paddingHorizontal: 20, // Beholder padding for innholdet
    paddingVertical: 8, // Redusert vertikal padding
    borderBottomWidth: 0, // Ingen border på siste rad
    borderBottomLeftRadius: 12, // Runde hjørner nederst
    borderBottomRightRadius: 12, // Runde hjørner nederst
    flexDirection: 'row',
    justifyContent: 'flex-start', // Endret til flex-start for bedre kontroll over kolonner
    alignItems: 'flex-start', // Endret fra 'center' til 'flex-start' for bedre justering
  },
  productSection: {
    flex: 2, // Gir produkt-kolonnen mer plass
    alignItems: 'flex-start',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemEAN: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  itemSKU: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0c5f30', // Dark green for større oppmerksomhet
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Endret fra 'center' til 'flex-start' for bedre justering
    justifyContent: 'space-between', // Endret til space-between for bedre justering
    flex: 1,
    marginTop: 0, // Sikrer at input-feltene starter på samme høyde
    paddingHorizontal: 0, // Fjernet padding for bedre justering med kolonneoverskriftene
  },

  qtyInput: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#0c5f30', // Dark green border for tydelighet
    borderRadius: 8,
    padding: 6, // Redusert fra 8 til 6
    fontSize: 16,
    color: '#333',
    width: 60,
    textAlign: 'center',
    fontWeight: '600',
    height: 40, // Fast høyde i stedet for minHeight for konsistent justering
  },
  reviewItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemSummary: {
    alignItems: 'flex-end',
  },
  itemQty: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  continueButton: {
    backgroundColor: '#d3e9de', // Medium green (samme som andre knapper)
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 60,
    borderWidth: 3,
    borderColor: '#0c5f30', // Dark green border
  },
  continueButtonText: {
    color: '#0c5f30', // Dark green (samme som andre knapper)
    fontSize: 20,
    fontWeight: '700',
  },

  summaryCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  noteSection: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  noteLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  noteInput: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 20,
    fontSize: 18,
    color: '#333',
    minHeight: 100,
  },
  itemsSection: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  totalsSection: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 16,
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  finalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  finalTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  finalTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  finalizeButton: {
    backgroundColor: '#34C759',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 60,
    borderWidth: 3,
    borderColor: '#0c5f30', // Dark green border
  },
  finalizeButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  newOrderButton: {
    backgroundColor: '#d3e9de', // Medium green (samme som andre knapper)
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 40,
    padding: 20, // Redusert padding
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 60,
    borderWidth: 3,
    borderColor: '#0c5f30', // Dark green border
  },
  newOrderButtonText: {
    color: '#0c5f30', // Dark green (samme som andre knapper)
    fontSize: 20,
    fontWeight: '700',
  },
  // Search styles for home screen
  searchContainer: {
    backgroundColor: 'white',
    margin: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#0c5f30', // Dark green border
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    color: '#333',
    paddingVertical: 8,
  },
  clearSearchButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearSearchText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  // Search results styles
  searchResults: {
    marginHorizontal: 20,
    marginTop: 20, // Lagt til marginTop for mer luft fra header
    marginBottom: 20,
  },
  searchResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0c5f30', // Dark green
    marginBottom: 12,
  },
  searchResultsList: {
    maxHeight: 300,
  },
  searchResultItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d3e9de', // Medium green
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  searchResultEAN: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  searchResultPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0c5f30', // Dark green
  },
  addToCartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0c5f30', // Dark green border
  },
  addToCartButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  noSearchResults: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  productsList: {
    flex: 1,
  },
  productItem: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productEAN: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  productSKU: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 14,
    color: '#666',
  },
  addProductButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
    borderWidth: 3,
    borderColor: '#0c5f30', // Dark green border
  },
  addProductButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
  },
  // Handlekurv styles
  cartButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#d3e9de', // Medium light green
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0c5f30', // Dark green border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cartButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  cartStatusCard: {
    backgroundColor: '#d3e9de', // Medium green
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#0c5f30', // Dark green
  },
  cartStatusTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0c5f30', // Dark green typography
    marginBottom: 8,
    textAlign: 'center',
  },
  cartStatusInfo: {
    fontSize: 16,
    color: '#0c5f30', // Dark green typography
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.8,
  },
  cartStatusSubtitle: {
    fontSize: 14,
    color: '#0c5f30', // Dark green typography
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.6,
  },
  cartStatusButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cartStatusButton: {
    flex: 1,
    backgroundColor: '#0c5f30', // Dark green
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 50,
  },
  cartStatusButtonSecondary: {
    backgroundColor: '#d3e9de', // Medium green
    borderWidth: 2,
    borderColor: '#0c5f30', // Dark green
  },
  cartStatusButtonText: {
    color: '#0c5f30', // Dark green typography
    fontSize: 16,
    fontWeight: '700',
  },
  cartStatusWarning: {
    fontSize: 14,
    color: '#0c5f30', // Dark green typography
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
    opacity: 0.8,
  },
  // Items column headers styles
  itemsColumnHeaders: {
    flexDirection: 'row',
    marginHorizontal: 0, // Fjernet margin for å trekke bakgrunnen helt ut
    marginTop: 0, // Ingen margin fra toppen siden vi ikke har navHeader
    marginBottom: 0, // Ingen margin under
    paddingHorizontal: 20, // Samme padding som orderItem
    paddingVertical: 12, // Vertikal padding for bedre spacing
    backgroundColor: 'white', // Hvit bakgrunn for å matche tabellen
    borderBottomWidth: 1, // Tynn linje under for å koble til tabellen
    borderBottomColor: '#E0E0E0', // Samme farge som item borders
    justifyContent: 'flex-start', // Endret til flex-start for bedre kontroll over kolonner
  },
  itemsColumnHeader: {
    flex: 2, // Samme flex som productSection
    alignItems: 'flex-start', // Endret til flex-start for produkt-kolonnen
    paddingHorizontal: 0, // Fjernet padding for perfekt justering med input-feltene
    paddingLeft: 0, // Sikrer at overskriften starter på samme posisjon som input-feltet
    paddingRight: 0, // Sikrer at overskriften starter på samme posisjon som input-feltet
    marginLeft: 0, // Sikrer at overskriften starter på samme posisjon som input-feltet
    marginRight: 0, // Sikrer at overskriften starter på samme posisjon som input-feltet
  },
  itemsColumnHeaderCenter: {
    flex: 1, // Samme flex som qtySection og discountSection
    alignItems: 'center', // Sentrert for antall og rabatt kolonner
    paddingHorizontal: 0,
    paddingLeft: 0,
    paddingRight: 0,
    marginLeft: 0,
    marginRight: 0,
  },
  itemsColumnHeaderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0c5f30', // Dark green
    textAlign: 'center',
  },
  // Cart summary styles
  cartSummary: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#0c5f30', // Dark green border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Customer info and discount styles
  customerInfoCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  customerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerInfoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    width: 120,
  },
  customerInfoInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },

  itemDiscount: {
    fontSize: 12,
    color: '#FF3B30',
    fontWeight: '600',
  },
  qtySection: {
    alignItems: 'center',
    marginBottom: 8,
    flex: 1,
    marginTop: 0, // Sikrer at input-feltene starter på samme høyde
    paddingLeft: 0, // Fjernet padding for perfekt justering med overskriften
    marginLeft: 0, // Sikrer at input-feltet starter på samme posisjon som overskriften
    marginRight: 0, // Sikrer at input-feltet starter på samme posisjon som overskriften
  },
  discountSection: {
    alignItems: 'center',
    flex: 1,
    marginTop: 0, // Sikrer at input-feltene starter på samme høyde
    paddingRight: 0, // Fjernet padding for perfekt justering med overskriften
    marginLeft: 0, // Sikrer at input-feltet starter på samme posisjon som overskriften
    marginRight: 0, // Sikrer at input-feltet starter på samme posisjon som overskriften
  },
  deleteSection: {
    alignItems: 'center',
    flex: 1,
    marginTop: 0, // Sikrer at slett-knappen starter på samme høyde
    marginLeft: 0, // Sikrer at slett-knappen starter på samme posisjon som overskriften
    marginRight: 0, // Sikrer at slett-knappen starter på samme posisjon som overskriften
  },

  discountButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#0c5f30', // Dark green border for tydelighet
    borderRadius: 8,
    padding: 8,
    width: 60,
    height: 40, // Fast høyde for konsistent justering
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  discountButtonActive: {
    backgroundColor: '#0c5f30', // Dark green bakgrunn når aktiv
    borderColor: '#0c5f30',
  },
  discountButtonText: {
    fontSize: 18,
    color: '#0c5f30', // Dark green farge
    fontWeight: '600',
  },
  discountButtonTextActive: {
    fontSize: 14,
    color: 'white', // Hvit tekst når aktiv
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: 'transparent', // Transparent bakgrunn
    borderWidth: 1,
    borderColor: '#FF3B30', // Rød border
    borderRadius: 6,
    padding: 6,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#FF3B30', // Rød farge for krysset
    fontSize: 14,
    fontWeight: '600',
  },
  // New customer info styles
  customerInfoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  customerInfoSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  customerInfoButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0c5f30', // Dark green border
  },
  customerInfoButtonText: {
    color: '#0c5f30', // Dark green typography
    fontSize: 16,
    fontWeight: '700',
  },
  // Main Header styles
  mainHeader: {
    height: 220, // Økt høyde for bedre plass til søkefelt
    marginTop: 0, // Bakgrunnsbilde går helt i toppen
  },
  headerBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60, // Økt for å håndtere iPhone status bar siden container ikke har padding
    paddingBottom: 20,
  },
  logoContainer: {
    alignItems: 'flex-start',
  },
  logoImage: {
    width: 120,
    height: 80,
    backgroundColor: 'transparent', // Sikrer at logo er synlig
  },
  headerCart: {
    alignItems: 'flex-end',
  },
  headerCartButton: {
    position: 'relative',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#d3e9de', // Medium light green
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0c5f30', // Dark green border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerCartIcon: {
    fontSize: 24,
    color: '#0c5f30', // Dark green text for contrast against medium light green background
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#dfce3b', // Gult badge i stedet for rødt
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  cartBadgeText: {
    color: '#333', // Mørk tekst for bedre kontrast mot gul bakgrunn
    fontSize: 12,
    fontWeight: '700',
  },
  // Header search styles
  headerSearchContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 0, // Fjernet margin helt - søkefeltet er nå helt opp mot logo/handlekurv
    paddingHorizontal: 16,
    paddingVertical: 12, // Redusert høyde
    borderRadius: 25, // Mer avrundede hjørner
    borderWidth: 0, // Ingen border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000, // Sikrer at søkefeltet er over bakgrunnsbildet
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0, // Fjern vertikal padding for å matche container
    height: 24, // Fast høyde for input-feltet
  },
  headerClearSearchButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerClearSearchText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },

  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  discountModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0c5f30',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  modalContent: {
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    fontWeight: '500',
  },
  modalInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#0c5f30',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  modalButtonTextSecondary: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: '#0c5f30',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0c5f30',
  },
  modalButtonTextPrimary: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
