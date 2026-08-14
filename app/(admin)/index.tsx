import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Card } from "../../components/ui/Card";
import { useAuthStore } from "../../store/authStore";
import { getDatabase } from "../../db/database";

interface Stats {
  nurses: number;
  patients: number;
  rooms: number;
  alerts: number;
}

export default function AdminDashboard() {
  const router  = useRouter();
  const user    = useAuthStore((s) => s.user);
  const logout  = useAuthStore((s) => s.logout);
  const [stats, setStats]       = useState<Stats>({ nurses: 0, patients: 0, rooms: 0, alerts: 0 });
  const [refreshing, setRefresh] = useState(false);

  const load = useCallback(async () => {
    const db = await getDatabase();
    const [n, p, r, a] = await Promise.all([
      db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM nurses`),
      db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM patients WHERE status = 'active'`),
      db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM rooms WHERE status = 'available'`),
      db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM alerts WHERE status = 'unread'`),
    ]);
    setStats({ nurses: n?.c ?? 0, patients: p?.c ?? 0, rooms: r?.c ?? 0, alerts: a?.c ?? 0 });
  }, []);

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(async () => {
    setRefresh(true);
    await load();
    setRefresh(false);
  }, [load]);

  const statCards = [
    { label: "Care Staff",      value: stats.nurses,   icon: "people-outline",        color: "bg-primary-100",  text: "text-primary-700", iconColor: "#44604f" },
    { label: "Active Patients", value: stats.patients, icon: "person-outline",        color: "bg-blue-100",     text: "text-blue-700", iconColor: "#58718c" },
    { label: "Available Rooms", value: stats.rooms,    icon: "bed-outline",           color: "bg-amber-100",    text: "text-amber-700", iconColor: "#b98942" }
  ];

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#277859" />}
      >
        {/* Header */}
        <View className="px-6 pt-6 pb-4 flex-row items-center justify-between">
          <View>
            <Text className="font-menu text-xs text-muted">Welcome back,</Text>
            <Text className="font-heading text-2xl text-ink">
              {user?.fname} {user?.lname}
            </Text>
          </View>
          <TouchableOpacity
            onPress={logout}
            className="w-10 h-10 rounded-full bg-card border border-border items-center justify-center"
          >
            <Ionicons name="log-out-outline" size={20} color="#e05252" />
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View className="px-6 mb-6">
          <Text className="font-menu text-xs text-muted uppercase tracking-widest mb-3">Overview</Text>
          <View className="flex-row flex-wrap gap-3">
            {statCards.map((s) => (
              <Card key={s.label} className="flex-1 min-w-[44%]">
                <View className={`w-9 h-9 rounded-xl ${s.color} items-center justify-center mb-3`}>
                  <Ionicons name={s.icon as any} size={18} color={s.iconColor} />
                </View>
                <Text className={`font-heading text-2xl ${s.text}`}>{s.value}</Text>
                <Text className="text-xs text-muted mt-0.5">{s.label}</Text>
              </Card>
            ))}
          </View>
        </View>

        {/* Quick links */}
        <View className="px-6 mb-8">
          <Text className="font-menu text-xs text-muted uppercase tracking-widest mb-3">Quick Actions</Text>
          <View className="gap-3">
            {[
              { label: "Add Staff Member",    icon: "person-add-outline",   href: "/(admin)/nurses" },
              { label: "Register Patient",    icon: "clipboard-outline",    href: "/(admin)/patients" },
              { label: "Manage Rooms",        icon: "grid-outline",         href: "/(admin)/rooms" },
            ].map((q) => (
              <TouchableOpacity key={q.label} activeOpacity={0.8} onPress={() => router.push(q.href as any)}>
                <Card className="flex-row items-center">
                  <View className="w-9 h-9 rounded-xl bg-primary-50 items-center justify-center mr-3">
                    <Ionicons name={q.icon as any} size={18} color="#44604f" />
                  </View>
                  <Text className="flex-1 font-menu text-sm text-ink">{q.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
