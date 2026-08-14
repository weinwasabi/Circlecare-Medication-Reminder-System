import React from "react";
import { Text, View } from "react-native";

type BadgeVariant = "success" | "danger" | "warning" | "info" | "muted";

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-primary-100",
  danger:  "bg-red-100",
  warning: "bg-amber-100",
  info:    "bg-blue-100",
  muted:   "bg-gray-100",
};

const textStyles: Record<BadgeVariant, string> = {
  success: "text-primary-700",
  danger:  "text-red-700",
  warning: "text-amber-700",
  info:    "text-blue-700",
  muted:   "text-gray-600",
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = "muted" }: BadgeProps) {
  return (
    <View className={`px-2.5 py-0.5 rounded-full self-start ${variantStyles[variant]}`}>
      <Text className={`font-menu text-xs ${textStyles[variant]}`}>{label}</Text>
    </View>
  );
}
