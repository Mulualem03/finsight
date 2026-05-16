import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFinishConnect } from '../hooks/useGoals';

/**
 * In mock mode, the "auth URL" returned by the mock provider is /connect/mock?state=...&code=...
 * This page receives that, POSTs the code+state to the backend, and redirects to the dashboard.
 * In TrueLayer mode, this page is unused - the redirect_uri is /connect/callback instead.
 */
export function MockCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const finishConnect = useFinishConnect();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get('code');
    const state = params.get('state');
    if (!code || !state) {
      setError('Missing code or state');
      return;
    }
    finishConnect
      .mutateAsync({ code, state })
      .then(() => navigate('/', { replace: true }))
      .catch((err) => setError(err instanceof Error ? err.message : 'Connection failed'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid min-h-full place-items-center p-8">
      {error ? (
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-600">Connection failed</h2>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
        </div>
      ) : (
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-600">Finalising your bank connection…</p>
        </div>
      )}
    </div>
  );
}
