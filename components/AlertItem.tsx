import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Alert } from "../db/queries/alerts";

interface AlertItemProps {
  alert: Alert;
  onPress?: () => void;
}

const typeIcon: Record<string, { icon: any; color: string; bg: string }> = {
  missed:  { icon: "close-circle-outline",   color: "#e05252", bg: "bg-red-50" },
  skipped: { icon: "remove-circle-outline",  color: "#e09a30", bg: "bg-amber-50" },
  default: { icon: "alert-circle-outline",   color: "#3b82f6", bg: "bg-blue-50" },
};

export function AlertItem({ alert, onPress }: AlertItemProps) {
  const cfg = typeIcon[alert.alert_type] ?? typeIcon.default;
  const isUnread = alert.status === "unread";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className={`flex-row items-start rounded-2xl p-4 mb-3 border ${
        isUnread ? "border-red-200 bg-red-50" : "border-border bg-card"
      }`}
    >
      <View className={`w-9 h-9 rounded-full ${cfg.bg} items-center justify-center mr-3 mt-0.5`}>
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="font-heading text-sm text-ink">
            {alert.patient_fname} {alert.patient_lname}
          </Text>
          {isUnread && (
            <View className="w-2 h-2 rounded-full bg-red-500" />
          )}
        </View>
        <Text className="text-xs text-muted mt-0.5">{alert.room_name}</Text>
        <Text className="text-sm text-ink mt-1">{alert.alert_message}</Text>
        <Text className="text-xs text-muted mt-1">
          {alert.alert_date} · {alert.alert_time?.slice(0, 5)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
