export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold text-primary">
        Sistem Informasi Kesekretariatan HIMA
      </h1>
      <p className="mt-4 text-muted-foreground">
        Silakan <a href="/login" className="underline text-primary">login</a> untuk melanjutkan.
      </p>
    </main>
  );
}
