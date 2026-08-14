import React from "react";
import { View, ViewProps } from "react-native";

interface CardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "", style, ...props }: CardProps) {
  return (
    <View
      className={`bg-card rounded-2xl p-4 shadow-sm border border-border ${className}`}
      style={style}
      {...props}
    >
      {children}
    </View>
  );
}
