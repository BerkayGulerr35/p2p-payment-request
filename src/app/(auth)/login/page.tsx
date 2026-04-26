import { DevLoginButtons } from '@/components/dev-login-buttons';
import { LoginForm } from '@/components/login-form';
import { env } from '@/lib/env';

export default function LoginPage() {
  const showDevButtons = env.NEXT_PUBLIC_DEV_LOGIN === '1';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-muted-foreground text-sm">Enter your email to receive a magic link.</p>
        </div>

        <LoginForm />

        {showDevButtons && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background text-muted-foreground px-2">Demo accounts</span>
              </div>
            </div>
            <DevLoginButtons />
            <p className="text-muted-foreground text-center text-xs">
              These are throwaway evaluation accounts. Use either side to send and receive requests
              against the other.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
