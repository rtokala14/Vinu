import React from "react";
import { View } from "react-native";

const AuthorItemSkeleton = () => {
  return (
    <View className="flex flex-col items-center justify-center gap-2">
      <View
        style={{
          // The `style` prop is used here for consistency with AuthorItem.tsx
          // although these could be converted to Tailwind classes if preferred.
          marginBottom: 4,
          flexDirection: "row",
          alignItems: "center",
          position: "relative",
        }}
      >
        {/* Image Placeholder */}
        <View className="w-[150px] h-[225px] rounded-lg bg-gray-300 dark:bg-gray-700 animate-pulse" />
        {/* Badge Placeholder */}
        <View className="absolute left-2 top-2 z-50 w-10 h-5 bg-gray-400 dark:bg-gray-600 animate-pulse rounded" />
      </View>
      {/* Text Placeholder */}
      <View className="w-24 h-4 bg-gray-300 dark:bg-gray-700 animate-pulse rounded" />
    </View>
  );
};

export default AuthorItemSkeleton;
