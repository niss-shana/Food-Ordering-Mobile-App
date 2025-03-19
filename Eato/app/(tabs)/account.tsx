import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from "react-native";
import { getAuth, signOut } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { app } from "../../FirebaseConfig"; // Adjust the path as needed
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

// Initialize Firebase
const auth = getAuth(app);
const db = getFirestore(app);

// Theme colors
const COLORS = {
  primary: "#A9C6A8", // Mint green
  secondary: "#ED9E96", // Warm coral
  background: "#F9F9F9",
  card: "#FFFFFF",
  text: {
    primary: "#333333",
    secondary: "#666666",
    light: "#FFFFFF",
    muted: "#999999",
  },
  border: "#EEEEEE",
  accent: "#85A783", // Darker mint green for accents
};

// Interface for order history item
interface OrderHistoryItem {
  id: string;
  total: number;
  status: string;
  timestamp: any;
  items: {
    menuItemName: string;
    quantity: number;
    price: number;
  }[];
}

const Account = () => {
  const [user, setUser] = useState<any>(null);
  const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Fetch user data
  const fetchUserData = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
    }
  };

  // Fetch order history
  const fetchOrderHistory = async () => {
    setLoading(true);
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      const orderHistoryRef = collection(db, "orderHistory");
      const q = query(
        orderHistoryRef,
        where("userId", "==", currentUser.uid),
      );

      const querySnapshot = await getDocs(q);
      const orders: OrderHistoryItem[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        orders.push({
          id: doc.id,
          total: data.total || 0,
          status: data.status || "pending",
          timestamp: data.timestamp?.toDate() || new Date(),
          items: data.items || [],
        });
      });

      // Sort orders by timestamp (newest first)
      orders.sort((a, b) => b.timestamp - a.timestamp);
      
      setOrderHistory(orders);
    } catch (error) {
      console.error("Error fetching order history:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchUserData();
      fetchOrderHistory();
      return () => {};
    }, [])
  );

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrderHistory();
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // You can add a navigation logic here if needed
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status color based on order status
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "placed":
        return "#3498db"; // Blue
      case "preparing":
        return "#f39c12"; // Orange
      case "ready":
        return COLORS.primary; // Primary color
      case "delivered":
        return "#2ecc71"; // Green
      case "cancelled":
        return COLORS.secondary; // Secondary color
      default:
        return "#95a5a6"; // Gray
    }
  };

  // Render order history item
  const renderOrderItem = ({ item }: { item: OrderHistoryItem }) => (
    <View style={styles.orderItem}>
      {/* Order header with ID and status */}
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderIdLabel}>Order #</Text>
          <Text style={styles.orderId}>{item.id.slice(-6).toUpperCase()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      {/* Order date and time */}
      <View style={styles.orderDateContainer}>
        <Text style={styles.orderDate}>{formatDate(item.timestamp)}</Text>
        <Text style={styles.orderTime}>{formatTime(item.timestamp)}</Text>
      </View>

      {/* Display Order Items */}
      <View style={styles.orderItemsContainer}>
        {item.items.map((orderItem, index) => (
          <View key={index} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemQuantity}>{orderItem.quantity}×</Text>
              <Text style={styles.itemName}>{orderItem.menuItemName}</Text>
            </View>
            <Text style={styles.itemPrice}>${(orderItem.quantity * orderItem.price).toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Order Total */}
      <View style={styles.orderTotalContainer}>
        <Text style={styles.orderTotalLabel}>Total Amount</Text>
        <Text style={styles.orderTotal}>${item.total.toFixed(2)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Profile Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.profileHeader}
      >
        <View style={styles.profileContentContainer}>
          {/* User Info */}
          <View style={styles.userContainer}>
            <View style={styles.avatarContainer}>
              <Image
                source={{
                  uri:
                    user?.photoURL ||
                    "https://ui-avatars.com/api/?name=" + (user?.displayName || "User") + "&background=ED9E96&color=fff",
                }}
                style={styles.avatar}
              />
            </View>
            <View style={styles.userInfoContainer}>
              <Text style={styles.userName}>{user?.displayName || "Guest User"}</Text>
              <Text style={styles.userEmail}>{user?.email || "No email"}</Text>
            </View>
          </View>
          
          {/* Logout Button */}
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Order History Section */}
      <View style={styles.orderHistorySection}>
        <Text style={styles.sectionTitle}>Order History</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : orderHistory.length === 0 ? (
          <View style={styles.emptyOrdersContainer}>
            <View style={styles.emptyOrderIconContainer}>
              <Text style={styles.emptyOrderIcon}>🛒</Text>
            </View>
            <Text style={styles.emptyOrdersText}>No Orders Yet</Text>
            <Text style={styles.emptyOrdersSubtext}>Your order history will appear here once you place an order</Text>
          </View>
        ) : (
          <FlatList
            data={orderHistory}
            renderItem={renderOrderItem}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
            showsVerticalScrollIndicator={false}
            style={styles.orderList}
            contentContainerStyle={styles.orderListContent}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  profileHeader: {
    paddingTop: 60,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 1,
  },
  profileContentContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 65,
    height: 65,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  userInfoContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text.light,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
  },
  logoutButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  logoutButtonText: {
    color: COLORS.text.light,
    fontWeight: "600",
    fontSize: 14,
  },
  orderHistorySection: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    color: COLORS.text.primary,
    letterSpacing: 0.3,
  },
  orderList: {
    flex: 1,
  },
  orderListContent: {
    paddingBottom: 20,
  },
  orderItem: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderIdLabel: {
    fontSize: 12,
    color: COLORS.text.muted,
    marginBottom: 2,
  },
  orderId: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text.primary,
    letterSpacing: 0.5,
  },
  orderDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  orderDate: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: "500",
  },
  orderTime: {
    fontSize: 14,
    color: COLORS.text.muted,
    marginLeft: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.text.light,
    fontWeight: "600",
    textTransform: "capitalize",
    letterSpacing: 0.5,
  },
  orderItemsContainer: {
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  itemInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  itemQuantity: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "700",
    marginRight: 8,
    width: 25,
  },
  itemName: {
    fontSize: 14,
    color: COLORS.text.primary,
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: "600",
  },
  orderTotalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    marginTop: 4,
  },
  orderTotalLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: "500",
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyOrdersContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 60,
  },
  emptyOrderIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(169, 198, 168, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyOrderIcon: {
    fontSize: 40,
  },
  emptyOrdersText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  emptyOrdersSubtext: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});

export default Account;