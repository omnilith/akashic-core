'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
      <p className="text-destructive">Error loading entity types:</p>
      <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
      <button
        onClick={() => reset()}
        className="mt-3 rounded bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}