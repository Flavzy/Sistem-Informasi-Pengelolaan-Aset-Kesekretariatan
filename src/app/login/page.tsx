import { LoginForm } from "./login-form";

export const metadata = {
  title: "Login | Kesekretariatan HIMA",
  description: "Masuk ke Sistem Informasi Kesekretariatan HIMA",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-muted/30">
      <LoginForm />
    </main>
  );
}
