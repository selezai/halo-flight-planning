export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="h-screen overflow-hidden">
      {children}
    </main>
  );
}
