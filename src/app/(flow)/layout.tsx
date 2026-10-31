/** Full-screen task flows (deposit, withdraw, PIN): no app chrome, centred narrow column. */
export default function FlowLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface">
      <div className="safe-bottom mx-auto flex min-h-dvh max-w-[560px] flex-col px-5 pb-6 pt-5">{children}</div>
    </div>
  );
}
