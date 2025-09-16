import Link from "next/link"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Welcome to StashDash
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          Enterprise-grade inventory accuracy for lean e-commerce operations
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/login"
            className="rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-lg border border-border px-6 py-3 hover:bg-secondary transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  )
}