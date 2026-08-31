import BackendStatus from "@/components/BackendStatus";
import { API_BASE_URL } from "@/lib/env";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            RC Premier Properties
          </h1>
          <p className="opacity-70">Project foundation — no features implemented yet.</p>
        </header>

        <dl className="divide-y divide-black/10 rounded-lg border border-black/10 text-sm dark:divide-white/15 dark:border-white/15">
          <div className="flex items-center justify-between gap-4 p-4">
            <dt className="opacity-70">Frontend</dt>
            <dd className="font-medium">Next.js is running</dd>
          </div>
          <div className="flex items-center justify-between gap-4 p-4">
            <dt className="opacity-70">API base URL</dt>
            <dd className="font-mono text-xs break-all">{API_BASE_URL}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 p-4">
            <dt className="opacity-70">Backend</dt>
            <dd>
              <BackendStatus />
            </dd>
          </div>
        </dl>
      </div>
    </main>
  );
}
