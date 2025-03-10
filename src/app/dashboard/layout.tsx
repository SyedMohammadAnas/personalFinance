import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | Your App',
  description: 'Your personal dashboard',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
