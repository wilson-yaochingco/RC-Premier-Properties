type SocialPlatform = "Facebook" | "Instagram" | "YouTube" | "TikTok";

export function SocialMediaIcon({ platform }: { platform: SocialPlatform }) {
  if (platform === "Facebook") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M13.6 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.8-.1-1.6-.2-2.4-.2-2.4 0-4 1.5-4 4.1V10H7.8v3h2.7v8h3.1Z" />
      </svg>
    );
  }

  if (platform === "Instagram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
        <circle cx="12" cy="12" r="4" />
        <path d="M18.5 6.7a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
      </svg>
    );
  }

  if (platform === "YouTube") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M21 8.1a3 3 0 0 0-2.1-2.2C17.1 5.4 12 5.4 12 5.4s-5.1 0-6.9.5A3 3 0 0 0 3 8.1a31 31 0 0 0-.5 3.9A31 31 0 0 0 3 15.9a3 3 0 0 0 2.1 2.2c1.8.5 6.9.5 6.9.5s5.1 0 6.9-.5a3 3 0 0 0 2.1-2.2 31 31 0 0 0 .5-3.9 31 31 0 0 0-.5-3.9ZM10 15.2V8.8l5.5 3.2-5.5 3.2Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M15.4 3c.3 2.2 1.6 3.6 3.7 3.8v3.1a8.5 8.5 0 0 1-3.7-.9v6.1a5.9 5.9 0 1 1-5.1-5.8v3.2a2.8 2.8 0 1 0 2 2.7V3h3.1Z" />
    </svg>
  );
}
