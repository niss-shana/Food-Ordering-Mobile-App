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
        <View style={styles.priceRow}>
          <Text style={styles.price}>${item.price.toFixed(2)}</Text>
          
          <View style={styles.quantityContainer}>
            <TouchableOpacity 
              style={styles.quantityButton} 
              onPress={() => decreaseQuantity(item.id)}
            >
              <Ionicons name="remove" size={16} color="#fff" />
            </TouchableOpacity>
            
            <Text style={styles.quantityText}>
              {quantities[item.id] || 1}
            </Text>
            
            <TouchableOpacity 
              style={styles.quantityButton} 
              onPress={() => increaseQuantity(item.id)}
            >
              <Ionicons name="add" size={16} color="#fff" />
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
              <Ionicons name={item.icon} size={24} color="#2ecc71" />
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
          <Text style={styles.headerSubtitle}>Food Delivery</Text>
        </View>
        <TouchableOpacity style={styles.profileButton}>
          <Ionicons name="person-circle" size={32} color="#2ecc71" />
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2ecc71" />
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
                <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                <Text style={styles.searchPlaceholder}>Search for food...</Text>
              </View>
              
              {menu.length > 0 && (
                <View style={styles.featuredContainer}>
                  <Text style={styles.sectionTitle}>Featured Items</Text>
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
              
              <Text style={styles.sectionTitle}>All Items</Text>
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
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitleContainer: {
    flexDirection: 'column',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2ecc71',
    fontFamily: 'System',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: -2,
  },
  profileButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchPlaceholder: {
    color: '#999',
    fontSize: 16,
  },
  featuredContainer: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginHorizontal: 16,
    marginBottom: 12,
    color: '#333',
  },
  featuredList: {
    paddingHorizontal: 8,
  },
  featuredItem: {
    width: 180,
    height: 120,
    marginHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden',
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  featuredName: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  featuredPrice: {
    color: '#2ecc71',
    fontWeight: '700',
    fontSize: 14,
    marginTop: 2,
  },
  categoriesContainer: {
    marginVertical: 16,
  },
  categoriesList: {
    paddingHorizontal: 8,
  },
  categoryItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 70,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  list: {
    paddingBottom: 16,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    color: '#666',
  },
  item: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginRight: 16,
  },
  details: {
    flex: 1,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginVertical: 4,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2ecc71',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  quantityButton: {
    backgroundColor: '#2ecc71',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    marginHorizontal: 8,
    fontSize: 16,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#2ecc71',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});