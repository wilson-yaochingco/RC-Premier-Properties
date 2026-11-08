import type { ReactNode } from "react";

/** Plain outline icons sized by the surrounding CSS; decorative unless a label is supplied. */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export const BedIcon = () => (
  <Icon>
    <path d="M3 18V6m0 8h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" />
    <circle cx="7" cy="11" r="1.75" />
  </Icon>
);

export const BathIcon = () => (
  <Icon>
    <path d="M4 12h16v2.5a4.5 4.5 0 0 1-4.5 4.5h-7A4.5 4.5 0 0 1 4 14.5V12Zm2 7-1 2m14-2 1 2M7 12V6.5a2 2 0 0 1 3.5-1.3" />
  </Icon>
);

export const CarIcon = () => (
  <Icon>
    <path d="M5 16.5V18a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.5m8 0V18a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.5M3.5 16.5h17V12L18.2 7.4A2 2 0 0 0 16.4 6.3H7.6a2 2 0 0 0-1.8 1.1L3.5 12v4.5Z" />
    <path d="M3.5 12h17M7.5 14.5h.01M16.5 14.5h.01" />
  </Icon>
);

export const FloorAreaIcon = () => (
  <Icon>
    <path d="M4 20V4h16v16H4Zm0-5h5v5m0-16v5h5" />
  </Icon>
);

export const LotAreaIcon = () => (
  <Icon>
    <path d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Zm-8.5 9L12 16.5l8.5-4.5M3.5 16.5 12 21l8.5-4.5" />
  </Icon>
);

export const PinIcon = () => (
  <Icon>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.25" />
  </Icon>
);

export const PhotosIcon = () => (
  <Icon>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle cx="9" cy="10" r="1.75" />
    <path d="m4 17 5-4.5 3.5 3 3-2.5L20 17" />
  </Icon>
);

export const ShareIcon = () => (
  <Icon>
    <path d="M12 15V4m0 0L8 8m4-4 4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
  </Icon>
);

export const PhoneIcon = () => (
  <Icon>
    <path d="M5 4h3.5l1.7 4.2-2.1 1.3a11 11 0 0 0 5.4 5.4l1.3-2.1L19 14.5V18a2 2 0 0 1-2 2A13 13 0 0 1 3 6a2 2 0 0 1 2-2Z" />
  </Icon>
);

export const MailIcon = () => (
  <Icon>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
    <path d="m4 7 8 6 8-6" />
  </Icon>
);

/** A quiet architectural mark, used where a person's photograph is not yet available. */
export const BuildingIcon = () => (
  <Icon>
    <path d="M5 20V9l7-5 7 5v11M3.5 20h17M9.5 20v-5h5v5M9.5 11.5h.01M14.5 11.5h.01" />
  </Icon>
);

export const ArrowLeftIcon = () => (
  <Icon>
    <path d="M19 12H5m6-6-6 6 6 6" />
  </Icon>
);

export const CloseIcon = () => (
  <Icon>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const CheckIcon = () => (
  <Icon>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);
