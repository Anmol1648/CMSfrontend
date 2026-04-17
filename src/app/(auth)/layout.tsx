/**
 * Auth route group layout.
 * No Sidebar, No Header — clean full-screen layout for login/register pages.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
