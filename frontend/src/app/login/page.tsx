import { AuthScreen } from '@/features/auth/components/AuthScreen';

interface LoginPageProps {
  searchParams: Promise<{ mode?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps): Promise<React.ReactElement> {
  const params = await searchParams;
  const mode = params.mode === 'register' || params.mode === 'forgot' ? params.mode : 'login';
  return <AuthScreen mode={mode} />;
}
