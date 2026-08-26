import { AppHeader } from '@/components/layout/app-header';
import { AuthGuard } from '@/components/layout/auth-guard';
import { UploadDock } from '@/components/uploads/upload-dock';

export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <AuthGuard>
      <div className="flex min-h-dvh flex-col">
        <AppHeader />
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</div>
        <UploadDock />
      </div>
    </AuthGuard>
  );
}
