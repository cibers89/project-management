import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin");
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 md:px-10">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
          Dashboard
        </h1>
        <p className="mt-1 text-gray-500">
          Welcome back, {session.user?.name}
        </p>
      </header>

      {/* Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Role" value={session.user?.role} />
        <Card title="Projects" value="3 Active" />
        <Card title="Daily Reports" value="5 Submitted" />
        <Card title="Status" value="On Track" />
      </section>

      {/* Activity */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Activity
        </h2>

        <div className="rounded-2xl bg-white shadow-sm divide-y">
          <ActivityItem text="Created Project Alpha" />
          <ActivityItem text="Submitted Daily Report" />
          <ActivityItem text="Updated Project Timeline" />
        </div>
      </section>
    </main>
  );
}

function Card({ title, value }: { title: string; value?: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-400">{title}</p>
      <p className="mt-2 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function ActivityItem({ text }: { text: string }) {
  return (
    <div className="px-5 py-4 text-gray-700 text-sm">
      {text}
    </div>
  );
}
