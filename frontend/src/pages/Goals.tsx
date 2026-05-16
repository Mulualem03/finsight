import { FormEvent, useState } from 'react';
import { Plus } from 'lucide-react';
import { Card } from '../components/Card';
import { useAddContribution, useCreateGoal, useGoals } from '../hooks/useGoals';
import { formatDate, formatMoney } from '../lib/format';

export function Goals() {
  const goals = useGoals();
  const createGoal = useCreateGoal();
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Savings goals</h1>
          <p className="text-sm text-slate-500">Track progress against what you're saving for.</p>
        </div>
        <button onClick={() => setCreating((v) => !v)} className="btn-primary">
          <Plus className="h-4 w-4" /> New goal
        </button>
      </header>

      {creating && (
        <Card title="Create goal">
          <CreateGoalForm
            onSubmit={async (data) => {
              await createGoal.mutateAsync(data);
              setCreating(false);
            }}
          />
        </Card>
      )}

      {goals.isLoading && <div className="h-40 animate-pulse rounded-md bg-slate-100" />}

      {goals.data && goals.data.length === 0 && !creating && (
        <div className="rounded-md border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
          No goals yet. Set one to start tracking.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {goals.data?.map((g) => <GoalCard key={g.id} goal={g} />)}
      </div>
    </div>
  );
}

function GoalCard({ goal }: { goal: { id: string; name: string; targetAmount: string; saved: string; progress: number; deadline: string | null } }) {
  const addContribution = useAddContribution();
  const [amount, setAmount] = useState('');

  return (
    <Card title={goal.name}>
      <div className="text-sm text-slate-500">
        {formatMoney(goal.saved)} of {formatMoney(goal.targetAmount)}
        {goal.deadline && <span> · by {formatDate(goal.deadline)}</span>}
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand-500"
          style={{ width: `${Math.min(100, goal.progress)}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">{goal.progress.toFixed(0)}% saved</p>

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          const pounds = Number(amount);
          if (!Number.isFinite(pounds) || pounds <= 0) return;
          addContribution.mutate({ id: goal.id, amount: Math.round(pounds * 100) });
          setAmount('');
        }}
        className="mt-4 flex items-center gap-2"
      >
        <span className="text-sm text-slate-500">£</span>
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input w-32 py-1 text-sm"
        />
        <button type="submit" className="btn-secondary text-sm" disabled={!amount}>
          Add
        </button>
      </form>
    </Card>
  );
}

function CreateGoalForm({ onSubmit }: { onSubmit: (data: { name: string; targetAmount: number; deadline?: string }) => Promise<void> }) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const pounds = Number(target);
        if (!name || !Number.isFinite(pounds) || pounds <= 0) return;
        setBusy(true);
        try {
          await onSubmit({
            name,
            targetAmount: Math.round(pounds * 100),
            deadline: deadline || undefined,
          });
          setName(''); setTarget(''); setDeadline('');
        } finally {
          setBusy(false);
        }
      }}
      className="grid gap-3 sm:grid-cols-3"
    >
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emergency fund" className="input sm:col-span-1" />
      <input type="number" step="0.01" min="0" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target £" className="input" />
      <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="input" />
      <div className="sm:col-span-3">
        <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create goal'}</button>
      </div>
    </form>
  );
}
