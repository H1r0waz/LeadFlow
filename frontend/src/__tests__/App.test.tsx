import { randomBytes } from 'node:crypto';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import type { Lead, User } from '../api';
import type { DashboardData } from '../Dashboard';
vi.mock('recharts', () => ({
  ResponsiveContainer: () => null,
  BarChart: () => null,
  Bar: () => null,
  CartesianGrid: () => null,
  Cell: () => null,
  Pie: () => null,
  PieChart: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));
const dashboard: DashboardData = {
  total: 6,
  open: 4,
  won: 1,
  lost: 1,
  open_value: '4200.50',
  won_value: '1200.75',
  conversion_rate: '50.00',
  stages: [
    { status: 'new', count: 1, value: '1000.00' },
    { status: 'contacted', count: 1, value: '200.50' },
    { status: 'interested', count: 1, value: '1000.00' },
    { status: 'proposal_sent', count: 1, value: '2000.00' },
    { status: 'won', count: 1, value: '1200.75' },
    { status: 'lost', count: 1, value: '0.00' },
  ],
  upcoming_tasks: [
    {
      id: 'task-one',
      lead_id: 'lead-one',
      lead_name: 'Fictional Contact',
      title: 'Follow up proposal',
      due_date: '2020-01-01',
    },
  ],
  incomplete_tasks: 1,
  overdue_tasks: 1,
  due_today: 0,
  as_of: '2026-10-15',
};

const user: User = {
  id: 'account-one',
  name: 'Fictional Person',
  email: 'demo@example.org',
  created_at: '2026-10-15T10:00:00Z',
};
const lead: Lead = {
  id: 'lead-one',
  name: 'Fictional Contact',
  company: 'Fictional North',
  email: 'contact@example.org',
  phone: '',
  source: 'Referral',
  status: 'contacted',
  estimated_value: '1200.50',
  notes: '',
  created_at: '2026-10-15T10:00:00Z',
  updated_at: '2026-10-15T10:00:00Z',
};
const json = (body: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const clients: QueryClient[] = [];
const calls = vi.fn();
type Handler = (url: URL, init: RequestInit) => Response | Promise<Response>;
function network(handler: Handler) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const url = new URL(input, 'http://localhost');
      calls(url, init);
      return handler(url, init);
    }),
  );
}
function mount(route = '/leads') {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  clients.push(client);
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}
function standard(url: URL) {
  if (url.pathname.endsWith('/tasks') || url.pathname.endsWith('/activities'))
    return json({ items: [], total: 0, page: 1, page_size: 20 });
  if (url.pathname === '/api/v1/auth/me') return json(user);
  if (url.pathname === '/api/v1/leads')
    return json({
      items: [lead],
      total: 1,
      page: Number(url.searchParams.get('page') || '1'),
      page_size: 20,
    });
  if (url.pathname === '/api/v1/leads/lead-one') return json(lead);
  throw new Error(`Unexpected mocked endpoint ${url.pathname}`);
}
beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn());
  calls.mockClear();
  document.cookie = 'leadflow_csrf=unit-csrf; path=/';
});
afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
  vi.unstubAllGlobals();
});

