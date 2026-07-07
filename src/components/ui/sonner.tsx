import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      duration={2000}
      toastOptions={{
        // Cadre "verre sombre" aligné sur la DA (cf. .glass-panel / --shadow-raised).
        // S'applique aux toasts système (succès/erreur). Les notifs de jeu
        // utilisent leur propre carte custom (GameToast).
        style: {
          background:
            "linear-gradient(135deg, oklch(0.20 0.025 35 / 0.88), oklch(0.16 0.02 35 / 0.88))",
          backdropFilter: "blur(12px) saturate(1.15)",
          WebkitBackdropFilter: "blur(12px) saturate(1.15)",
          border: "1px solid oklch(1 0 0 / 0.07)",
          borderRadius: "0.75rem",
          boxShadow: "var(--shadow-raised)",
          color: "var(--color-foreground)",
          fontFamily: "Inter, system-ui, sans-serif",
        },
        classNames: {
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
