const PATHS = {
  location: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  home: <path d="M4 11 12 4l8 7M6 9.5V20h12V9.5M10 20v-5.5h4V20" />,
  area: <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />,
  condition: <path d="M9 4h6v3H9ZM7 5.5H5.5V20h13V5.5H17M9.2 13.5l2 2 3.6-3.8" />,
  ownership: <path d="M7 3.5h7l4 4V20.5H7ZM14 3.5v4h4M10 13h5M10 16.5h5" />,
  price: (
    <>
      <path d="M3.5 4h8.5l8.5 8.5-8 8-9-8.5Z" />
      <circle cx="8" cy="8.5" r="1.2" />
    </>
  ),
  photos: (
    <>
      <path d="M4 8h3l1.5-2.5h7L17 8h3v11H4Z" />
      <circle cx="12" cy="13" r="3.2" />
    </>
  ),
  timeline: <path d="M4 6h16v14H4ZM4 10.5h16M8 3.5v4M16 3.5v4" />,
} as const;

export type PreparationIconName = keyof typeof PATHS;

export function PreparationIcon({ name }: { name: PreparationIconName }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