describe('authentication and account boundaries', () => {
  it('requires consent before loading fictional data and shows persisted counts', async () => {
    let seeded = false;
    network((url, init) => {
      if (url.pathname === '/api/v1/leads')
        return json({
          items: seeded ? [lead] : [],
          total: seeded ? 12 : 0,
          page: 1,
          page_size: 1,
        });
      if (url.pathname === '/api/v1/demo/seed') {
        expect(init.method).toBe('POST');
        seeded = true;
        return json({ leads_created: 12, tasks_created: 8 }, 201);
      }
      return standard(url);
    });
    mount('/settings');
    const button = await screen.findByRole('button', {
      name: 'Load fictional demo',
    });
    expect(button).toBeDisabled();
    const consent = screen.getByRole('checkbox', {
      name: 'Add fictional demo data to my empty workspace',
    });
    await waitFor(() => expect(consent).toBeEnabled());
    expect(
      calls.mock.calls.some(([url]) => url.pathname.endsWith('/demo/seed')),
    ).toBe(false);
    await userEvent.click(consent);
    await userEvent.click(button);
    expect(
      await screen.findByText('12 fictional leads and 8 tasks added.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Explore dashboard' }),
    ).toHaveAttribute('href', '/dashboard');
  });

  it('does not offer seed writes for an existing workspace', async () => {
    network(standard);
    mount('/settings');
    expect(
      await screen.findByText(/workspace already has contacts/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Load fictional demo' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('checkbox', {
        name: 'Add fictional demo data to my empty workspace',
      }),
    ).toBeDisabled();
  });

  it('rechecks availability and preserves existing work after a seed conflict', async () => {
    let occupied = false;
    network((url) => {
      if (url.pathname === '/api/v1/leads')
        return json({
          items: occupied ? [lead] : [],
          total: occupied ? 1 : 0,
          page: 1,
          page_size: 1,
        });
      if (url.pathname === '/api/v1/demo/seed') {
        occupied = true;
        return json(
          { detail: 'Demo data can only be added to an empty workspace' },
          409,
        );
      }
      return standard(url);
    });
    mount('/settings');
    const consent = await screen.findByRole('checkbox', {
      name: 'Add fictional demo data to my empty workspace',
    });
    await waitFor(() => expect(consent).toBeEnabled());
    await userEvent.click(consent);
    await userEvent.click(
      screen.getByRole('button', { name: 'Load fictional demo' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'empty workspace',
    );
    await waitFor(() => expect(consent).toBeDisabled());
    expect(
      screen.queryByText('12 fictional leads and 8 tasks added.'),
    ).not.toBeInTheDocument();
  });
  it('explains HTML returned by an API route and recovers after retry', async () => {
    let invalidResponse = true;
    network((url) =>
      invalidResponse
        ? new Response('<!doctype html><html>SPA fallback</html>', {
            headers: { 'Content-Type': 'text/html' },
          })
        : standard(url),
    );
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'invalid API response',
    );
    expect(screen.getByRole('alert')).not.toHaveTextContent('Unexpected token');
    invalidResponse = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('link', { name: 'Fictional Contact' }),
    ).toBeInTheDocument();
  });
  it('protects private routes and signs in without persisting browser tokens', async () => {
    let signedIn = false;
    network((url, init) => {
      if (url.pathname === '/api/v1/auth/me')
        return signedIn
          ? json(user)
          : json({ detail: 'Authentication required' }, 401);
      if (url.pathname === '/api/v1/auth/login') {
        signedIn = true;
        expect(JSON.parse(String(init.body)).email).toBe('demo@example.org');
        return json({ user, csrf_token: 'unit-csrf' });
      }
      return standard(url);
    });
    const client = mount();
    client.setQueryData(['leads', 'previous-user'], {
      private: 'must be removed',
    });
    expect(
      await screen.findByRole('button', { name: 'Sign in' }),
    ).toBeInTheDocument();
    const interaction = userEvent.setup();
    await interaction.type(
      screen.getByLabelText('Email address'),
      'demo@example.org',
    );
    await interaction.type(
      screen.getByLabelText('Password'),
      randomBytes(18).toString('hex'),
    );
    await interaction.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(
      await screen.findByRole('link', { name: 'Fictional Contact' }),
    ).toBeInTheDocument();
    expect(client.getQueryData(['leads', 'previous-user'])).toBeUndefined();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('shows field validation before submitting registration', async () => {
    network(() => json({ detail: 'Authentication required' }, 401));
    mount('/register');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Create account' }),
    );
    expect(await screen.findByText('Enter your name')).toBeInTheDocument();
    expect(screen.getByText('Use at least 12 characters')).toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toHaveAccessibleDescription(
      'Enter your name',
    );
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      /Use at least 12 characters.*12–128 characters/,
    );
    expect(
      calls.mock.calls.every(([url]) => url.pathname.endsWith('/auth/me')),
    ).toBe(true);
  });

  it('keeps a failed session check distinct from signed-out state and supports retry', async () => {
    let offline = true;
    network((url) =>
      url.pathname === '/api/v1/auth/me' && offline
        ? json({ detail: 'Database unavailable' }, 503)
        : standard(url),
    );
    mount();
    expect(
      await screen.findByText('We couldn’t check your session.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Sign in' }),
    ).not.toBeInTheDocument();
    offline = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('link', { name: 'Fictional Contact' }),
    ).toBeInTheDocument();
  });

  it('clears private cached data when logging out', async () => {
    let signedOut = false;
    network((url) => {
      if (url.pathname === '/api/v1/auth/logout') {
        signedOut = true;
        return json(null, 204);
      }
      if (url.pathname === '/api/v1/auth/me' && signedOut)
        return json({ detail: 'Authentication required' }, 401);
      return standard(url);
    });
    const client = mount();
    await screen.findByRole('link', { name: 'Fictional Contact' });
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(
      await screen.findByRole('button', { name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(
      client
        .getQueryCache()
        .getAll()
        .some((query) => query.queryKey[0] === 'leads'),
    ).toBe(false);
    const [, options] = calls.mock.calls.find(([url]) =>
      url.pathname.endsWith('/logout'),
    )!;
    expect(new Headers(options.headers).get('X-CSRF-Token')).toBe('unit-csrf');
    expect(options.credentials).toBe('include');
  });

  it('hides private views when a resource request returns session expiry', async () => {
    network((url) =>
      url.pathname === '/api/v1/leads'
        ? json({ detail: 'Authentication required' }, 401)
        : standard(url),
    );
    mount();
    expect(
      await screen.findByRole('button', { name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Add lead' }),
    ).not.toBeInTheDocument();
  });
});

describe('lead list, forms and states', () => {
  function csvFile() {
    const file = new File(
      ['Contact,Email\nFictional Import,import@example.org\n'],
      'contacts.csv',
      { type: 'text/csv' },
    );
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () =>
        new TextEncoder().encode(
          'Contact,Email\nFictional Import,import@example.org\n',
        ).buffer,
    });
    return file;
  }
  const csvRows = [
    {
      row_number: 2,
      status: 'valid',
      data: { name: 'Fictional Import', email: 'import@example.org' },
      errors: [],
    },
  ];

  it('maps CSV columns and requires review confirmation before importing', async () => {
    network((url, init) => {
      if (url.pathname.endsWith('/csv/inspect'))
        return json({
          headers: ['Contact', 'Email'],
          sample_rows: [['Fictional Import', 'import@example.org']],
          total_rows: 1,
        });
      if (url.pathname.endsWith('/csv/preview')) {
        expect(JSON.parse(String(init.body)).mapping).toEqual({
          name: 'Contact',
          email: 'Email',
        });
        return json({
          total_rows: 1,
          valid_rows: 1,
          duplicate_rows: 0,
          invalid_rows: 0,
          rows: csvRows,
        });
      }
      if (url.pathname.endsWith('/csv/import')) {
        expect(JSON.parse(String(init.body)).confirm).toBe(true);
        return json({
          total_rows: 1,
          imported: 1,
          skipped: 0,
          rejected: 0,
          rows: csvRows,
        });
      }
      return standard(url);
    });
    mount('/import');
    const interaction = userEvent.setup();
    await interaction.upload(
      await screen.findByLabelText('CSV file'),
      csvFile(),
    );
    const validate = await screen.findByRole('button', {
      name: 'Validate & preview',
    });
    expect(validate).toBeDisabled();
    await interaction.selectOptions(
      screen.getByRole('combobox', { name: 'Column for name' }),
      'Contact',
    );
    await interaction.click(validate);
    const importButton = await screen.findByRole('button', {
      name: 'Import 1 valid rows',
    });
    expect(importButton).toBeDisabled();
    await interaction.click(
      screen.getByRole('checkbox', { name: 'Confirm reviewed import' }),
    );
    await interaction.click(importButton);
    expect(
      await screen.findByText('1 imported · 0 skipped · 0 rejected'),
    ).toBeInTheDocument();
  });

  it('requires an explicit partial-import choice for invalid rows', async () => {
    network((url) => {
      if (url.pathname.endsWith('/csv/inspect'))
        return json({
          headers: ['Contact', 'Email'],
          sample_rows: [],
          total_rows: 2,
        });
      if (url.pathname.endsWith('/csv/preview'))
        return json({
          total_rows: 2,
          valid_rows: 1,
          duplicate_rows: 0,
          invalid_rows: 1,
          rows: [
            ...csvRows,
            {
              row_number: 3,
              status: 'invalid',
              data: { name: 'Invalid' },
              errors: ['email: invalid email'],
            },
          ],
        });
      return standard(url);
    });
    mount('/import');
    const interaction = userEvent.setup();
    await interaction.upload(
      await screen.findByLabelText('CSV file'),
      csvFile(),
    );
    await interaction.selectOptions(
      await screen.findByRole('combobox', { name: 'Column for name' }),
      'Contact',
    );
    await interaction.click(
      screen.getByRole('button', { name: 'Validate & preview' }),
    );
    const button = await screen.findByRole('button', {
      name: 'Import 1 valid rows',
    });
    await interaction.click(
      screen.getByRole('checkbox', { name: 'Confirm reviewed import' }),
    );
    expect(button).toBeDisabled();
    await interaction.click(
      screen.getByRole('checkbox', {
        name: 'Import valid rows only; reject invalid rows',
      }),
    );
    expect(
      screen.getByRole('checkbox', { name: 'Confirm reviewed import' }),
    ).not.toBeChecked();
    await interaction.click(
      screen.getByRole('checkbox', { name: 'Confirm reviewed import' }),
    );
    expect(button).toBeEnabled();
    expect(screen.getByText('email: invalid email')).toBeInTheDocument();
  });

  it('reports malformed CSV without showing a confirmation step', async () => {
    network((url) =>
      url.pathname.endsWith('/csv/inspect')
        ? json({ detail: 'CSV headers must be unique' }, 422)
        : standard(url),
    );
    mount('/import');
    await userEvent.upload(await screen.findByLabelText('CSV file'), csvFile());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'CSV headers must be unique',
    );
    expect(
      screen.queryByRole('checkbox', { name: 'Confirm reviewed import' }),
    ).not.toBeInTheDocument();
  });

  it('renders server dashboard metrics and an exact stage table with follow-up links', async () => {
    network((url) =>
      url.pathname === '/api/v1/dashboard' ? json(dashboard) : standard(url),
    );
    mount('/dashboard');
    expect(
      await screen.findByRole('region', { name: 'Open pipeline value' }),
    ).toHaveTextContent('$4,200.50');
    expect(
      screen.getByRole('region', { name: 'Conversion rate' }),
    ).toHaveTextContent('50.00%');
    expect(
      screen.getByRole('table', {
        name: 'Exact stage counts and estimated values in USD',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'Follow up proposal Fictional Contact',
      }),
    ).toHaveAttribute('href', '/leads/lead-one');
    expect(screen.getByText(/not collected revenue/)).toBeInTheDocument();
  });

  it('shows an honest zero-data dashboard without invented sample metrics', async () => {
    network((url) =>
      url.pathname === '/api/v1/dashboard'
        ? json({
            ...dashboard,
            total: 0,
            open: 0,
            won: 0,
            lost: 0,
            open_value: '0.00',
            won_value: '0.00',
            conversion_rate: '0.00',
            incomplete_tasks: 0,
            overdue_tasks: 0,
            upcoming_tasks: [],
            stages: dashboard.stages.map((stage) => ({
              ...stage,
              count: 0,
              value: '0.00',
            })),
          })
        : standard(url),
    );
    mount('/dashboard');
    expect(
      await screen.findByText(
        'A fresh start, ready for your first connection.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Total leads' }),
    ).toHaveTextContent('0');
    expect(
      screen.getByText(
        'No pending follow-ups. Add a task from a contact’s detail.',
      ),
    ).toBeInTheDocument();
  });

  it('handles a dashboard failure and reloads server metrics on retry', async () => {
    let failed = true;
    network((url) =>
      url.pathname === '/api/v1/dashboard'
        ? failed
          ? json({ detail: 'Database unavailable' }, 503)
          : json(dashboard)
        : standard(url),
    );
    mount('/dashboard');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Database unavailable',
    );
    failed = false;
    await userEvent.click(
      screen.getByRole('button', { name: 'Retry dashboard' }),
    );
    expect(
      await screen.findByRole('region', { name: 'Total leads' }),
    ).toHaveTextContent('6');
  });

  it('creates a dated task, records history and completes it', async () => {
    let tasks: {
      id: string;
      title: string;
      description: string;
      due_date: string;
      completed: boolean;
    }[] = [];
    let activities: {
      id: string;
      type: string;
      description: string;
      created_at: string;
    }[] = [];
    network((url, init) => {
      if (url.pathname.endsWith('/tasks') && init.method === 'POST') {
        const body = JSON.parse(String(init.body));
        expect(body.due_date).toBe('2026-10-20');
        tasks = [{ id: 'task-one', ...body, completed: false }];
        activities = [
          {
            id: 'event-one',
            type: 'task_created',
            description: `Task created: ${body.title}`,
            created_at: '2026-10-15T12:00:00Z',
          },
        ];
        return json(tasks[0], 201);
      }
      if (url.pathname.endsWith('/tasks/task-one') && init.method === 'PATCH') {
        tasks = [{ ...tasks[0], ...JSON.parse(String(init.body)) }];
        return json(tasks[0]);
      }
      if (url.pathname.endsWith('/tasks'))
        return json({
          items: tasks,
          total: tasks.length,
          page: 1,
          page_size: 20,
        });
      if (url.pathname.endsWith('/activities'))
        return json({
          items: activities,
          total: activities.length,
          page: 1,
          page_size: 20,
        });
      return standard(url);
    });
    mount('/leads/lead-one');
    const interaction = userEvent.setup();
    await interaction.click(
      await screen.findByRole('button', { name: 'Add task' }),
    );
    expect(await screen.findByText('Enter a task title')).toBeInTheDocument();
    await interaction.type(
      screen.getByRole('textbox', { name: 'Task title' }),
      'Send fictional proposal',
    );
    await interaction.type(screen.getByLabelText('Due date'), '2026-10-20');
    await interaction.click(screen.getByRole('button', { name: 'Add task' }));
    expect(
      await screen.findByText('Task created: Send fictional proposal'),
    ).toBeInTheDocument();
    await interaction.click(
      screen.getByRole('checkbox', {
        name: 'Complete Send fictional proposal',
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', {
          name: 'Complete Send fictional proposal',
        }),
      ).toBeChecked(),
    );
  });

  it('shows task errors without discarding the entered follow-up', async () => {
    network((url, init) =>
      init.method === 'POST' && url.pathname.endsWith('/tasks')
        ? json({ detail: 'Database unavailable' }, 503)
        : standard(url),
    );
    mount('/leads/lead-one');
    const interaction = userEvent.setup();
    await interaction.type(
      await screen.findByRole('textbox', { name: 'Task title' }),
      'Preserve this task',
    );
    await interaction.type(screen.getByLabelText('Due date'), '2026-10-20');
    await interaction.click(screen.getByRole('button', { name: 'Add task' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Database unavailable',
    );
    expect(screen.getByRole('textbox', { name: 'Task title' })).toHaveValue(
      'Preserve this task',
    );
  });

  it('moves a pipeline card and persists only its status', async () => {
    let saved = { ...lead };
    network((url, init) => {
      if (
        url.pathname === '/api/v1/leads/lead-one' &&
        init.method === 'PATCH'
      ) {
        expect(JSON.parse(String(init.body))).toEqual({ status: 'won' });
        saved = { ...saved, status: 'won' };
        return json(saved);
      }
      if (url.pathname === '/api/v1/leads')
        return json({
          items: url.searchParams.get('status') === saved.status ? [saved] : [],
          total: Number(url.searchParams.get('status') === saved.status),
          page: 1,
          page_size: 20,
        });
      return standard(url);
    });
    mount('/pipeline');
    await userEvent.selectOptions(
      await screen.findByRole('combobox', {
        name: 'Stage for Fictional Contact',
      }),
      'won',
    );
    expect(
      await screen.findByText('Fictional Contact moved to Won.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'Stage for Fictional Contact' }),
    ).toHaveValue('won');
  });

  it('restores the saved stage after a failed pipeline write', async () => {
    network((url, init) => {
      if (init.method === 'PATCH')
        return json({ detail: 'Database unavailable' }, 503);
      if (url.pathname === '/api/v1/leads')
        return json({
          items: url.searchParams.get('status') === lead.status ? [lead] : [],
          total: Number(url.searchParams.get('status') === lead.status),
          page: 1,
          page_size: 20,
        });
      return standard(url);
    });
    mount('/pipeline');
    await userEvent.selectOptions(
      await screen.findByRole('combobox', {
        name: 'Stage for Fictional Contact',
      }),
      'lost',
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not confirm the stage change',
    );
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: 'Stage for Fictional Contact' }),
      ).toHaveValue('contacted'),
    );
  });

  it('loads the next page of a stage instead of silently truncating contacts', async () => {
    network((url) => {
      if (url.pathname === '/api/v1/leads') {
        const stage = url.searchParams.get('status');
        const page = Number(url.searchParams.get('page'));
        return json({
          items:
            stage === 'contacted'
              ? [
                  {
                    ...lead,
                    id: `lead-${page}`,
                    name: `Fictional Contact ${page}`,
                  },
                ]
              : [],
          total: stage === 'contacted' ? 21 : 0,
          page,
          page_size: 20,
        });
      }
      return standard(url);
    });
    mount('/pipeline');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Load more Contacted' }),
    );
    expect(
      await screen.findByRole('link', { name: 'Fictional Contact 2' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Fictional Contact 1' }),
    ).toBeInTheDocument();
  });

  it('renders persisted contacts and applies server filters and sort', async () => {
    network(standard);
    mount();
    expect(
      await screen.findByRole('link', { name: 'Fictional Contact' }),
    ).toBeInTheDocument();
    expect(screen.getByText('$1,200.50')).toBeInTheDocument();
    const interaction = userEvent.setup();
    await interaction.type(
      screen.getByRole('textbox', { name: 'Search leads' }),
      'North',
    );
    await interaction.selectOptions(
      screen.getByRole('combobox', { name: 'Filter by stage' }),
      'contacted',
    );
    await interaction.type(
      screen.getByRole('textbox', { name: 'Filter by source' }),
      'Referral',
    );
    await interaction.click(
      screen.getByRole('button', { name: 'Apply filters' }),
    );
    await waitFor(() =>
      expect(
        calls.mock.calls.some(
          ([url]) =>
            url.searchParams.get('q') === 'North' &&
            url.searchParams.get('status') === 'contacted' &&
            url.searchParams.get('source') === 'Referral',
        ),
      ).toBe(true),
    );
    await interaction.selectOptions(
      screen.getByRole('combobox', { name: 'Sort leads' }),
      'name:asc',
    );
    await waitFor(() =>
      expect(
        calls.mock.calls.some(
          ([url]) =>
            url.searchParams.get('sort_by') === 'name' &&
            url.searchParams.get('sort_order') === 'asc',
        ),
      ).toBe(true),
    );
  });

  it('distinguishes a new workspace from no search matches', async () => {
    network((url) =>
      url.pathname === '/api/v1/leads'
        ? json({ items: [], total: 0, page: 1, page_size: 20 })
        : standard(url),
    );
    mount();
    expect(
      await screen.findByText('Your next connection starts here.'),
    ).toBeInTheDocument();
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Search leads' }),
      'Unknown',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Apply filters' }),
    );
    expect(
      await screen.findByText('No matching connections.'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Clear filters' }).length,
    ).toBeGreaterThan(0);
  });

  it('shows a loading state while data is pending', async () => {
    network((url) =>
      url.pathname === '/api/v1/leads'
        ? new Promise<Response>(() => {})
        : Promise.resolve(standard(url)),
    );
    mount();
    await screen.findByRole('link', { name: 'Add lead' });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading your workspace',
    );
  });

  it('reports a list error and retries successfully', async () => {
    let unavailable = true;
    network((url) =>
      url.pathname === '/api/v1/leads' && unavailable
        ? json({ detail: 'Database unavailable' }, 503)
        : standard(url),
    );
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Database unavailable',
    );
    unavailable = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('link', { name: 'Fictional Contact' }),
    ).toBeInTheDocument();
  });

  it('validates the lead form and maps duplicate email errors without losing entered fields', async () => {
    network((url, init) =>
      url.pathname === '/api/v1/leads' && init.method === 'POST'
        ? json({ detail: 'A lead with this email already exists' }, 409)
        : standard(url),
    );
    mount('/leads/new');
    const interaction = userEvent.setup();
    await interaction.click(
      await screen.findByRole('button', { name: 'Create lead' }),
    );
    expect(await screen.findByText('Enter a contact name')).toBeInTheDocument();
    await interaction.type(
      screen.getByRole('textbox', { name: /^Full name/ }),
      'Another Fictional Contact',
    );
    await interaction.type(
      screen.getByLabelText('Email address'),
      'contact@example.org',
    );
    await interaction.click(
      screen.getByRole('button', { name: 'Create lead' }),
    );
    expect(
      await screen.findByText(
        'This email already belongs to another contact in your account.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^Full name/ })).toHaveValue(
      'Another Fictional Contact',
    );
  });

  it('shows the detail and persists an edited value as a decimal string', async () => {
    network((url, init) => {
      if (
        url.pathname === '/api/v1/leads/lead-one' &&
        init.method === 'PATCH'
      ) {
        const body = JSON.parse(String(init.body));
        expect(body.estimated_value).toBe('2500.75');
        return json({ ...lead, ...body });
      }
      return standard(url);
    });
    mount('/leads/lead-one/edit');
    const interaction = userEvent.setup();
    const amount = await screen.findByLabelText('Estimated value (USD)');
    await interaction.clear(amount);
    await interaction.type(amount, '2500.75');
    await interaction.click(
      screen.getByRole('button', { name: 'Save changes' }),
    );
    expect(await screen.findByText('$2,500.75')).toBeInTheDocument();
  });
});
