import Image from "next/image";

type LogoProps = {
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
};

export function Logo({ size = "md", iconOnly = false }: LogoProps) {
  const sizes = {
    sm: { icon: 16, fontSize: "text-sm" },
    md: { icon: 24, fontSize: "text-base" },
    lg: { icon: 32, fontSize: "text-lg" },
  };

  return (
    <div className="flex items-center gap-2">
      <Image
        src="/databricks-logo.svg"
        alt="Logo"
        width={sizes[size].icon}
        height={sizes[size].icon}
      />

      {!iconOnly && (
        <span className={`font-semibold ${sizes[size].fontSize}`}>Databricks</span>
      )}
    </div>
  );
}
