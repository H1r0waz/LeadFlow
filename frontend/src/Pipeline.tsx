import { useRef, useState, type RefObject } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { GripVertical, Plus } from 'lucide-react';
import {
  labelStatus,
  money,
  statuses,
  useAuth,
  type Lead,
  type LeadList,
  type Status,
  type User,
} from './api';

type Move = { lead: Lead; stage: Status };

export function Pipeline() {
  const { user, request } = useAuth();
  const client = useQueryClient();
  const [moving, setMoving] = useState<Move | null>(null);
  const [failure, setFailure] = useState('');
  const [notice, setNotice] = useState('');
  const busy = useRef(false);
  const dragRef = useRef<Lead | null>(null);

  async function move(lead: Lead, stage: Status) {
    if (busy.current || lead.status === stage) return;
    busy.current = true;
    setFailure('');
    setNotice('');
    setMoving({ lead, stage });
    try {
      const saved = await request<Lead>(`/leads/${lead.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: stage }),
      });
      if (client.getQueryData<User | null>(['auth'])?.id !== user!.id) return;
      client.setQueryData(['lead', user!.id, lead.id], saved);
      await client.invalidateQueries({ queryKey: ['leads', user!.id] });
      setNotice(`${lead.name} moved to ${labelStatus(stage)}.`);
    } catch (error) {
      setFailure(
        `Could not confirm the stage change. ${error instanceof Error ? error.message : 'Please try again.'} The board will reload the saved stages.`,
      );
      void client.invalidateQueries({ queryKey: ['leads', user!.id] });
    } finally {
      busy.current = false;
      setMoving(null);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">KEEP OPPORTUNITIES MOVING</span>
          <h1>
            Pipeline<span className="heading-dot">.</span>
          </h1>
          <p className="muted">
            Drag a contact to a stage, or use its stage selector.
          </p>
        </div>
        <Link className="button primary" to="/leads/new">
          <Plus size={18} />
          Add lead
        </Link>
      </div>
      {failure && (
        <div role="alert" className="error-notice">
          {failure}
        </div>
      )}
      <div role="status" aria-live="polite" className="pipeline-notice">
        {moving ? `Saving ${moving.lead.name}…` : notice}
      </div>
      <div
        className="pipeline-board"
        role="region"
        tabIndex={0}
        aria-label="Sales pipeline"
        aria-describedby="pipeline-help"
      >
        {statuses.map((stage) => (
          <StageColumn
            key={stage}
            stage={stage}
            moving={moving}
            onMove={move}
            dragRef={dragRef}
          />
        ))}
      </div>
      <p id="pipeline-help" className="muted pipeline-help">
        Each stage loads 20 contacts at a time. Use “Load more” to see the rest.
        On narrow screens, scroll across the board. Stage selectors work with
        keyboard and touch.
      </p>
    </>
  );
}

function StageColumn({
  stage,
  moving,
  onMove,
  dragRef,
}: {
  stage: Status;
  moving: Move | null;
  dragRef: RefObject<Lead | null>;
  onMove: (lead: Lead, stage: Status) => Promise<void>;
}) {
  const { user, request } = useAuth();
  const [over, setOver] = useState(false);
  const query = useInfiniteQuery({
    queryKey: ['leads', user!.id, 'pipeline', stage],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      request<LeadList>(
        `/leads?status=${stage}&page=${pageParam}&page_size=20&sort_by=created_at&sort_order=desc`,
        { signal },
      ),
    getNextPageParam: (last) =>
      last.page * last.page_size < last.total ? last.page + 1 : undefined,
    retry: false,
  });
  const saved = query.data?.pages.flatMap((page) => page.items) ?? [];
  const contacts = moving
    ? saved.filter((lead) => lead.id !== moving.lead.id)
    : saved;
  if (moving?.stage === stage)
    contacts.unshift({ ...moving.lead, status: stage });
  const total =
    (query.data?.pages[0].total ?? 0) +
    (moving
      ? Number(moving.stage === stage) - Number(moving.lead.status === stage)
      : 0);
  return (
    <section
      className={`pipeline-column ${over ? 'drop-active' : ''}`}
      aria-label={`${labelStatus(stage)} stage`}
      onDragOver={(event) => {
        if (
          !moving &&
          event.dataTransfer.types.includes('application/x-leadflow-lead')
        ) {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          setOver(true);
        }
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (moving) return;
        const id = event.dataTransfer.getData('application/x-leadflow-lead');
        // The drag payload contains only an ID; only a loaded, owned card can be moved.
        const lead = dragRef.current;
        if (lead?.id === id) void onMove(lead, stage);
        dragRef.current = null;
      }}
    >
      <header className="pipeline-column-heading">
        <h2>{labelStatus(stage)}</h2>
        <span className="count">{query.data ? Math.max(0, total) : '—'}</span>
      </header>
      {query.isPending ? (
        <p role="status" className="muted">
          Loading contacts…
        </p>
      ) : query.error ? (
        <div role="alert">
          <p>{query.error.message}</p>
          <button className="button" onClick={() => void query.refetch()}>
            Retry {labelStatus(stage)}
          </button>
        </div>
      ) : (
        <>
          {!contacts.length && (
            <p className="pipeline-empty">No contacts in this stage.</p>
          )}
          {contacts.map((lead) => (
            <article
              className="pipeline-card"
              key={lead.id}
              aria-label={`${lead.name} card`}
            >
              <div className="pipeline-card-top">
                <Link to={`/leads/${lead.id}`}>{lead.name}</Link>
                <button
                  type="button"
                  draggable={!moving}
                  disabled={!!moving}
                  className="drag-handle"
                  aria-label={`Drag ${lead.name}`}
                  title="Drag to another stage, or use the stage selector"
                  onDragStart={(event) => {
                    dragRef.current = lead;
                    event.dataTransfer.setData(
                      'application/x-leadflow-lead',
                      lead.id,
                    );
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => {
                    dragRef.current = null;
                  }}
                >
                  <GripVertical size={18} />
                </button>
              </div>
              <p className="muted">{lead.company || 'Independent contact'}</p>
              <strong className="pipeline-value">
                {money(lead.estimated_value)} <small>USD</small>
              </strong>
              <label className="pipeline-stage-label">
                Stage
                <select
                  aria-label={`Stage for ${lead.name}`}
                  value={lead.status}
                  disabled={!!moving}
                  onChange={(event) =>
                    void onMove(lead, event.target.value as Status)
                  }
                >
                  {statuses.map((option) => (
                    <option key={option} value={option}>
                      {labelStatus(option)}
                    </option>
                  ))}
                </select>
              </label>
            </article>
          ))}
          {query.hasNextPage && (
            <button
              className="button pipeline-load"
              disabled={query.isFetchingNextPage || !!moving}
              onClick={() => void query.fetchNextPage()}
            >
              {query.isFetchingNextPage
                ? 'Loading…'
                : `Load more ${labelStatus(stage)}`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
