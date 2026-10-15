import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Pipeline } from './Pipeline';
import { FollowUps } from './FollowUps';
import { DemoData } from './DemoData';
const Dashboard = lazy(() => import('./Dashboard'));
const CsvImport = lazy(() => import('./CsvImport'));
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useForm,
  type FieldValues,
  type Path,
  type UseFormSetError,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ContactRound,
  LayoutGrid,
  LogOut,
  Mail,
  Pencil,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Workflow,
  X,
} from 'lucide-react';
import {
  ApiError,
  AuthProvider,
  date,
  labelStatus,
  money,
  statuses,
  useAuth,
  type Lead,
  type LeadList,
  type User,
} from './api';
import {
  authSchema,
  leadSchema,
  profileSchema,
  type LeadValues,
} from './validation';

function ErrorNotice({ error, retry }: { error: Error; retry?: () => void }) {
  return (
    <div className="error-notice" role="alert">
      <span>{error.message}</span>
      {retry && (
        <button className="text-button" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      Loading your workspace…
    </div>
  );
}
function Brand() {
  return (
    <Link to="/" className="brand">
      <span className="brand-icon">
        <Workflow size={23} />
      </span>
      LeadFlow<span className="brand-dot">.</span>
    </Link>
  );
}
function Stage({ value }: { value: string }) {
  return (
    <span className={`stage stage-${value}`}>
      <span />
      {labelStatus(value)}
    </span>
  );
}
function applyErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
) {
  if (error instanceof ApiError)
    for (const [name, message] of Object.entries(error.fields))
      setError(name as Path<T>, { message });
}

function AuthPage({ register = false }: { register?: boolean }) {
  const { user, pending, error, retry, authenticate } = useAuth();
  const navigate = useNavigate();
  const [failure, setFailure] = useState<Error | null>(null);
  const schema = register
    ? authSchema.refine((data) => !!data.name, {
        path: ['name'],
        message: 'Enter your name',
      })
    : authSchema;
  const {
    register: field,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', name: '' },
  });
  if (pending)
    return (
      <main id="main-content" tabIndex={-1}>
        <Loading />
      </main>
    );
  if (user) return <Navigate to="/leads" replace />;
  return (
    <div className="auth-page">
      <aside className="auth-story">
        <Brand />
        <div className="story-content">
          <span className="eyebrow light">
            A LITTLE STRUCTURE. MORE POSSIBILITY.
          </span>
          <h2>
            Good connections.
            <br />
            <em>Great beginnings.</em>
          </h2>
          <p>
            Give every opportunity a place to grow. Keep your contacts,
            conversations and next steps in focus.
          </p>
          <div className="story-flow" aria-hidden="true">
            <span>
              <span className="flow-dot" /> New connection
            </span>
            <i />
            <span>
              <Check size={16} /> Conversation started
            </span>
            <i />
            <span className="flow-end">
              <Sparkles size={17} /> Possibility, unlocked.
            </span>
          </div>
        </div>
        <p className="story-footer">Thoughtfully built for independent work.</p>
      </aside>
      <main id="main-content" tabIndex={-1} className="auth-main">
        <div className="auth-card">
          <span className="eyebrow">YOUR NEXT CHAPTER</span>
          <h1>{register ? 'Make room for opportunity.' : 'Welcome back.'}</h1>
          <p className="muted">
            {register
              ? 'Create your account and start building your contact book.'
              : 'Sign in to pick up where you left off.'}
          </p>
          {error && <ErrorNotice error={error} retry={retry} />}
          {failure && <ErrorNotice error={failure} />}
          <form
            onSubmit={handleSubmit(async (values) => {
              setFailure(null);
              try {
                await authenticate(
                  register ? 'register' : 'login',
                  register
                    ? { ...values, email: values.email.toLowerCase() }
                    : {
                        email: values.email.toLowerCase(),
                        password: values.password,
                      },
                );
                navigate('/leads', { replace: true });
              } catch (err) {
                applyErrors(err, setError);
                setFailure(err as Error);
              }
            })}
            noValidate
          >
            {register && (
              <label>
                Full name
                <input
                  autoComplete="name"
                  aria-label="Full name"
                  {...field('name')}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'auth-name-error' : undefined}
                />
                {errors.name && (
                  <small id="auth-name-error" className="field-error">
                    {errors.name.message}
                  </small>
                )}
              </label>
            )}
            <label>
              Email address
              <input
                type="email"
                autoComplete="email"
                aria-label="Email address"
                placeholder="you@example.com"
                {...field('email')}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'auth-email-error' : undefined}
              />
              {errors.email && (
                <small id="auth-email-error" className="field-error">
                  {errors.email.message}
                </small>
              )}
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                aria-label="Password"
                {...field('password')}
                aria-invalid={!!errors.password}
                aria-describedby={
                  [
                    errors.password && 'auth-password-error',
                    register && 'password-help',
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined
                }
              />
              {errors.password && (
                <small id="auth-password-error" className="field-error">
                  {errors.password.message}
                </small>
              )}
              {register && (
                <small id="password-help">
                  12–128 characters. Choose a password unique to this demo.
                </small>
              )}
            </label>
            <button className="button primary full" disabled={isSubmitting}>
              {isSubmitting
                ? 'Please wait…'
                : register
                  ? 'Create account'
                  : 'Sign in'}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? 'Already have an account?' : 'New to LeadFlow?'}{' '}
            <Link to={register ? '/login' : '/register'}>
              {register ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
          <div className="demo-note">
            <CircleHelp size={17} />
            <p>
              <strong>A personal portfolio demo</strong>
              <br />
              Explore with fictional contacts only. This is a locally developed
              demonstration.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function Protected() {
  const { user, pending, error, retry, logout } = useAuth();
  const [failure, setFailure] = useState<Error | null>(null);
  const [leaving, setLeaving] = useState(false);
  if (pending)
    return (
      <main id="main-content" tabIndex={-1}>
        <Loading />
      </main>
    );
  if (error)
    return (
      <main id="main-content" tabIndex={-1} className="session-error">
        <Brand />
        <h1>We couldn’t check your session.</h1>
        <ErrorNotice error={error} retry={retry} />
        {failure && <ErrorNotice error={failure} />}
        <button
          className="button"
          disabled={leaving}
          onClick={async () => {
            setLeaving(true);
            try {
              await logout();
            } catch (err) {
              setFailure(err as Error);
            } finally {
              setLeaving(false);
            }
          }}
        >
          Sign out
        </button>
      </main>
    );
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          <NavLink to="/dashboard">
            <LayoutGrid size={19} />
            Dashboard
          </NavLink>
          <NavLink to="/leads">
            <ContactRound size={19} />
            All leads
            <span className="nav-active-dot" />
          </NavLink>
          <NavLink to="/settings">
            <Settings size={19} />
            Settings
          </NavLink>
          <NavLink to="/pipeline">
            <Workflow size={19} />
            Pipeline
          </NavLink>
          <NavLink to="/import">
            <ContactRound size={19} />
            Import & export
          </NavLink>
        </nav>
        <div className="sidebar-note">
          <span className="small-icon">
            <Sparkles size={18} />
          </span>
          <strong>Small steps. Real progress.</strong>
          <p>Every good opportunity starts with a connection.</p>
          <span className="demo-pill">PORTFOLIO DEMO</span>
        </div>
        <div className="account">
          <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{user.name}</strong>
            <small>Your workspace</small>
          </div>
          <button
            title="Sign out"
            aria-label="Sign out"
            disabled={leaving}
            onClick={async () => {
              setFailure(null);
              setLeaving(true);
              try {
                await logout();
              } catch (err) {
                setFailure(err as Error);
              } finally {
                setLeaving(false);
              }
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            <span className="workspace-icon">
              <LayoutGrid size={15} />
            </span>
            Personal workspace
          </span>
          <span className="topbar-label">
            <span />
            Fictional data only
          </span>
        </header>
        <main id="main-content" tabIndex={-1} className="main-content">
          {failure && <ErrorNotice error={failure} />}
          <Outlet />
        </main>
        <footer className="workspace-footer">
          LeadFlow <span>Made for meaningful connections.</span>
          <span>Personal portfolio project</span>
        </footer>
      </div>
    </div>
  );
}

const sortOptions = [
  ['created_at:desc', 'Newest first'],
  ['created_at:asc', 'Oldest first'],
  ['name:asc', 'Name A–Z'],
  ['estimated_value:desc', 'Highest value'],
  ['updated_at:desc', 'Recently updated'],
];
function LeadIndex() {
  const { user, request } = useAuth();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const rawPage = Number(params.get('page') || 1);
  const page =
    Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 2147483647
      ? rawPage
      : 1;
  const q = params.get('q') || '';
  const source = params.get('source') || '';
  const status = statuses.find((s) => s === params.get('status')) || '';
  const chosenSort = `${params.get('sort_by') || 'created_at'}:${params.get('sort_order') || 'desc'}`;
  const sort = sortOptions.some(([key]) => key === chosenSort)
    ? chosenSort
    : 'created_at:desc';
  const query = new URLSearchParams({
    page: String(page),
    page_size: '20',
    sort_by: sort.split(':')[0],
    sort_order: sort.split(':')[1],
  });
  if (q) query.set('q', q);
  if (source) query.set('source', source);
  if (status) query.set('status', status);
  const leads = useQuery({
    queryKey: ['leads', user!.id, query.toString()],
    queryFn: ({ signal }) => request<LeadList>(`/leads?${query}`, { signal }),
    retry: false,
  });
  function change(values: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in values)) next.delete('page');
    setParams(next);
  }
  const filtered = !!(q || status || source);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR RELATIONSHIPS, IN ONE PLACE</span>
          <h1>
            All leads<span className="heading-dot">.</span>
          </h1>
          <p className="muted">
            A clear view of the people behind your next opportunity.
          </p>
        </div>
        <Link className="button primary" to="/leads/new">
          <Plus size={18} />
          Add lead
        </Link>
      </div>
      {location.state?.notice && (
        <div className="success-notice" role="status">
          <Check size={17} />
          {location.state.notice}
        </div>
      )}
      <section className="lead-section">
        <div className="section-title">
          <div>
            <h2>
              Your contact book{' '}
              <span className="count">{leads.data?.total ?? '—'}</span>
            </h2>
            <p>Keep the right people on your radar.</p>
          </div>
          <span className="section-symbol">
            <ContactRound size={25} strokeWidth={1.3} />
          </span>
        </div>
        <form
          className="filters"
          key={`${q}|${source}|${status}`}
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            change({
              q: String(data.get('q') || '').trim(),
              source: String(data.get('source') || '').trim(),
              status: String(data.get('status') || ''),
            });
          }}
        >
          <div className="search-input">
            <Search size={17} />
            <input
              name="q"
              aria-label="Search leads"
              defaultValue={q}
              placeholder="Search name, company, email…"
              maxLength={200}
            />
          </div>
          <select
            aria-label="Filter by stage"
            name="status"
            defaultValue={status}
          >
            <option value="">All stages</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {labelStatus(s)}
              </option>
            ))}
          </select>
          <input
            className="source-filter"
            name="source"
            aria-label="Filter by source"
            defaultValue={source}
            maxLength={100}
            placeholder="Source"
          />
          <button className="button filter-button" type="submit">
            Apply filters
          </button>
          {filtered && (
            <button
              type="button"
              className="text-button"
              onClick={() => setParams({})}
            >
              Clear filters
            </button>
          )}
        </form>
        <div className="list-toolbar">
          <span>
            {filtered ? 'Filtered contacts' : 'Every connection counts.'}
          </span>
          <label>
            <ArrowDownUp size={14} />
            <select
              aria-label="Sort leads"
              value={sort}
              onChange={(event) => {
                const [sort_by, sort_order] = event.target.value.split(':');
                change({ sort_by, sort_order });
              }}
            >
              {sortOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {leads.isPending ? (
          <Loading />
        ) : leads.error ? (
          <div className="section-error">
            <ErrorNotice
              error={leads.error}
              retry={() => {
                void leads.refetch();
              }}
            />
          </div>
        ) : !leads.data.items.length ? (
          <div className="empty-state">
            <span className="empty-icon">
              <ContactRound size={33} strokeWidth={1.4} />
            </span>
            <h3>
              {filtered
                ? 'No matching connections.'
                : page > 1
                  ? 'No leads on this page.'
                  : 'Your next connection starts here.'}
            </h3>
            <p>
              {filtered
                ? 'Try a different search or clear your filters to see your contacts.'
                : page > 1
                  ? 'Return to the first page to see your contact book.'
                  : 'Add your first lead and give every opportunity a place to grow.'}
            </p>
            {filtered ? (
              <button className="button" onClick={() => setParams({})}>
                Clear filters
              </button>
            ) : page > 1 ? (
              <button className="button" onClick={() => change({ page: '1' })}>
                First page
              </button>
            ) : (
              <Link className="button primary" to="/leads/new">
                <Plus size={17} />
                Add your first lead
              </Link>
            )}
          </div>
        ) : (
          <>
            <div
              className="table-scroll"
              role="region"
              aria-label="Leads table, scroll horizontally for more columns"
              tabIndex={0}
            >
              <table>
                <caption className="sr-only">Your leads</caption>
                <thead>
                  <tr>
                    <th scope="col">Contact</th>
                    <th scope="col">Company</th>
                    <th scope="col">Stage</th>
                    <th scope="col">
                      Est. value <small>USD</small>
                    </th>
                    <th scope="col">Source</th>
                    <th scope="col" aria-label="Open contact" />
                  </tr>
                </thead>
                <tbody>
                  {leads.data.items.map((lead) => (
                    <tr key={lead.id}>
                      <td>
                        <div className="contact-cell">
                          <span className="contact-avatar">
                            {lead.name.slice(0, 1).toUpperCase()}
                          </span>
                          <div>
                            <Link to={`/leads/${lead.id}`}>{lead.name}</Link>
                            <span>{lead.email || 'No email added'}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {lead.company || <span className="muted">—</span>}
                      </td>
                      <td>
                        <Stage value={lead.status} />
                      </td>
                      <td className="value-cell">
                        {money(lead.estimated_value)}
                      </td>
                      <td>{lead.source || <span className="muted">—</span>}</td>
                      <td>
                        <Link
                          className="row-link"
                          aria-label={`View ${lead.name}`}
                          to={`/leads/${lead.id}`}
                        >
                          <ArrowRight size={17} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>
                Showing {(page - 1) * leads.data.page_size + 1}–
                {Math.min(page * leads.data.page_size, leads.data.total)} of{' '}
                {leads.data.total} leads
              </span>
              <div>
                <button
                  className="icon-button"
                  aria-label="Previous page"
                  disabled={page <= 1}
                  onClick={() => change({ page: String(page - 1) })}
                >
                  <ChevronLeft size={17} />
                </button>
                <span>
                  Page {page} of{' '}
                  {Math.max(
                    1,
                    Math.ceil(leads.data.total / leads.data.page_size),
                  )}
                </span>
                <button
                  className="icon-button"
                  aria-label="Next page"
                  disabled={page * leads.data.page_size >= leads.data.total}
                  onClick={() => change({ page: String(page + 1) })}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
      <div className="under-table">
        <span className="tiny-dot" />
        Your contacts stay private to your account.
      </div>
    </>
  );
}

function useLead() {
  const { id } = useParams();
  const { user, request } = useAuth();
  return useQuery({
    queryKey: ['lead', user!.id, id],
    queryFn: ({ signal }) => request<Lead>(`/leads/${id}`, { signal }),
    retry: false,
  });
}
function LeadEditor({ edit = false }: { edit?: boolean }) {
  return edit ? <EditLead /> : <LeadForm />;
}
function EditLead() {
  const lead = useLead();
  if (lead.isPending) return <Loading />;
  if (lead.error)
    return (
      <>
        <Link className="back-link" to="/leads">
          <ArrowLeft size={16} />
          All leads
        </Link>
        <ErrorNotice
          error={lead.error}
          retry={() => {
            void lead.refetch();
          }}
        />
      </>
    );
  return <LeadForm lead={lead.data} />;
}
function LeadForm({ lead }: { lead?: Lead }) {
  const { user, request } = useAuth();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [failure, setFailure] = useState<Error | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LeadValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: lead
      ? { ...lead, email: lead.email || '' }
      : {
          name: '',
          company: '',
          email: '',
          phone: '',
          source: '',
          status: 'new',
          estimated_value: '0.00',
          notes: '',
        },
  });
  function field(
    name: keyof LeadValues,
    label: string,
    options: { type?: string; placeholder?: string; maxLength?: number } = {},
  ) {
    return (
      <label>
        {label}
        <input
          {...register(name)}
          {...options}
          aria-label={label}
          aria-invalid={!!errors[name]}
          aria-describedby={errors[name] ? `${name}-error` : undefined}
        />
        {errors[name] && (
          <small id={`${name}-error`} className="field-error">
            {errors[name]?.message}
          </small>
        )}
      </label>
    );
  }
  return (
    <>
      <Link className="back-link" to={lead ? `/leads/${lead.id}` : '/leads'}>
        <ArrowLeft size={16} />
        {lead ? 'Back to contact' : 'All leads'}
      </Link>
      <div className="page-heading compact">
        <div>
          <span className="eyebrow">MAKE THE CONNECTION</span>
          <h1>
            {lead ? 'Edit lead' : 'A new beginning'}
            <span className="heading-dot">.</span>
          </h1>
          <p className="muted">
            {lead
              ? 'Keep the details current and the conversation moving.'
              : 'Start with a name. Add the details as your relationship grows.'}
          </p>
        </div>
      </div>
      <form
        className="editor-card"
        noValidate
        onSubmit={handleSubmit(async (values) => {
          setFailure(null);
          try {
            const result = await request<Lead>(
              lead ? `/leads/${lead.id}` : '/leads',
              {
                method: lead ? 'PATCH' : 'POST',
                body: JSON.stringify({
                  ...values,
                  email: values.email.trim().toLowerCase() || null,
                }),
              },
            );
            await client.invalidateQueries({ queryKey: ['leads', user!.id] });
            client.setQueryData(['lead', user!.id, result.id], result);
            navigate(`/leads/${result.id}`, {
              replace: true,
              state: {
                notice: lead
                  ? 'Contact updated successfully.'
                  : 'Your new contact is ready.',
              },
            });
          } catch (err) {
            applyErrors(err, setError);
            if (err instanceof ApiError && err.status === 409)
              setError('email', {
                message:
                  'This email already belongs to another contact in your account.',
              });
            setFailure(err as Error);
          }
        })}
      >
        {failure && <ErrorNotice error={failure} />}
        <div className="form-section-title">
          <span className="small-icon">
            <ContactRound size={18} />
          </span>
          <div>
            <h2>Contact details</h2>
            <p>The essentials for a meaningful connection.</p>
          </div>
        </div>
        <div className="form-grid">
          {field('name', 'Full name *', {
            maxLength: 150,
            placeholder: 'e.g. Alex Morgan',
          })}
          {field('company', 'Company', {
            maxLength: 200,
            placeholder: 'e.g. Willow Studio',
          })}
          {field('email', 'Email address', {
            type: 'email',
            maxLength: 254,
            placeholder: 'alex@example.com',
          })}
          {field('phone', 'Phone number', {
            type: 'tel',
            maxLength: 50,
            placeholder: 'Add a phone number',
          })}
        </div>
        <div className="form-divider" />
        <div className="form-section-title">
          <span className="small-icon">
            <Workflow size={18} />
          </span>
          <div>
            <h2>Opportunity details</h2>
            <p>A little context goes a long way.</p>
          </div>
        </div>
        <div className="form-grid">
          <label>
            Stage
            <select
              aria-label="Stage"
              aria-invalid={!!errors.status}
              aria-describedby={errors.status ? 'status-error' : undefined}
              {...register('status')}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {labelStatus(s)}
                </option>
              ))}
            </select>
            {errors.status && (
              <small id="status-error" className="field-error">
                {errors.status.message}
              </small>
            )}
          </label>
          {field('estimated_value', 'Estimated value (USD)', {
            placeholder: '0.00',
          })}
          {field('source', 'Source', {
            maxLength: 100,
            placeholder: 'e.g. Referral, website, event',
          })}
          <label className="span-two">
            Notes
            <textarea
              {...register('notes')}
              aria-label="Notes"
              rows={5}
              maxLength={10000}
              placeholder="Helpful context, conversation notes, or an idea to follow up on…"
              aria-invalid={!!errors.notes}
              aria-describedby={`notes-help${errors.notes ? ' notes-error' : ''}`}
            />
            {errors.notes && (
              <small id="notes-error" className="field-error">
                {errors.notes.message}
              </small>
            )}
            <small id="notes-help">
              Only fictional contact information. Up to 10,000 characters.
            </small>
          </label>
        </div>
        <div className="form-actions">
          <Link className="button" to={lead ? `/leads/${lead.id}` : '/leads'}>
            Cancel
          </Link>
          <button className="button primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : lead ? 'Save changes' : 'Create lead'}
            <Check size={17} />
          </button>
        </div>
      </form>
    </>
  );
}

