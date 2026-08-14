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
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import {
  createNurse,
  deleteNurse,
  getAllNurses,
  updateNurse,
  type Nurse,
} from "../../db/queries/nurses";
import { useAuthStore } from "../../store/authStore";

const emptyForm = {
  fname: "",
  lname: "",
  contact_number: "",
  email: "",
  password: "",
  role: "Nurse",
};

export default function NursesScreen() {
  const user = useAuthStore((s) => s.user);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [refreshing, setRefresh] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Nurse | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    const data = await getAllNurses();
    setNurses(data);
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

  function openEdit(nurse: Nurse) {
    setEditing(nurse);
    setForm({
      fname: nurse.fname,
      lname: nurse.lname,
      contact_number: nurse.contact_number ?? "",
      email: nurse.email,
      password: "",
      role: nurse.role ?? "Nurse",
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function handleSave() {
    if (!form.fname || !form.lname || !form.email || (!editing && !form.password)) {
      Alert.alert("Required", "Fill in all required fields.");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateNurse(editing.id, form);
      } else {
        await createNurse({ ...form, created_by_admin: user!.id });
      }
      closeModal();
      await load();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not save nurse.");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(nurse: Nurse) {
    Alert.alert("Delete Nurse", `Remove ${nurse.fname} ${nurse.lname}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteNurse(nurse.id);
            await load();
          } catch (e: any) {
            Alert.alert("Unable to Delete", e.message ?? "Could not delete nurse.");
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
          <Text className="text-xl font-bold text-gray-800">Medical Staff</Text>
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
        data={nurses}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#277859" />}
        ListEmptyComponent={
          <View className="items-center pt-20">
            <Ionicons name="people-outline" size={40} color="#d1d5db" />
            <Text className="text-muted text-sm mt-3">No nurses added yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="bg-white rounded-2xl px-4 py-3 mb-3 border border-border">
            <View className="flex-row items-center">
              <Avatar name={`${item.fname} ${item.lname}`} />
              <View className="flex-1 ml-3">
                <Text className="text-sm font-semibold text-gray-800">
                  {item.fname} {item.lname}
                </Text>
                <Text className="text-xs text-muted mt-0.5">{item.email}</Text>
                <Text className="text-xs text-muted mt-0.5">{item.contact_number || "No contact number"}</Text>
                <Text className="text-xs text-primary-600 mt-1">{item.role || "Nurse"}</Text>
                <Text className="text-xs text-primary-600 mt-1">
                  {item.patient_count ?? 0} patient{item.patient_count !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
            <View className="flex-row justify-end gap-2 mt-3">
              <TouchableOpacity
                onPress={() => openEdit(item)}
                className="flex-row items-center rounded-xl border border-border px-3 py-2"
              >
                <Ionicons name="create-outline" size={16} color="#44604f" />
                <Text className="text-xs font-semibold text-primary-700 ml-1">Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => confirmDelete(item)}
                className="flex-row items-center rounded-xl bg-red-50 px-3 py-2"
              >
                <Ionicons name="trash-outline" size={16} color="#e05252" />
                <Text className="text-xs font-semibold text-red-600 ml-1">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-surface">
          <View className="px-6 pt-6 pb-4 flex-row items-center justify-between border-b border-border">
            <Text className="text-lg font-bold text-gray-800">
              {editing ? "Edit Nurse" : "New Nurse"}
            </Text>
            <TouchableOpacity onPress={closeModal}>
              <Ionicons name="close" size={24} color="#6b7a72" />
            </TouchableOpacity>
          </View>
          <View className="px-6 pt-5 gap-4">
            {[
              { key: "fname", label: "First Name", placeholder: "Grace" },
              { key: "lname", label: "Last Name", placeholder: "Doctor" },
              { key: "contact_number", label: "Contact Number", placeholder: "+63 9XX XXX XXXX" },
              { key: "email", label: "Email", placeholder: "staff@mho.polomolok" },
              {
                key: "password",
                label: editing ? "New Password (Optional)" : "Password",
                placeholder: "••••••••",
                secure: true,
              },
            ].map((field) => (
              <View key={field.key}>
                <Text className="text-xs font-medium text-muted mb-1.5">{field.label}</Text>
                <TextInput
                  value={(form as any)[field.key]}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, [field.key]: value }))}
                  placeholder={field.placeholder}
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={field.secure}
                  autoCapitalize="none"
                  className="bg-white border border-border rounded-xl px-4 py-3.5 text-sm text-gray-800"
                />
              </View>
            ))}
            <View>
              <Text className="text-xs font-medium text-muted mb-1.5">Role</Text>
              <View className="flex-row gap-3">
                {['Doctor', 'Nurse'].map((role) => (
                  <TouchableOpacity
                    key={role}
                    onPress={() => setForm((prev) => ({ ...prev, role }))}
                    className={`flex-1 py-3 rounded-xl border items-center ${
                      form.role === role ? 'bg-primary-600 border-primary-600' : 'bg-white border-border'
                    }`}
                  >
                    <Text className={`text-sm font-semibold ${form.role === role ? 'text-white' : 'text-gray-700'}`}>
                      {role}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Button
              label={editing ? "Save Changes" : "Create Staff"}
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
