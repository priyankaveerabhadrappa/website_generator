import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
        <p className="text-muted mb-8">This application site doesn&apos;t exist yet.</p>
        <Link
          href="/dashboard"
          className="px-6 py-3 bg-accent text-white font-medium rounded-lg hover:bg-accent-light transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
