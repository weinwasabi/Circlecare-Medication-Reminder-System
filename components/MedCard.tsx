import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import type { MedicationSchedule } from "../db/queries/medications";

interface MedCardProps {
  schedule: MedicationSchedule;
  logged?: "taken" | "missed" | "skipped" | null;
  onTake?: () => void;
  onSkip?: () => void;
}

const statusBadge = {
  taken:   { variant: "success" as const, label: "Taken" },
  missed:  { variant: "danger"  as const, label: "Missed" },
  skipped: { variant: "muted"   as const, label: "Skipped" },
};

export function MedCard({ schedule, logged, onTake, onSkip }: MedCardProps) {
  const badge = logged ? statusBadge[logged] : null;

  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Text className="font-heading text-base text-ink">
            {schedule.med_name}
          </Text>
          <Text className="text-sm text-muted mt-0.5">{schedule.dosage}</Text>
          <View className="flex-row items-center mt-2 gap-3">
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={13} color="#6b7a72" />
              <Text className="text-xs text-muted ml-1">
                {schedule.time_schedule?.slice(0, 5)}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="repeat-outline" size={13} color="#6b7a72" />
              <Text className="text-xs text-muted ml-1">{schedule.frequency}</Text>
            </View>
          </View>
        </View>

        {badge ? (
          <Badge label={badge.label} variant={badge.variant} />
        ) : (
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={onTake}
              className="bg-primary-600 rounded-xl px-3 py-1.5"
            >
              <Text className="font-menu text-white text-xs">Taken</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onSkip}
              className="bg-stone-200 rounded-xl px-3 py-1.5"
            >
              <Text className="font-menu text-gray-600 text-xs">Skip</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Card>
  );
}
