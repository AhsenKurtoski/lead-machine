"use client";

const wrap = {
  display: "flex",
  minHeight: "100vh",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "system-ui, sans-serif",
  padding: "24px",
} as const;
const card = { maxWidth: "420px", textAlign: "center" } as const;
const titleStyle = { fontSize: "20px", fontWeight: 700, margin: "0 0 8px" } as const;
const textStyle = { fontSize: "14px", color: "#71717a", margin: 0 } as const;
const btn = {
  marginTop: "20px",
  padding: "10px 20px",
  borderRadius: "9999px",
  background: "#4f46e5",
  color: "#fff",
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
} as const;

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="it">
      <body>
        <div style={wrap}>
          <div style={card}>
            <h2 style={titleStyle}>Errore imprevisto</h2>
            <p style={textStyle}>
              L'applicazione ha riscontrato un problema. Ricarica la pagina per continuare.
            </p>
            <button style={btn} onClick={() => reset()}>
              Ricarica
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
