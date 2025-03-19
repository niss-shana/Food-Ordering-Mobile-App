import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { collection, getDocs, getFirestore, addDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '../../FirebaseConfig';
import { Ionicons } from '@expo/vector-icons';

import { router } from 'expo-router';

const db = getFirestore(app);
const auth = getAuth(app);

// Define the type for a menu item
interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
}

// Theme colors
const COLORS = {
  primary: '#A9C6A8',      // Sage green
  secondary: '#ED9E96',    // Coral/salmon
  white: '#FFFFFF',
  black: '#333333',
  gray: '#888888',
  lightGray: '#F5F5F5',
  mediumGray: '#E0E0E0',
  overlay: 'rgba(51, 51, 51, 0.7)'
};

export default function HomeScreen() {
  
  const [menu, setMenu] = useState<MenuItem[]>([]); 
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<{[key: string]: number}>({});

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'menu'));
      const items = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MenuItem[];
      
      setMenu(items);
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (item: MenuItem) => {
    try {
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        alert('Please log in to add items to your cart');
        return;
      }
      
      const quantity = quantities[item.id] || 1;
      
      await addDoc(collection(db, 'orders'), {
        userId,
        menuItemId: item.id,
        menuItemName: item.name,
        price: item.price,
        quantity: quantity,
        timestamp: new Date(),
        status: 'pending',
        totalPrice: item.price * quantity
      });
      
      // Reset quantity after adding to cart
      const updatedQuantities = {...quantities};
      delete updatedQuantities[item.id];
      setQuantities(updatedQuantities);
      
      alert(`${item.name} added to cart!`);
      router.replace('/cart')
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add item to cart');
    }
  };

  const increaseQuantity = (itemId: string) => {
    setQuantities({
      ...quantities,
      [itemId]: (quantities[itemId] || 0) + 1
    });
  };

  const decreaseQuantity = (itemId: string) => {
    if (!quantities[itemId] || quantities[itemId] <= 1) {
      return;
    }
    
    setQuantities({
      ...quantities,
      [itemId]: quantities[itemId] - 1
    });
  };

  const renderItem = ({ item }: { item: MenuItem }) => (
    <View style={styles.item}>
      <Image 
        source={{ uri: item.image }} 
        style={styles.image}
        defaultSource={require('../../assets/images/p1.png')}
      />
      <View style={styles.details}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        
        {/* Price row */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>${item.price.toFixed(2)}</Text>
        </View>
        
        {/* Action controls on a new line */}
        <View style={styles.actionRow}>
          <View style={styles.quantityContainer}>
            <TouchableOpacity 
              style={[styles.quantityButton, { backgroundColor: COLORS.primary }]} 
              onPress={() => decreaseQuantity(item.id)}
            >
              <Ionicons name="remove" size={16} color={COLORS.white} />
            </TouchableOpacity>
            
            <Text style={styles.quantityText}>
              {quantities[item.id] || 1}
            </Text>
            
            <TouchableOpacity 
              style={[styles.quantityButton, { backgroundColor: COLORS.primary }]} 
              onPress={() => increaseQuantity(item.id)}
            >
              <Ionicons name="add" size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => addToCart(item)}
          >
            <Text style={styles.addButtonText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderFeaturedItem = ({ item }: { item: MenuItem }) => (
    <TouchableOpacity style={styles.featuredItem}>
      <Image 
        source={{ uri: item.image }} 
        style={styles.featuredImage}
        defaultSource={require('../../assets/images/p1.png')}
      />
      <View style={styles.featuredOverlay}>
        <Text style={styles.featuredName}>{item.name}</Text>
        <Text style={styles.featuredPrice}>${item.price.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderCategories = () => (
    <View style={styles.categoriesContainer}>
      <Text style={styles.sectionTitle}>Categories</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[
          { id: '1', name: 'All', icon: 'restaurant' },
          { id: '2', name: 'Pizza', icon: 'pizza' },
          { id: '3', name: 'Burger', icon: 'fast-food' },
          { id: '4', name: 'Drinks', icon: 'beer' },
          { id: '5', name: 'Dessert', icon: 'ice-cream' },
        ]}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.categoryItem}>
            <View style={styles.categoryIcon}>
              <Ionicons name={item.icon} size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.categoryName}>{item.name}</Text>
          </TouchableOpacity>
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.categoriesList}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Eato</Text>
          <Text style={styles.headerSubtitle}>Premium Food Delivery</Text>
        </View>
        
        <TouchableOpacity style={styles.cartButton}>
          <Ionicons name="cart-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loaderText}>Loading menu...</Text>
        </View>
      ) : (
        <FlatList
          data={menu}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
                <Text style={styles.searchPlaceholder}>Search dishes...</Text>
              </View>
              
              {menu.length > 0 && (
                <View style={styles.featuredContainer}>
                  <Text style={styles.sectionTitle}>Featured Selections</Text>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={menu.slice(0, Math.min(5, menu.length))}
                    renderItem={renderFeaturedItem}
                    keyExtractor={item => `featured-${item.id}`}
                    contentContainerStyle={styles.featuredList}
                  />
                </View>
              )}
              
              {renderCategories()}
              
              <Text style={styles.sectionTitle}>Menu</Text>
            </>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.mediumGray,
  },
  headerTitleContainer: {
    flexDirection: 'column',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
    fontFamily: 'System',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: -2,
    letterSpacing: 0.3,
  },
  cartButton: {
    padding: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchPlaceholder: {
    color: COLORS.gray,
    fontSize: 15,
    fontWeight: '400',
  },
  featuredContainer: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 20,
    marginBottom: 14,
    color: COLORS.black,
    letterSpacing: 0.2,
  },
  featuredList: {
    paddingHorizontal: 12,
  },
  featuredItem: {
    width: 190,
    height: 130,
    marginHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.overlay,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  featuredName: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  featuredPrice: {
    color: COLORS.secondary,
    fontWeight: '700',
    fontSize: 14,
    marginTop: 3,
  },
  categoriesContainer: {
    marginTop: 24,
    marginBottom: 8,
  },
  categoriesList: {
    paddingHorizontal: 12,
  },
  categoryItem: {
    alignItems: 'center',
    marginHorizontal: 10,
    width: 70,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  categoryName: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
    fontWeight: '500',
  },
  list: {
    paddingBottom: 20,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    color: COLORS.gray,
    fontSize: 15,
  },
  item: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginRight: 16,
  },
  details: {
    flex: 1,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.black,
    letterSpacing: 0.2,
  },
  description: {
    fontSize: 14,
    color: COLORS.gray,
    marginVertical: 6,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  price: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  // New style for the action row
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    marginHorizontal: 8,
    fontSize: 15,
    fontWeight: '500',
    minWidth: 20,
    textAlign: 'center',
    color: COLORS.black,
  },
  addButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 9,
    letterSpacing: 0.3,
  },
});