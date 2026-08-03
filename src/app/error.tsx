"use client";

import * as React from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-2xl">
          ⚠️
        </div>
        <h2 className="mt-4 text-lg font-semibold text-zinc-900">Qualcosa è andato storto</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Si è verificato un errore imprevisto. Puoi riprovare: i tuoi dati sono al sicuro.
        </p>
        <button
          onClick={() => reset()}
          className="mt-5 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          Riprova
        </button>
      </div>
    </div>
  );
}
