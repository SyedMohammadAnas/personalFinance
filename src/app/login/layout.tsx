import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | Your App',
  description: 'Login to your account',
};

export default function LoginLayout({
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
