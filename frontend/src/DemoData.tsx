import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useAuth, type LeadList } from './api';

export function DemoData() {
  const { user, request } = useAuth();
  const client = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    leads_created: number;
    tasks_created: number;
  } | null>(null);
  const availability = useQuery({
    queryKey: ['leads', user!.id, 'demo-availability'],
    queryFn: ({ signal }) =>
      request<LeadList>('/leads?page_size=1', { signal }),
    retry: false,
  });
  const empty = availability.data?.total === 0;
  async function seed() {
    if (!empty || !confirmed || busy) return;
    setBusy(true);
    setError('');
    try {
      setResult(await request('/demo/seed', { method: 'POST' }));
      await Promise.all([
        client.invalidateQueries({ queryKey: ['leads', user!.id] }),
        client.invalidateQueries({ queryKey: ['dashboard', user!.id] }),
      ]);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not load the fictional demo.',
      );
      await availability.refetch();
    } finally {
      setConfirmed(false);
      setBusy(false);
    }
  }
  return (
    <section
      className="editor-card settings-card demo-data-card"
      aria-labelledby="demo-title"
    >
      <h2 id="demo-title">
        <Sparkles size={18} /> A workspace to explore
      </h2>
      <p className="muted">
        Add 12 fictional leads across all six stages, eight follow-ups and their
        creation history.
      </p>
      <p className="muted">
        Available only in an empty workspace. Dates are relative to the UTC day
        you load the demo.
      </p>
      {availability.isPending && <p role="status">Checking your workspace…</p>}
      {availability.error && (
        <div className="error-notice" role="alert">
          {availability.error.message}
          <button
            className="text-button"
            onClick={() => void availability.refetch()}
          >
            Try again
          </button>
        </div>
      )}
      {error && (
        <div className="error-notice" role="alert">
          {error}
        </div>
      )}
      {result ? (
        <>
          <p className="success-notice" role="status">
            {result.leads_created} fictional leads and {result.tasks_created}{' '}
            tasks added.
          </p>
          <Link className="button primary" to="/dashboard">
            Explore dashboard <ArrowRight size={16} />
          </Link>
        </>
      ) : (
        <>
          {availability.data && !empty && (
            <p className="demo-unavailable">
              Your workspace already has contacts. Demo loading is unavailable
              to protect your current work.
            </p>
          )}
          <label className="csv-check">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={!empty || busy}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            Add fictional demo data to my empty workspace
          </label>
          <button
            className="button primary"
            disabled={!empty || !confirmed || busy}
            onClick={() => void seed()}
          >
            {busy ? 'Loading demo…' : 'Load fictional demo'}
          </button>
        </>
      )}
    </section>
  );
}
