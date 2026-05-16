import { useState } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { Card } from '../components/Card';
import { useConnections, useStartConnect, useSync } from '../hooks/useGoals';
import { formatRelativeDate } from '../lib/format';

export function ConnectBank() {
  const connections = useConnections();
  const startConnect = useStartConnect();
  const sync = useSync();
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setError(null);
    try {
      const { authUrl } = await startConnect.mutateAsync();
      // Redirect off-app to the provider's auth flow (or to the mock callback page).
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start connection');
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Banks</h1>
        <p className="text-sm text-slate-500">Connect a bank account to import transactions automatically.</p>
      </header>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-900">Add a new bank</h3>
            <p className="mt-1 text-xs text-slate-500">
              You'll be redirected to your bank to authorise read-only access. We never see your password.
            </p>
          </div>
          <button onClick={connect} disabled={startConnect.isPending} className="btn-primary">
            {startConnect.isPending ? 'Starting…' : 'Connect bank'}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </Card>

      <Card title="Connected banks">
        {connections.isLoading && <div className="h-20 animate-pulse rounded-md bg-slate-100" />}
        {connections.data && connections.data.length === 0 && (
          <p className="text-sm text-slate-500">No banks connected yet.</p>
        )}
        <ul className="divide-y divide-slate-100">
          {connections.data?.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium text-slate-900">{c.institutionName}</div>
                <div className="text-xs text-slate-500">
                  {c.lastSyncedAt ? `Synced ${formatRelativeDate(c.lastSyncedAt)}` : 'Never synced'}
                  {' · '}{c.status.toLowerCase()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="btn-secondary text-xs"
                  onClick={() => sync.mutate(c.id)}
                  disabled={sync.isPending}
                >
                  <RefreshCw className="h-3 w-3" /> Sync
                </button>
                <button className="btn-ghost text-xs text-red-600 hover:bg-red-50">
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