function ConfirmDelete({ lead, close }: { lead: Lead; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keepButton = useRef<HTMLButtonElement>(null);
  const { user, request } = useAuth();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<Error | null>(null);
  useEffect(() => {
    const node = dialog.current;
    const previousFocus = document.activeElement;
    node?.showModal();
    keepButton.current?.focus();
    return () => {
      node?.close();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="confirm-dialog"
      onCancel={(event) => {
        if (pending) event.preventDefault();
        else close();
      }}
      aria-labelledby="delete-title"
      aria-describedby="delete-description"
    >
      <button
        className="dialog-close icon-button"
        aria-label="Close confirmation"
        disabled={pending}
        onClick={close}
      >
        <X size={18} />
      </button>
      <span className="delete-symbol">
        <Trash2 size={25} />
      </span>
      <h2 id="delete-title">Delete this connection?</h2>
      <p id="delete-description">
        <strong>{lead.name}</strong> and their associated activity will be
        permanently removed. This cannot be undone.
      </p>
      {failure && <ErrorNotice error={failure} />}
      <div className="dialog-actions">
        <button
          ref={keepButton}
          className="button"
          disabled={pending}
          onClick={close}
        >
          Keep lead
        </button>
        <button
          className="button danger"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            try {
              await request(`/leads/${lead.id}`, { method: 'DELETE' });
              client.removeQueries({ queryKey: ['lead', user!.id, lead.id] });
              await client.invalidateQueries({ queryKey: ['leads', user!.id] });
              navigate('/leads', {
                replace: true,
                state: { notice: 'Contact deleted.' },
              });
            } catch (err) {
              setFailure(err as Error);
              setPending(false);
            }
          }}
        >
          {pending ? 'Deleting…' : 'Delete lead'}
        </button>
      </div>
    </dialog>
  );
}
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd>{children || <span className="muted">Not added</span>}</dd>
    </div>
  );
}
function LeadDetail() {
  const lead = useLead();
  const [confirm, setConfirm] = useState(false);
  const location = useLocation();
  if (lead.isPending) return <Loading />;
  if (lead.error)
    return (
      <>
        <Link className="back-link" to="/leads">
          <ArrowLeft size={16} />
          All leads
        </Link>
        <ErrorNotice
          error={lead.error}
          retry={() => {
            void lead.refetch();
          }}
        />
      </>
    );
  const value = lead.data;
  return (
    <>
      <Link className="back-link" to="/leads">
        <ArrowLeft size={16} />
        All leads
      </Link>
      <div className="page-heading detail-heading">
        <div className="detail-name">
          <span className="detail-avatar">
            {value.name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <span className="eyebrow">CONTACT OVERVIEW</span>
            <h1>{value.name}</h1>
            <p className="muted">{value.company || 'Independent contact'}</p>
          </div>
        </div>
        <div className="heading-actions">
          <button
            className="button subtle-danger"
            onClick={() => setConfirm(true)}
          >
            <Trash2 size={17} />
            Delete
          </button>
          <Link className="button primary" to={`/leads/${value.id}/edit`}>
            <Pencil size={17} />
            Edit lead
          </Link>
        </div>
      </div>
      {location.state?.notice && (
        <div className="success-notice" role="status">
          <Check size={17} />
          {location.state.notice}
        </div>
      )}
      <div className="detail-grid">
        <section className="detail-card">
          <div className="card-heading">
            <h2>Contact information</h2>
            <ContactRound size={19} />
          </div>
          <dl>
            <Fact label="Email address">
              {value.email && (
                <a href={`mailto:${value.email}`}>
                  <Mail size={15} />
                  {value.email}
                </a>
              )}
            </Fact>
            <Fact label="Phone number">{value.phone}</Fact>
            <Fact label="Company">{value.company}</Fact>
            <Fact label="Source">{value.source}</Fact>
          </dl>
        </section>
        <section className="detail-card opportunity-card">
          <div className="card-heading">
            <h2>The opportunity</h2>
            <Workflow size={19} />
          </div>
          <dl>
            <Fact label="Current stage">
              <Stage value={value.status} />
            </Fact>
            <Fact label="Estimated value">
              <span className="large-value">
                {money(value.estimated_value)}
              </span>
              <small> USD</small>
            </Fact>
            <Fact label="Added on">{date(value.created_at)}</Fact>
            <Fact label="Last updated">{date(value.updated_at)}</Fact>
          </dl>
        </section>
        <section className="detail-card notes-card">
          <div className="card-heading">
            <h2>Notes & context</h2>
            <Pencil size={18} />
          </div>
          {value.notes ? (
            <p className="notes-text">{value.notes}</p>
          ) : (
            <div className="notes-empty">
              <p>
                No notes yet. A little context can make the next conversation
                easier.
              </p>
              <Link className="text-button" to={`/leads/${value.id}/edit`}>
                Add a note <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </section>
      </div>
      <FollowUps key={value.id} leadId={value.id} />
      {confirm && (
        <ConfirmDelete lead={value} close={() => setConfirm(false)} />
      )}
    </>
  );
}
function SettingsPage() {
  const { user, request, updateUser } = useAuth();
  const [failure, setFailure] = useState<Error | null>(null);
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user!.name },
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MAKE YOURSELF AT HOME</span>
          <h1>
            Settings<span className="heading-dot">.</span>
          </h1>
          <p className="muted">A few details that make this workspace yours.</p>
        </div>
      </div>
      <form
        className="editor-card settings-card"
        onSubmit={handleSubmit(async (values) => {
          setFailure(null);
          setSaved(false);
          try {
            updateUser(
              await request<User>('/auth/me', {
                method: 'PATCH',
                body: JSON.stringify(values),
              }),
            );
            setSaved(true);
          } catch (err) {
            applyErrors(err, setError);
            setFailure(err as Error);
          }
        })}
        noValidate
      >
        <h2>Your profile</h2>
        <p className="muted">How you appear in your personal workspace.</p>
        {failure && <ErrorNotice error={failure} />}
        {saved && (
          <div className="success-notice" role="status">
            <Check size={16} />
            Profile updated.
          </div>
        )}
        <label>
          Full name
          <input
            {...register('name')}
            aria-label="Full name"
            maxLength={100}
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'profile-name-error' : undefined}
          />
          {errors.name && (
            <small id="profile-name-error" className="field-error">
              {errors.name.message}
            </small>
          )}
        </label>
        <label>
          Email address
          <input
            aria-label="Email address"
            aria-describedby="profile-email-help"
            value={user!.email}
            readOnly
          />
          <small id="profile-email-help">
            Your sign-in email cannot be changed in this demo.
          </small>
        </label>
        <div className="form-actions">
          <button className="button primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save profile'}
            <Check size={16} />
          </button>
        </div>
      </form>
      <DemoData />
    </>
  );
}
function NotFound() {
  return (
    <div className="empty-state">
      <h1>This page took a different path.</h1>
      <p>Head back to your workspace and keep the connections going.</p>
      <Link className="button primary" to="/leads">
        Back to leads
        <ArrowRight size={17} />
      </Link>
    </div>
  );
}
function RouteAccessibility() {
  const { pathname } = useLocation();
  useEffect(() => {
    const page =
      pathname === '/login'
        ? 'Sign in'
        : pathname === '/register'
          ? 'Create account'
          : pathname === '/dashboard'
            ? 'Dashboard'
            : pathname === '/pipeline'
              ? 'Pipeline'
              : pathname === '/import'
                ? 'Import & export'
                : pathname === '/settings'
                  ? 'Settings'
                  : pathname === '/leads/new'
                    ? 'New lead'
                    : pathname.endsWith('/edit')
                      ? 'Edit lead'
                      : pathname.startsWith('/leads/')
                        ? 'Lead details'
                        : pathname === '/leads' || pathname === '/'
                          ? 'All leads'
                          : 'Page not found';
    document.title = `${page} | LeadFlow`;
    const frame = requestAnimationFrame(() => {
      document.getElementById('main-content')?.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <AuthProvider>
      <RouteAccessibility />
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage register />} />
        <Route element={<Protected />}>
          <Route path="/" element={<Navigate to="/leads" replace />} />
          <Route path="/leads" element={<LeadIndex />} />
          <Route
            path="/dashboard"
            element={
              <Suspense fallback={<Loading />}>
                <Dashboard />
              </Suspense>
            }
          />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route
            path="/import"
            element={
              <Suspense fallback={<Loading />}>
                <CsvImport />
              </Suspense>
            }
          />
          <Route path="/leads/new" element={<LeadEditor />} />
          <Route path="/leads/:id" element={<LeadDetail />} />
          <Route path="/leads/:id/edit" element={<LeadEditor edit />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
