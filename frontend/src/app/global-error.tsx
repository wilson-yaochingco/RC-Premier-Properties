"use client";

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#f5f2eb",
          color: "#3a424f",
          fontFamily: '"Segoe UI", Arial, sans-serif',
          margin: 0,
        }}
      >
        <main
          style={{
            alignItems: "flex-start",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "clamp(24px, 8vw, 96px)",
          }}
        >
          <title>Application error | RC Premier Properties</title>
          <p style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>
            RC Premier Properties
          </p>
          <h1
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "clamp(42px, 8vw, 88px)",
              fontWeight: 400,
              lineHeight: 1,
              margin: 0,
              maxWidth: "12ch",
            }}
          >
            The application could not continue.
          </h1>
          <button
            type="button"
            onClick={retry}
            style={{
              background: "#3a424f",
              border: 0,
              color: "white",
              cursor: "pointer",
              minHeight: "48px",
              padding: "14px 22px",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
