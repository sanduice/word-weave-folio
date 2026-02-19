import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already signed in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/", { replace: true });
    });
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const { error: err } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (err) {
      setError("Sign-in failed. Please try again.");
      setLoading(false);
    }
    // On success Lovable Cloud handles the redirect; session is restored via onAuthStateChange
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-lg p-8 flex flex-col items-center gap-6">

        {/* Logo + Name */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-5xl">📝</span>
          <h1 className="text-2xl font-bold tracking-tight text-card-foreground">Notespace</h1>
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            Your personal wiki — organised, searchable, and always in sync.
          </p>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-border" />

        {/* Sign-in button */}
        <Button
          className="w-full h-11 gap-3 text-base font-medium"
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          {loading ? (
            <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          ) : (
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          {loading ? "Signing in…" : "Continue with Google"}
        </Button>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        {/* Footer */}
        <p className="text-[11px] text-muted-foreground/60 text-center leading-relaxed">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
