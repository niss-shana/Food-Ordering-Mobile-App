import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { app } from '../../FirebaseConfig'; // Adjust the path to your Firebase config
import { useFocusEffect } from '@react-navigation/native';

const db = getFirestore(app);
const auth = getAuth(app);

// Define interfaces for data models
interface MenuItem {
  menuItemId: string;
  menuItemName: string;
  price: number;
  quantity: number;
  status: string;
  timestamp: any; // Firestore timestamp
  userId: string;
  id?: string; // Document ID from Firestore
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  documentIds: string[]; // Store the Firestore document IDs for each item
}

export default function CartScreen({ navigation }: { navigation: any }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<boolean>(false);

  // Fetch cart items from Firestore
  const fetchCartItems = async () => {
    setLoading(true);
    setError(null);
    
    const userId = auth.currentUser?.uid;
    console.log('Fetching cart for user:', userId);
    
    if (!userId) {
      setError('Please log in to view your cart.');
      setLoading(false);
      return;
    }

    try {
      // Query Firestore for pending items for the current user
      const ord = collection(db, "orders");
      const q = query(ord, where("userId", "==", userId), where("status", "==", "pending"));
      const querySnapshot = await getDocs(q);
      console.log('Query Snapshot:', querySnapshot.docs.length);
      
      if (querySnapshot.empty) {
        console.log('No pending items found for user:', userId);
        setCart([]);
        setLoading(false);
        return;
      }

      // Process the items to consolidate duplicates
      const processedItems: { [key: string]: CartItem } = {};

      querySnapshot.forEach((doc) => {
        const item = doc.data() as MenuItem;
        const docId = doc.id; // Get the document ID
        
        if (processedItems[item.menuItemName]) {
          // If item already exists, increment its quantity
          processedItems[item.menuItemName].quantity += item.quantity;
          // Store the document ID
          processedItems[item.menuItemName].documentIds.push(docId);
        } else {
          // Otherwise, add the item to the processed items
          processedItems[item.menuItemName] = {
            id: item.menuItemId,
            name: item.menuItemName,
            price: item.price,
            quantity: item.quantity,
            documentIds: [docId], // Initialize with this document ID
          };
        }
      });

      // Convert processed items object to array
      setCart(Object.values(processedItems));
    } catch (err) {
      console.error('Error fetching cart items:', err);
      setError('An error occurred while fetching cart items.');
    } finally {
      setLoading(false);
    }
  };

  // Use useFocusEffect to refresh the cart when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('CartScreen is now focused, refreshing data');
      fetchCartItems();
      
      // Return a cleanup function (optional)
      return () => {
        console.log('CartScreen is now unfocused');
      };
    }, [])
  );

  // Function to increase item quantity
  const increaseQuantity = (index: number) => {
    const newCart = [...cart];
    newCart[index].quantity += 1;
    setCart(newCart);
  };

  // Function to decrease item quantity
  const decreaseQuantity = async (index: number) => {
    const newCart = [...cart];
    
    if (newCart[index].quantity > 1) {
      // Just decrease the quantity if it's more than 1
      newCart[index].quantity -= 1;
      setCart(newCart);
    } else {
      // If quantity is 1, remove the item
      await handleRemoveItem(index);
    }
  };

  // Function to remove an item from the cart
  const handleRemoveItem = async (index: number) => {
    setUpdating(true);
    try {
      const itemToRemove = cart[index];
      
      // Ask for confirmation
      Alert.alert(
        "Remove Item",
        `Remove ${itemToRemove.name} from your cart?`,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setUpdating(false)
          },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              // Delete all document IDs associated with this item
              const deletePromises = itemToRemove.documentIds.map(docId => 
                deleteDoc(doc(db, "orders", docId))
              );
              
              await Promise.all(deletePromises);
              
              // Update the local state
              const updatedCart = cart.filter((_, i) => i !== index);
              setCart(updatedCart);
              setUpdating(false);
            }
          }
        ]
      );
    } catch (err) {
      console.error('Error removing item:', err);
      Alert.alert('Error', 'Failed to remove item from cart.');
      setUpdating(false);
    }
  };

  // Function to update item quantity in Firestore
  const updateItemQuantity = async () => {
    setUpdating(true);
    try {
      // For each item in the cart, update or delete documents as needed
      for (const item of cart) {
        // Get original quantity from Firestore
        const docs = await Promise.all(
          item.documentIds.map(docId => 
            getDocs(query(collection(db, "orders"), where("__name__", "==", docId)))
          )
        );
        
        // Flatten the results
        const allDocs = docs.flatMap(snapshot => 
          snapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data() as MenuItem
          }))
        );
        
        // Calculate total original quantity
        const originalQuantity = allDocs.reduce((sum, docItem) => sum + docItem.data.quantity, 0);
        
        if (item.quantity < originalQuantity) {
          // Need to remove some items
          let quantityToRemove = originalQuantity - item.quantity;
          
          for (const docItem of allDocs) {
            if (quantityToRemove <= 0) break;
            
            if (docItem.data.quantity <= quantityToRemove) {
              // Remove entire document
              await deleteDoc(doc(db, "orders", docItem.id)); // Correct usage of `doc` function
              quantityToRemove -= docItem.data.quantity;
            } else {
              // Update document quantity
              await updateDoc(doc(db, "orders", docItem.id), { // Correct usage of `doc` function
                quantity: docItem.data.quantity - quantityToRemove
              });
              quantityToRemove = 0;
            }
          }
        } else if (item.quantity > originalQuantity) {
          // Need to increase quantity - update the first document
          const firstDocId = item.documentIds[0];
          const firstDocRef = doc(db, "orders", firstDocId); // Correct usage of `doc` function
          const quantityToAdd = item.quantity - originalQuantity;
          
          // Get current quantity
          const docSnapshot = await getDocs(query(collection(db, "orders"), where("__name__", "==", firstDocId)));
          if (!docSnapshot.empty) {
            const currentDoc = docSnapshot.docs[0];
            const currentData = currentDoc.data() as MenuItem;
            
            await updateDoc(firstDocRef, {
              quantity: currentData.quantity + quantityToAdd
            });
          }
        }
      }
      
      Alert.alert('Success', 'Cart updated successfully.');
      // Refresh the cart after updating
      fetchCartItems();
    } catch (err) {
      console.error('Error updating cart:', err);
      Alert.alert('Error', 'Failed to update cart.');
    } finally {
      setUpdating(false);
    }
  };

  // Function to handle checkout
  const handleCheckout = () => {
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = totalPrice * 0.07;
    const delivery = 2.99;
    const orderTotal = totalPrice + tax + delivery;
    
    // Confirm checkout
    Alert.alert(
      "Confirm Order",
      `Total: $${orderTotal.toFixed(2)}\n\nAre you ready to place your order?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Place Order",
          style: "default",
          onPress: () => placeOrder(orderTotal, tax, delivery)
        }
      ]
    );
  };

  // Function to place order in Firestore
  const placeOrder = async (total: number, tax: number, delivery: number) => {
    setUpdating(true);
    const userId = auth.currentUser?.uid;
    
    if (!userId) {
      Alert.alert('Error', 'Please log in to place your order.');
      setUpdating(false);
      return;
    }
    
    try {
      // Create a new order in the "orderHistory" collection
      const orderData = {
        userId: userId,
        items: cart.map(item => ({
          menuItemId: item.id,
          menuItemName: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        subtotal: total - tax - delivery,
        tax: tax,
        delivery: delivery,
        total: total,
        status: "placed",
        timestamp: serverTimestamp(),
        paymentStatus: "pending"
      };
      
      // Add the order to the orderHistory collection
      const orderRef = await addDoc(collection(db, "orderHistory"), orderData);
      console.log("Order placed with ID: ", orderRef.id);
      
      // Update the status of all items in the original orders collection
      const updatePromises = cart.flatMap(item => 
        item.documentIds.map(docId => 
          updateDoc(doc(db, "orders", docId), { status: "placed" })
        )
      );
      
      await Promise.all(updatePromises);
      
      // Show success message
      Alert.alert(
        "Order Placed",
        "Your order has been placed successfully!",
        [
          {
            text: "OK",
            onPress: () => {
              // Navigate to a confirmation screen or order history
              // For now, we'll just refresh the cart
              fetchCartItems();
              navigation.navigate('account', { orderId: orderRef.id });
            }
          }
        ]
      );
    } catch (err) {
      console.error('Error placing order:', err);
      Alert.alert('Error', 'Failed to place your order. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Render each cart item
  const renderItem = ({ item, index }: { item: CartItem; index: number }) => (
    <View style={styles.item}>
      <View style={styles.itemInfo}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.price}>${item.price.toFixed(2)}</Text>
      </View>
      <View style={styles.quantityContainer}>
        <TouchableOpacity 
          onPress={() => decreaseQuantity(index)}
          disabled={updating}
          style={styles.quantityButton}
        >
          <Text style={styles.quantityButtonText}>-</Text>
        </TouchableOpacity>
        
        <Text style={styles.quantity}>{item.quantity}</Text>
        
        <TouchableOpacity 
          onPress={() => increaseQuantity(index)}
          disabled={updating}
          style={styles.quantityButton}
        >
          <Text style={styles.quantityButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.itemTotal}>${(item.price * item.quantity).toFixed(2)}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#A9C6A8" />
        <Text style={styles.loadingText}>Loading your cart...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchCartItems}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (cart.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Your cart is empty.</Text>
        <TouchableOpacity
          style={styles.shopButton}
          onPress={() => navigation.navigate('home')}
        >
          <Text style={styles.shopButtonText}>Browse Menu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Cart</Text>

      <FlatList
        data={cart}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        refreshing={loading}
        onRefresh={fetchCartItems}
      />

      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal:</Text>
          <Text style={styles.summaryValue}>${totalPrice.toFixed(2)}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax:</Text>
          <Text style={styles.summaryValue}>${(totalPrice * 0.07).toFixed(2)}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery:</Text>
          <Text style={styles.summaryValue}>$2.99</Text>
        </View>

        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>${(totalPrice + totalPrice * 0.07 + 2.99).toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={styles.updateButton}
          onPress={updateItemQuantity}
          disabled={updating}
        >
          <Text style={styles.buttonText}>Update Cart</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.checkoutButton}
          onPress={handleCheckout}
          disabled={updating || cart.length === 0}
        >
          <Text style={styles.buttonText}>Checkout</Text>
        </TouchableOpacity>
      </View>
      
      {updating && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingOverlayText}>Processing your order...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9f6', // Light background with a hint of green
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9f6',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#4a6848', // Darker green for header text
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#A9C6A8', // Main green theme
  },
  list: {
    flex: 1,
    marginBottom: 12,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#A9C6A8', // Main green theme
  },
  itemInfo: {
    flex: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333333',
  },
  price: {
    fontSize: 14,
    color: '#666666',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#A9C6A8', // Main green theme
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  quantityButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quantity: {
    fontSize: 16,
    marginHorizontal: 12,
    fontWeight: '500',
    color: '#333333',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
    color: '#4a6848', // Darker green
  },
  summaryContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderTopWidth: 4,
    borderTopColor: '#A9C6A8', // Main green theme
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#555555',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  totalRow: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ED9E96', // Coral accent color
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 12,
  },
  updateButton: {
    backgroundColor: '#A9C6A8', // Main green theme
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  checkoutButton: {
    backgroundColor: '#ED9E96', // Coral accent color
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  errorText: {
    fontSize: 16,
    color: '#ED9E96', // Coral for error text
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#ED9E96', // Coral accent color
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 18,
    color: '#666666',
    marginBottom: 20,
  },
  shopButton: {
    backgroundColor: '#A9C6A8', // Main green theme
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  shopButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  loadingOverlayText: {
    color: '#ffffff',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
});