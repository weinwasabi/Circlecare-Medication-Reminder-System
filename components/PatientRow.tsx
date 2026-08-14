import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Avatar } from "./ui/Avatar";
import { Badge } from "./ui/Badge";
import type { Patient } from "../db/queries/patients";

interface PatientRowProps {
  patient: Patient;
  onPress?: () => void;
}

export function PatientRow({ patient, onPress }: PatientRowProps) {
  const fullName = `${patient.fname} ${patient.lname}`;
  const statusVariant =
    patient.status === "active" ? "success" : patient.status === "discharged" ? "muted" : "warning";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center bg-card rounded-2xl px-4 py-3 mb-3 border border-border"
    >
      <Avatar name={fullName} size="md" />
      <View className="flex-1 ml-3">
        <Text className="font-heading text-sm text-ink">{fullName}</Text>
        <Text className="text-xs text-muted mt-0.5">
          {patient.illness_name ?? "—"} · {patient.room_name ?? "—"}
        </Text>
        <Text className="text-xs text-muted mt-0.5">
          Assigned to: {patient.nurse_fname ? `${patient.nurse_fname} ${patient.nurse_lname ?? ""}`.trim() : "Unassigned"}
        </Text>
      </View>
      <Badge label={patient.status ?? "active"} variant={statusVariant} />
    </TouchableOpacity>
  );
}
