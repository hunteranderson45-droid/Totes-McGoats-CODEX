import type { ReactNode } from 'react';

type AppShellProps = {
  header: ReactNode;
  nav: ReactNode;
  children: ReactNode;
};

export default function AppShell({ header, nav, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="sticky top-0 z-10">{header}</header>
      <nav className="border-b border-gray-200">{nav}</nav>
      <main className="px-4 py-6">{children}</main>
    </div>
  );
}
