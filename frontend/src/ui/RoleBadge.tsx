"use client";
import React from "react";

type RoleBadgeProps = {
  role: string;
};

export function RoleBadge({ role }: RoleBadgeProps) {
  const colorMap: Record<string, string> = {
    admin: "bg-amber-500",
    moderator: "bg-emerald-500",
    owner: "bg-blue-500",
    user: "bg-zinc-500",
  };
  const colorClass = colorMap[role] ?? colorMap.user;
  return (
    <span className={`text-xs px-2 py-1 rounded-full text-white ${colorClass}`}>
      {role}
    </span>
  );
}
