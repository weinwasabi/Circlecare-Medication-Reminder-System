import React from "react";
import { Text, View } from "react-native";

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  color?: string;
}

const sizeMap = {
  sm: { container: "w-8 h-8", text: "text-xs" },
  md: { container: "w-10 h-10", text: "text-sm" },
  lg: { container: "w-14 h-14", text: "text-lg" },
};

const colors = [
  "bg-primary-200",
  "bg-blue-200",
  "bg-amber-200",
  "bg-purple-200",
  "bg-rose-200",
];

function getColor(name: string) {
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

function getInitials(name: string) {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({ name, size = "md" }: AvatarProps) {
  const { container, text } = sizeMap[size];
  const bg = getColor(name);
  return (
    <View className={`${container} ${bg} rounded-full items-center justify-center`}>
      <Text className={`${text} font-menu text-gray-700`}>{getInitials(name)}</Text>
    </View>
  );
}
