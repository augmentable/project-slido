import { redirect } from 'next/navigation';

export default async function AnalyticsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  redirect(`/session/${code}/settings`);
}
