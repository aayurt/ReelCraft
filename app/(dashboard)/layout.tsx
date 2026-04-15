import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container flex items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="text-xl font-bold">
            Reely
          </Link>
          <nav className="flex gap-4">
            <Link href="/dashboard" className="hover:underline">
              Projects
            </Link>
          </nav>
        </div>
      </header>
      <main className="container px-4 py-8">{children}</main>
    </div>
  );
}