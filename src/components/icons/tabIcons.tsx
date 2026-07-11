// Icônes d'onglets — DA « The Board », piste « Encre & or ».
// Style : trait épais + aplat translucide de la teinte (effet tampon à l'encre).
// Tout est piloté par `currentColor` : chaque onglet impose sa couleur (accent),
// et l'aplat (fill-opacity) suit la même teinte. Même API que lucide-react
// (on passe `className` pour la taille : size-5 / size-6), donc interchangeable.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

// Gabarit commun : viewBox 24, trait rond, encre = currentColor.
function InkIcon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {children}
    </svg>
  );
}

// Inventaire — sacoche d'enquête à rabat + boucle.
export function InventaireIcon(props: IconProps) {
  return (
    <InkIcon {...props}>
      <rect x="4" y="8.5" width="16" height="12" rx="2.5" fill="currentColor" fillOpacity={0.13} />
      <path d="M4 12.5H20" />
      <path d="M8.5 8.5V7.5a3.5 3 0 0 1 7 0V8.5" />
      <rect x="10.75" y="11.2" width="2.5" height="3" rx="0.6" />
    </InkIcon>
  );
}

// Suspicions — cible + mire (le suspect dans le viseur).
export function SuspicionsIcon(props: IconProps) {
  return (
    <InkIcon {...props}>
      <circle cx="12" cy="12" r="7.5" fill="currentColor" fillOpacity={0.1} />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <path d="M12 1.8V4M12 20v2.2M1.8 12H4M20 12h2.2" />
    </InkIcon>
  );
}

// Annonces — porte-voix + ondes.
export function AnnoncesIcon(props: IconProps) {
  return (
    <InkIcon {...props}>
      <path d="M4 9.5v5h3l9 4.5V5l-9 4.5z" fill="currentColor" fillOpacity={0.13} />
      <path d="M6 14.5v2.8a1.6 1.6 0 0 0 3.2 0v-1.8" />
      <path d="M18.5 8.7a4 4 0 0 1 0 6.6" />
    </InkIcon>
  );
}

// Testament — plume + paraphe manuscrit.
export function TestamentIcon(props: IconProps) {
  return (
    <InkIcon {...props}>
      <path d="M18 5C18 11 14 16 7 17L5 15C6 8 11 5 18 5Z" fill="currentColor" fillOpacity={0.13} />
      <path d="M6.5 17.5L14.5 9" />
      <path d="M4 21q3-1.6 6 0" />
    </InkIcon>
  );
}

// Capacité — éclair.
export function CapaciteIcon(props: IconProps) {
  return (
    <InkIcon {...props}>
      <path
        d="M13.5 2.5L6 13h4.5l-2 8.5L18 10.5h-4.5l2-8z"
        fill="currentColor"
        fillOpacity={0.15}
      />
    </InkIcon>
  );
}

// Rôle — loup de bal masqué.
export function RoleIcon(props: IconProps) {
  return (
    <InkIcon {...props}>
      <path
        d="M2.5 10C2.5 8 4 7 6 7 8.5 7 10 8 12 8 14 8 15.5 7 18 7 20 7 21.5 8 21.5 10 21.5 13 19 15.5 15.5 15.5 13.7 15.5 12.7 14.3 12 13.3 11.3 14.3 10.3 15.5 8.5 15.5 5 15.5 2.5 13 2.5 10Z"
        fill="currentColor"
        fillOpacity={0.13}
      />
      <ellipse cx="7.2" cy="10.8" rx="1.7" ry="1.2" />
      <ellipse cx="16.8" cy="10.8" rx="1.7" ry="1.2" />
    </InkIcon>
  );
}

// Historique — page-dossier à coin corné.
export function HistoriqueIcon(props: IconProps) {
  return (
    <InkIcon {...props}>
      <path
        d="M7 4.5h6.5l4.5 4.5v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1z"
        fill="currentColor"
        fillOpacity={0.12}
      />
      <path d="M13.5 4.5v4.5h4.5" />
      <path d="M9 12h6M9 15h6M9 9h3" />
    </InkIcon>
  );
}

// Victoire — trophée à anses.
export function VictoireIcon(props: IconProps) {
  return (
    <InkIcon {...props}>
      <path d="M7 5h10v3a5 5 0 0 1-10 0z" fill="currentColor" fillOpacity={0.14} />
      <path d="M7 6H4.4a2 2 0 0 0 2.2 4.2M17 6h2.6a2 2 0 0 1-2.2 4.2" />
      <path d="M12 13v3" />
      <path d="M9.5 19.5h5M10.5 16h3v3.5h-3z" />
    </InkIcon>
  );
}

// Chat — bulle de dialogue.
export function ChatIcon(props: IconProps) {
  return (
    <InkIcon {...props}>
      <path
        d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H10l-4 3v-3H5a1.5 1.5 0 0 1-1.5-1.5V6.5A1.5 1.5 0 0 1 5 5z"
        fill="currentColor"
        fillOpacity={0.12}
      />
      <circle cx="8.5" cy="10.8" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="10.8" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="10.8" r="1" fill="currentColor" stroke="none" />
    </InkIcon>
  );
}
