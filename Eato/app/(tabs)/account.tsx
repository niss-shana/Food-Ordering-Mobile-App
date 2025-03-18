import React from "react";
import { View, Text, TouchableOpacity } from "react-native";


const Account = () => {
  const handleLogout = () => {
    console.log("Logout pressed");
    // Add your logout logic here
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 18, marginBottom: 20 }}>Account</Text>
      
      <TouchableOpacity onPress={handleLogout} style={{ flexDirection: "row", alignItems: "center" }}>
        
        <Text style={{ marginLeft: 10, fontSize: 16, color: "red" }}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Account;
