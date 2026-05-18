import { SharedDiagramView } from '@/features/diagram/components/SharedDiagramView';

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: SharePageProps): Promise<React.ReactElement> {
  const { token } = await params;
  return <SharedDiagramView token={token} />;
}
