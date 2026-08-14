import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, TouchableOpacityProps } from "react-native";

type ButtonVariant = "primary" | "outline" | "ghost" | "danger";

const variantContainer: Record<ButtonVariant, string> = {
  primary: "bg-primary-600 border border-primary-600",
  outline: "bg-transparent border border-primary-600",
  ghost:   "bg-transparent border border-transparent",
  danger:  "bg-red-500 border border-red-500",
};

const variantText: Record<ButtonVariant, string> = {
  primary: "text-white",
  outline: "text-primary-600",
  ghost:   "text-primary-600",
  danger:  "text-white",
};

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  label,
  variant = "primary",
  loading = false,
  fullWidth = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <TouchableOpacity
      className={`
        flex-row items-center justify-center rounded-xl py-3 px-5
        ${variantContainer[variant]}
        ${fullWidth ? "w-full" : ""}
        ${disabled || loading ? "opacity-50" : ""}
      `}
      disabled={disabled || loading}
      activeOpacity={0.75}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" || variant === "danger" ? "#fff" : "#277859"}
          size="small"
        />
      ) : (
        <Text className={`font-menu text-sm ${variantText[variant]}`}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}
