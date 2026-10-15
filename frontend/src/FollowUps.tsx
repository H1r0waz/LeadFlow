import { useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Plus } from 'lucide-react';
import { useAuth } from './api';

type Task = {
  id: string;
  title: string;
  description: string;
  due_date: string;
  completed: boolean;
};
type Activity = {
  id: string;
  type: string;
  description: string;
  created_at: string;
};
type Page<T> = { items: T[]; total: number; page: number; page_size: number };
const schema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Enter a task title')
    .max(200)
    .refine(
      (value) => !value.includes('\0'),
      'Text cannot contain null characters',
    ),
  description: z
    .string()
    .trim()
    .max(2000)
    .refine(
      (value) => !value.includes('\0'),
      'Text cannot contain null characters',
    ),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a due date')
    .refine((value) => {
      const date = new Date(`${value}T12:00:00Z`);
      return (
        !Number.isNaN(date.valueOf()) &&
        date.toISOString().slice(0, 10) === value
      );
    }, 'Choose a valid date'),
});
type Values = z.infer<typeof schema>;
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const dateOnly = (value: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`));

export function FollowUps({ leadId }: { leadId: string }) {
  const { user, request } = useAuth();
  const client = useQueryClient();
  const [editing, setEditing] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [notice, setNotice] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', due_date: '' },
  });
  const taskKey = ['tasks', user!.id, leadId];
  const activityKey = ['activities', user!.id, leadId];
  const tasks = useInfiniteQuery({
    queryKey: taskKey,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      request<Page<Task>>(
        `/leads/${leadId}/tasks?page=${pageParam}&page_size=20`,
        { signal },
      ),
    getNextPageParam: (last) =>
      last.page * last.page_size < last.total ? last.page + 1 : undefined,
    retry: false,
  });
  const activities = useInfiniteQuery({
    queryKey: activityKey,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      request<Page<Activity>>(
        `/leads/${leadId}/activities?page=${pageParam}&page_size=20`,
        { signal },
      ),
    getNextPageParam: (last) =>
      last.page * last.page_size < last.total ? last.page + 1 : undefined,
    retry: false,
  });

  async function mutate(
    path: string,
    method: string,
    body?: unknown,
  ): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    setFailure('');
    setNotice('');
    try {
      await request(path, {
        method,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      await Promise.all([
        client.invalidateQueries({ queryKey: taskKey }),
        client.invalidateQueries({ queryKey: activityKey }),
      ]);
      setNotice('Follow-up saved.');
      return true;
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : 'Could not save this follow-up.',
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  function edit(task: Task | null) {
    setEditing(task);
    form.reset(
      task
        ? {
            title: task.title,
            description: task.description,
            due_date: task.due_date,
          }
        : { title: '', description: '', due_date: '' },
    );
    setFailure('');
    if (task) setTimeout(() => form.setFocus('title'), 0);
  }
  return (
    <div className="followup-grid">
      <section className="detail-card" aria-labelledby="followup-title">
        <div className="card-heading">
          <h2 id="followup-title">Follow-up tasks</h2>
          <Check size={18} />
        </div>
        <p className="muted">Give the next conversation a date.</p>
        {failure && (
          <div className="error-notice" role="alert">
            {failure}
          </div>
        )}
        <p className="followup-notice" role="status" aria-live="polite">
          {notice}
        </p>
        <form
          className="task-form"
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            if (
              await mutate(
                `/leads/${leadId}/tasks${editing ? `/${editing.id}` : ''}`,
                editing ? 'PATCH' : 'POST',
                values,
              )
            )
              edit(null);
          })}
        >
          <label>
            Task title
            <input
              aria-label="Task title"
              maxLength={200}
              {...form.register('title')}
              aria-invalid={!!form.formState.errors.title}
              aria-describedby={
                form.formState.errors.title ? 'task-title-error' : undefined
              }
            />
            {form.formState.errors.title && (
              <small id="task-title-error" className="field-error">
                {form.formState.errors.title.message}
              </small>
            )}
          </label>
          <label>
            Due date
            <input
              aria-label="Due date"
              type="date"
              {...form.register('due_date')}
              aria-invalid={!!form.formState.errors.due_date}
              aria-describedby={
                form.formState.errors.due_date ? 'task-date-error' : undefined
              }
            />
            {form.formState.errors.due_date && (
              <small id="task-date-error" className="field-error">
                {form.formState.errors.due_date.message}
              </small>
            )}
          </label>
          <label>
            Description
            <textarea
              aria-label="Task description"
              rows={2}
              maxLength={2000}
              {...form.register('description')}
              aria-invalid={!!form.formState.errors.description}
              aria-describedby={
                form.formState.errors.description
                  ? 'task-description-error'
                  : undefined
              }
            />
            {form.formState.errors.description && (
              <small id="task-description-error" className="field-error">
                {form.formState.errors.description.message}
              </small>
            )}
          </label>
          <div className="task-actions">
            <button className="button primary" disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Save task' : 'Add task'}
              <Plus size={15} />
            </button>
            {editing && (
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() => edit(null)}
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
        {tasks.isPending ? (
          <p role="status">Loading tasks…</p>
        ) : tasks.error ? (
          <div role="alert">
            <p>{tasks.error.message}</p>
            <button className="button" onClick={() => void tasks.refetch()}>
              Retry tasks
            </button>
          </div>
        ) : (
          <>
            {!tasks.data.pages[0].total && (
              <p className="notes-empty">
                No follow-ups yet. Add your next step above.
              </p>
            )}
            <ul className="task-list">
              {tasks.data.pages
                .flatMap((page) => page.items)
                .map((task) => (
                  <li
                    key={task.id}
                    className={task.completed ? 'task-complete' : ''}
                  >
                    <label className="task-completion">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        disabled={busy}
                        aria-label={`Complete ${task.title}`}
                        onChange={() =>
                          void mutate(
                            `/leads/${leadId}/tasks/${task.id}`,
                            'PATCH',
                            { completed: !task.completed },
                          )
                        }
                      />
                      <strong>{task.title}</strong>
                    </label>
                    <p
                      className={
                        !task.completed && task.due_date < today()
                          ? 'overdue'
                          : 'muted'
                      }
                    >
                      {!task.completed && task.due_date < today()
                        ? 'Overdue · '
                        : ''}
                      <time dateTime={task.due_date}>
                        {dateOnly(task.due_date)}
                      </time>
                      {task.completed ? ' · Completed' : ''}
                    </p>
                    {task.description && (
                      <p className="task-description">{task.description}</p>
                    )}
                    <div className="task-actions">
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => edit(task)}
                        aria-label={`Edit task ${task.title}`}
                      >
                        Edit
                      </button>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => setDeleting(task.id)}
                        aria-label={`Delete task ${task.title}`}
                      >
                        Delete
                      </button>
                    </div>
                    {deleting === task.id && (
                      <div
                        className="task-delete-confirm"
                        role="group"
                        aria-label={`Confirm deletion of ${task.title}`}
                      >
                        <p>
                          Delete this task? Its activity history will remain.
                        </p>
                        <button
                          className="button"
                          disabled={busy}
                          onClick={() => setDeleting(null)}
                        >
                          Keep task
                        </button>
                        <button
                          className="button danger"
                          disabled={busy}
                          onClick={async () => {
                            if (
                              await mutate(
                                `/leads/${leadId}/tasks/${task.id}`,
                                'DELETE',
                              )
                            ) {
                              setDeleting(null);
                              if (editing?.id === task.id) edit(null);
                            }
                          }}
                        >
                          Confirm delete task
                        </button>
                      </div>
                    )}
                  </li>
                ))}
            </ul>
            {tasks.hasNextPage && (
              <button
                className="button"
                disabled={tasks.isFetchingNextPage || busy}
                onClick={() => void tasks.fetchNextPage()}
              >
                {tasks.isFetchingNextPage ? 'Loading…' : 'Load more tasks'}
              </button>
            )}
          </>
        )}
      </section>
      <section className="detail-card" aria-labelledby="history-title">
        <div className="card-heading">
          <h2 id="history-title">Activity history</h2>
        </div>
        <p className="muted">A record of this contact’s progress.</p>
        {activities.isPending ? (
          <p role="status">Loading activity…</p>
        ) : activities.error ? (
          <div role="alert">
            <p>{activities.error.message}</p>
            <button
              className="button"
              onClick={() => void activities.refetch()}
            >
              Retry activity
            </button>
          </div>
        ) : (
          <>
            {!activities.data.pages[0].total && <p>No activity yet.</p>}
            <ol className="activity-list">
              {activities.data.pages
                .flatMap((page) => page.items)
                .map((activity) => (
                  <li key={activity.id}>
                    <p>{activity.description}</p>
                    <time dateTime={activity.created_at}>
                      {new Date(activity.created_at).toLocaleString('en', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </time>
                  </li>
                ))}
            </ol>
            {activities.hasNextPage && (
              <button
                className="button"
                disabled={activities.isFetchingNextPage}
                onClick={() => void activities.fetchNextPage()}
              >
                {activities.isFetchingNextPage
                  ? 'Loading…'
                  : 'Load more activity'}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
