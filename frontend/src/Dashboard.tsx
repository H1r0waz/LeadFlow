import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, Plus } from 'lucide-react';
import { labelStatus, money, useAuth, type Status } from './api';

export type DashboardData = {
  total: number;
  open: number;
  won: number;
  lost: number;
  open_value: string;
  won_value: string;
  conversion_rate: string;
  stages: { status: Status; count: number; value: string }[];
  upcoming_tasks: {
    id: string;
    lead_id: string;
    lead_name: string;
    title: string;
    due_date: string;
  }[];
  incomplete_tasks: number;
  overdue_tasks: number;
  due_today: number;
  as_of: string;
};
function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function Metric({
  title,
  value,
  detail,
}: {
  title: string;
  value: string | number;
  detail: string;
}) {
  return (
    <section className="metric-card" aria-label={title}>
      <h2>{title}</h2>
      <strong>{value}</strong>
      <p>{detail}</p>
    </section>
  );
}
const colors = ['#578b78', '#bed68c', '#caa296'];
export default function Dashboard() {
  const { user, request } = useAuth();
  const today = localDate();
  const query = useQuery({
    queryKey: ['dashboard', user!.id, today],
    queryFn: ({ signal }) =>
      request<DashboardData>(`/dashboard?today=${today}`, { signal }),
    retry: false,
  });
  if (query.isPending) return <p role="status">Loading your sales overview…</p>;
  if (query.error)
    return (
      <div role="alert" className="error-notice">
        <p>{query.error.message}</p>
        <button className="button" onClick={() => void query.refetch()}>
          Retry dashboard
        </button>
      </div>
    );
  const data = query.data;
  const stages = data.stages.map((stage) => ({
    ...stage,
    label: labelStatus(stage.status),
  }));
  const outcomes = [
    { name: 'Open', value: data.open },
    { name: 'Won', value: data.won },
    { name: 'Lost', value: data.lost },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">A LITTLE PERSPECTIVE</span>
          <h1>
            Dashboard<span className="heading-dot">.</span>
          </h1>
          <p className="muted">Your opportunities and next steps, in focus.</p>
        </div>
        <Link className="button primary" to="/leads/new">
          <Plus size={18} />
          Add lead
        </Link>
      </div>
      {!data.total && (
        <div className="dashboard-empty">
          <h2>A fresh start, ready for your first connection.</h2>
          <p>
            Your metrics will grow from the contacts you add. There are no
            sample sales in this account.
          </p>
          <Link className="text-button" to="/leads/new">
            Add your first lead <ArrowRight size={15} />
          </Link>
          <Link className="text-button" to="/settings">
            Explore with fictional demo data <ArrowRight size={15} />
          </Link>
        </div>
      )}
      <div className="metrics-grid">
        <Metric
          title="Total leads"
          value={data.total}
          detail="Every contact in your workspace"
        />
        <Metric
          title="Open leads"
          value={data.open}
          detail="New through proposal sent"
        />
        <Metric
          title="Won leads"
          value={data.won}
          detail="Opportunities marked won"
        />
        <Metric
          title="Lost leads"
          value={data.lost}
          detail="Opportunities marked lost"
        />
        <Metric
          title="Open pipeline value"
          value={money(data.open_value)}
          detail="USD · estimated value of open leads"
        />
        <Metric
          title="Won value"
          value={money(data.won_value)}
          detail="USD · estimated value of won leads"
        />
        <Metric
          title="Conversion rate"
          value={`${data.conversion_rate}%`}
          detail="Won ÷ closed leads (won + lost)"
        />
        <Metric
          title="Incomplete follow-ups"
          value={data.incomplete_tasks}
          detail={`${data.overdue_tasks} overdue · ${data.due_today} due today`}
        />
      </div>
      <div className="dashboard-charts">
        <section className="detail-card">
          <div className="card-heading">
            <h2>Leads by stage</h2>
            <Link className="text-button" to="/pipeline">
              Open pipeline <ArrowRight size={14} />
            </Link>
          </div>
          {data.total ? (
            <div
              className="dashboard-chart"
              role="img"
              aria-label="Leads by stage chart. Exact counts and values are in the stage breakdown below."
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={1}
                minHeight={1}
              >
                <BarChart
                  data={stages}
                  layout="vertical"
                  margin={{ left: 5, right: 25, top: 15, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={110}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    name="Leads"
                    fill="#578b78"
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="chart-empty">No stages to chart yet.</p>
          )}
        </section>
        <section className="detail-card">
          <div className="card-heading">
            <h2>Opportunity outcomes</h2>
          </div>
          {data.total ? (
            <div
              className="dashboard-chart"
              role="img"
              aria-label={`Opportunity outcomes: ${data.open} open, ${data.won} won, ${data.lost} lost.`}
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={1}
                minHeight={1}
              >
                <PieChart>
                  <Pie
                    data={outcomes}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="52%"
                    outerRadius="78%"
                    isAnimationActive={false}
                  >
                    {outcomes.map((outcome, index) => (
                      <Cell key={outcome.name} fill={colors[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="chart-empty">Add a lead to see your outcomes.</p>
          )}
          <ul className="chart-legend">
            {outcomes.map((outcome, index) => (
              <li key={outcome.name}>
                <span style={{ background: colors[index] }} />
                {outcome.name}
                <strong>{outcome.value}</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="dashboard-bottom">
        <section className="detail-card">
          <div className="card-heading">
            <h2>Stage breakdown</h2>
          </div>
          <div
            className="table-scroll"
            role="region"
            tabIndex={0}
            aria-label="Stage breakdown, scroll horizontally for more columns"
          >
            <table className="dashboard-table">
              <caption className="sr-only">
                Exact stage counts and estimated values in USD
              </caption>
              <thead>
                <tr>
                  <th scope="col">Stage</th>
                  <th scope="col">Leads</th>
                  <th scope="col">Est. value (USD)</th>
                </tr>
              </thead>
              <tbody>
                {stages.map((stage) => (
                  <tr key={stage.status}>
                    <th scope="row">{stage.label}</th>
                    <td>{stage.count}</td>
                    <td>{money(stage.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="detail-card">
          <div className="card-heading">
            <h2>Next follow-ups</h2>
            <span className="count">{data.incomplete_tasks}</span>
          </div>
          <p className="muted">
            Up to five incomplete tasks, earliest due first. Overdue tasks stay
            visible.
          </p>
          {data.upcoming_tasks.length ? (
            <ol className="dashboard-tasks">
              {data.upcoming_tasks.map((task) => (
                <li key={task.id}>
                  <Link
                    to={`/leads/${task.lead_id}`}
                    aria-label={`${task.title} ${task.lead_name}`}
                  >
                    <strong>{task.title}</strong>
                    <span>{task.lead_name}</span>
                  </Link>
                  <time
                    className={task.due_date < data.as_of ? 'overdue' : ''}
                    dateTime={task.due_date}
                  >
                    {task.due_date < data.as_of ? 'Overdue · ' : ''}
                    {task.due_date}
                  </time>
                </li>
              ))}
            </ol>
          ) : (
            <p className="notes-empty">
              No pending follow-ups. Add a task from a contact’s detail.
            </p>
          )}
        </section>
      </div>
      <p className="dashboard-footnote">
        All amounts are estimated USD values, not collected revenue. Conversion
        is 0% when no opportunities are closed. Follow-up dates use your
        calendar day ({data.as_of}).
      </p>
    </>
  );
}
