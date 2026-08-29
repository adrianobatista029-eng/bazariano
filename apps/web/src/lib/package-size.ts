import type { PackageSize } from "@marketplace/supabase/queries";

export const PACKAGE_SIZES: { value: PackageSize; label: string }[] = [
  { value: "pequeno", label: "📦 Pequeno" },
  { value: "medio", label: "📦 Médio" },
  { value: "grande", label: "📦 Grande" },
];

export const PACKAGE_SIZE_LABEL: Record<PackageSize, string> = {
  pequeno: "📦 Pequeno",
  medio: "📦 Médio",
  grande: "📦 Grande",
};
