import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import {
  createRoom,
  deleteRoom,
  getAllRooms,
  updateRoom,
  type Room,
} from "../../db/queries/rooms";

const typeIcon: Record<string, any> = {
  General: "bed-outline",
  Private: "home-outline",
  ICU: "pulse-outline",
};

const emptyForm = {
  room_name: "",
  room_type: "General",
  capacity: "1",
  status: "available",
};

export default function RoomsScreen() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [refreshing, setRefresh] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    const data = await getAllRooms();
    setRooms(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefresh(true);
    await load();
    setRefresh(false);
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(room: Room) {
    setEditing(room);
    setForm({
      room_name: room.room_name,
      room_type: room.room_type,
      capacity: String(room.capacity),
      status: room.status,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function handleSave() {
    if (!form.room_name || !form.capacity) {
      Alert.alert("Required", "Room name and capacity are required.");
      return;
    }

    const capacity = Number(form.capacity);
    if (!Number.isFinite(capacity) || capacity <= 0) {
      Alert.alert("Invalid Capacity", "Capacity must be at least 1.");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateRoom(editing.room_id, {
          room_name: form.room_name,
          room_type: form.room_type,
          capacity,
          status: form.status,
        });
      } else {
        await createRoom({
          room_name: form.room_name,
          room_type: form.room_type,
          capacity,
          status: form.status,
        });
      }
      closeModal();
      await load();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not save room.");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(room: Room) {
    Alert.alert("Delete Room", `Remove ${room.room_name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteRoom(room.room_id);
            await load();
          } catch (e: any) {
            Alert.alert("Unable to Delete", e.message ?? "Could not delete room.");
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <View className="px-6 pt-6 pb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-xs text-muted font-medium">Management</Text>
          <Text className="text-xl font-bold text-gray-800">Rooms</Text>
        </View>
        <TouchableOpacity
          onPress={openCreate}
          className="flex-row items-center bg-primary-600 rounded-xl px-4 py-2.5"
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text className="text-white text-sm font-semibold ml-1">Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={(item) => String(item.room_id)}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#277859" />}
        ListEmptyComponent={
          <View className="items-center pt-20">
            <Ionicons name="bed-outline" size={40} color="#d1d5db" />
            <Text className="text-muted text-sm mt-3">No rooms found</Text>
          </View>
        }
        renderItem={({ item }) => {
          const occupied = item.occupied ?? 0;
          const isFull = occupied >= item.capacity;

          return (
            <View className="flex-1 bg-white rounded-2xl p-4 border border-border mb-3">
              <View className="flex-row items-center justify-between mb-3">
                <View className="w-9 h-9 rounded-xl bg-primary-50 items-center justify-center">
                  <Ionicons name={typeIcon[item.room_type] ?? "bed-outline"} size={18} color="#277859" />
                </View>
                <Badge
                  label={item.status}
                  variant={
                    item.status === "maintenance"
                      ? "warning"
                      : isFull || item.status === "full"
                        ? "danger"
                        : "success"
                  }
                />
              </View>
              <Text className="text-sm font-bold text-gray-800">{item.room_name}</Text>
              <Text className="text-xs text-muted mt-0.5">{item.room_type}</Text>
              <View className="mt-3 flex-row items-center">
                <View className="h-1.5 rounded-full bg-primary-200 flex-1" style={{ overflow: "hidden" }}>
                  <View
                    className="h-1.5 rounded-full bg-primary-600"
                    style={{ width: `${Math.min((occupied / item.capacity) * 100, 100)}%` }}
                  />
                </View>
                <Text className="text-xs text-muted ml-2">
                  {occupied}/{item.capacity}
                </Text>
              </View>
              <View className="flex-row justify-end gap-2 mt-4">
                <TouchableOpacity onPress={() => openEdit(item)} className="rounded-xl border border-border px-3 py-2">
                  <Ionicons name="create-outline" size={16} color="#44604f" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(item)} className="rounded-xl bg-red-50 px-3 py-2">
                  <Ionicons name="trash-outline" size={16} color="#e05252" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-surface">
          <View className="px-6 pt-6 pb-4 flex-row items-center justify-between border-b border-border">
            <Text className="text-lg font-bold text-gray-800">
              {editing ? "Edit Room" : "New Room"}
            </Text>
            <TouchableOpacity onPress={closeModal}>
              <Ionicons name="close" size={24} color="#6b7a72" />
            </TouchableOpacity>
          </View>
          <View className="px-6 pt-5 gap-4">
            <View>
              <Text className="text-xs font-medium text-muted mb-1.5">Room Name</Text>
              <TextInput
                value={form.room_name}
                onChangeText={(room_name) => setForm((prev) => ({ ...prev, room_name }))}
                placeholder="Room 301"
                placeholderTextColor="#9ca3af"
                className="bg-white border border-border rounded-xl px-4 py-3.5 text-sm text-gray-800"
              />
            </View>
            <View>
              <Text className="text-xs font-medium text-muted mb-1.5">Capacity</Text>
              <TextInput
                value={form.capacity}
                onChangeText={(capacity) => setForm((prev) => ({ ...prev, capacity }))}
                placeholder="2"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
                className="bg-white border border-border rounded-xl px-4 py-3.5 text-sm text-gray-800"
              />
            </View>
            <View>
              <Text className="text-xs font-medium text-muted mb-1.5">Room Type</Text>
              <View className="flex-row gap-3">
                {["General", "Private", "ICU"].map((roomType) => (
                  <TouchableOpacity
                    key={roomType}
                    onPress={() => setForm((prev) => ({ ...prev, room_type: roomType }))}
                    className={`flex-1 py-3 rounded-xl border items-center ${
                      form.room_type === roomType ? "bg-primary-600 border-primary-600" : "bg-white border-border"
                    }`}
                  >
                    <Text className={`text-sm font-semibold ${form.room_type === roomType ? "text-white" : "text-gray-700"}`}>
                      {roomType}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View>
              <Text className="text-xs font-medium text-muted mb-1.5">Status</Text>
              <View className="flex-row gap-3">
                {["available", "maintenance"].map((status) => (
                  <TouchableOpacity
                    key={status}
                    onPress={() => setForm((prev) => ({ ...prev, status }))}
                    className={`flex-1 py-3 rounded-xl border items-center ${
                      form.status === status ? "bg-primary-600 border-primary-600" : "bg-white border-border"
                    }`}
                  >
                    <Text className={`text-sm font-semibold capitalize ${form.status === status ? "text-white" : "text-gray-700"}`}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Button
              label={editing ? "Save Changes" : "Create Room"}
              loading={saving}
              onPress={handleSave}
              fullWidth
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
