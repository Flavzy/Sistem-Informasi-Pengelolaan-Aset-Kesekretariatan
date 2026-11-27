import { LoginForm } from "./login-form";

export const metadata = {
  title: "Login | Kesekretariatan HIMA",
  description: "Masuk ke Sistem Informasi Kesekretariatan HIMA",
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh w-full items-center justify-center bg-gradient-to-b from-[#cbe6fb] via-[#e8f4fe] to-[#f9fcff] px-4 py-8 sm:px-6">
      {/* Dekorasi atmosfer langit & lengkung tipis di belakang kartu */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0)_72%)]" />
        <div className="absolute left-1/2 top-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/65 sm:size-[620px]" />
        <div className="absolute left-1/2 top-1/2 size-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/45 sm:size-[860px]" />
      </div>

      <LoginForm />
    </main>
  );
}
