import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Upload, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from './api';

const fields = [
  'name',
  'company',
  'email',
  'phone',
  'source',
  'status',
  'estimated_value',
  'notes',
] as const;
const labels: Record<string, string> = {
  name: 'Name (required)',
  company: 'Company',
  email: 'Email',
  phone: 'Phone',
  source: 'Source',
  status: 'Stage',
  estimated_value: 'Estimated value (USD)',
  notes: 'Notes',
};
type Inspection = {
  headers: string[];
  sample_rows: string[][];
  total_rows: number;
};
type Row = {
  row_number: number;
  status: 'valid' | 'duplicate' | 'invalid';
  data: Record<string, unknown>;
  errors: string[];
};
type Preview = {
  total_rows: number;
  valid_rows: number;
  duplicate_rows: number;
  invalid_rows: number;
  rows: Row[];
};
type Result = {
  imported: number;
  skipped: number;
  rejected: number;
  total_rows: number;
  rows: Row[];
};

export default function CsvImport() {
  const { user, request } = useAuth();
  const client = useQueryClient();
  const [csvText, setCsvText] = useState('');
  const [filename, setFilename] = useState('');
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [partial, setPartial] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  function resetPreview() {
    setPreview(null);
    setResult(null);
    setPage(1);
    setConfirmed(false);
    setPartial(false);
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError('');
    setInspection(null);
    resetPreview();
    setCsvText('');
    setFilename('');
    try {
      if (file.size > 2 * 1024 * 1024)
        throw new Error('Choose a CSV file no larger than 2 MiB.');
      const text = new TextDecoder('utf-8', { fatal: true }).decode(
        await file.arrayBuffer(),
      );
      const info = await request<Inspection>('/csv/inspect', {
        method: 'POST',
        body: JSON.stringify({ csv_text: text }),
      });
      setCsvText(text);
      setFilename(file.name);
      setInspection(info);
      setMapping(
        Object.fromEntries(
          fields.flatMap((field) => {
            const header = info.headers.find(
              (value) => value.toLowerCase() === field,
            );
            return header ? [[field, header]] : [];
          }),
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not read this CSV file.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function validate() {
    setBusy(true);
    setError('');
    resetPreview();
    try {
      setPreview(
        await request<Preview>('/csv/preview', {
          method: 'POST',
          body: JSON.stringify({ csv_text: csvText, mapping }),
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not validate this file.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function importRows() {
    if (!confirmed || busy) return;
    setBusy(true);
    setError('');
    try {
      setResult(
        await request<Result>('/csv/import', {
          method: 'POST',
          body: JSON.stringify({
            csv_text: csvText,
            mapping,
            allow_partial: partial,
            confirm: true,
          }),
        }),
      );
      await Promise.all([
        client.invalidateQueries({ queryKey: ['leads', user!.id] }),
        client.invalidateQueries({ queryKey: ['dashboard', user!.id] }),
      ]);
      setConfirmed(false);
      setPage(1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Import failed. Validate the file again before retrying.',
      );
      setConfirmed(false);
    } finally {
      setBusy(false);
    }
  }
  async function exportRows() {
    setBusy(true);
    setError('');
    try {
      const csv = await request<string>('/csv/export');
      const url = URL.createObjectURL(
        new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'leadflow-leads.csv';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not export your contacts.',
      );
    } finally {
      setBusy(false);
    }
  }
  const rows = result?.rows ?? preview?.rows ?? [];
  const visible = rows.slice((page - 1) * 20, page * 20);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">BRING YOUR CONNECTIONS TOGETHER</span>
          <h1>
            Import & export<span className="heading-dot">.</span>
          </h1>
          <p className="muted">
            Review every row before it joins your workspace.
          </p>
        </div>
        <button
          className="button"
          disabled={busy}
          onClick={() => void exportRows()}
        >
          <Download size={17} />
          Export all leads
        </button>
      </div>
      {error && (
        <div className="error-notice" role="alert">
          {error}
        </div>
      )}
      <section className="detail-card csv-upload">
        <h2>1. Choose your CSV</h2>
        <p className="muted">
          UTF-8, comma-separated, with a header row. Maximum 2 MiB and 5,000
          contacts. Only fictional data.
        </p>
        <label className="csv-file-label">
          <Upload size={19} />
          CSV file
          <input
            ref={inputRef}
            type="file"
            aria-label="CSV file"
            accept=".csv,text/csv"
            disabled={busy}
            onChange={(event) => void upload(event.target.files?.[0])}
          />
        </label>
        {filename && (
          <p>
            {filename} · {inspection?.total_rows} data rows
          </p>
        )}
        {busy && <p role="status">Processing your file…</p>}
      </section>
      {inspection && (
        <section className="detail-card csv-section">
          <h2>2. Match columns</h2>
          <p className="muted">
            Map a name column to continue. Skip optional fields you do not need.
            Blank stages become New; blank values become 0 USD.
          </p>
          <div className="csv-mapping">
            {fields.map((field) => (
              <label key={field}>
                {labels[field]}
                <select
                  aria-label={`Column for ${field}`}
                  value={mapping[field] || ''}
                  disabled={busy}
                  onChange={(event) => {
                    resetPreview();
                    setError('');
                    setMapping((current) => {
                      const next = { ...current };
                      if (event.target.value) next[field] = event.target.value;
                      else delete next[field];
                      return next;
                    });
                  }}
                >
                  <option value="">Do not import</option>
                  {inspection.headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <details>
            <summary>Original file sample</summary>
            <div
              className="table-scroll"
              role="region"
              tabIndex={0}
              aria-label="Original CSV sample, scroll horizontally for more columns"
            >
              <table>
                <thead>
                  <tr>
                    {inspection.headers.map((header) => (
                      <th scope="col" key={header}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inspection.sample_rows.map((row, index) => (
                    <tr key={index}>
                      {row.map((cell, col) => (
                        <td key={col}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <button
            className="button primary"
            disabled={busy || !mapping.name}
            onClick={() => void validate()}
          >
            Validate & preview
          </button>
        </section>
      )}
      {preview && !result && (
        <section className="detail-card csv-section">
          <h2>3. Review & confirm</h2>
          <p className="csv-summary">
            {preview.valid_rows} valid · {preview.duplicate_rows} duplicates ·{' '}
            {preview.invalid_rows} invalid
          </p>
          <p className="muted">
            Existing leads are never overwritten. Duplicate emails in your
            account or file are skipped. Contacts without email cannot be
            reliably deduplicated.
          </p>
          {preview.invalid_rows > 0 && (
            <label className="csv-check">
              <input
                type="checkbox"
                checked={partial}
                disabled={busy}
                onChange={(event) => {
                  setPartial(event.target.checked);
                  setConfirmed(false);
                }}
              />
              Import valid rows only; reject invalid rows
            </label>
          )}
          <label className="csv-check">
            <input
              type="checkbox"
              aria-label="Confirm reviewed import"
              checked={confirmed}
              disabled={busy}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            I reviewed the rows and confirm this import.
          </label>
          <button
            className="button primary"
            disabled={
              busy ||
              !confirmed ||
              !preview.valid_rows ||
              (preview.invalid_rows > 0 && !partial)
            }
            onClick={() => void importRows()}
          >
            Import {preview.valid_rows} valid rows
          </button>
        </section>
      )}
      {result && (
        <section className="detail-card csv-section" role="status">
          <h2>
            <Check size={18} />
            Import complete
          </h2>
          <p>
            {result.imported} imported · {result.skipped} skipped ·{' '}
            {result.rejected} rejected
          </p>
          <Link className="button primary" to="/leads">
            View leads
          </Link>
          <button
            className="button"
            disabled={busy}
            onClick={() => {
              setInspection(null);
              setCsvText('');
              setFilename('');
              resetPreview();
              if (inputRef.current) inputRef.current.value = '';
            }}
          >
            Choose another file
          </button>
        </section>
      )}
      {(preview || result) && (
        <section className="detail-card csv-section">
          <h2>Row report</h2>
          <p className="muted">
            Row numbers count CSV records, starting at 2 after the header;
            quoted multiline values count as one record.
          </p>
          <div
            className="table-scroll"
            role="region"
            tabIndex={0}
            aria-label="CSV row report, scroll horizontally for more columns"
          >
            <table className="csv-report">
              <thead>
                <tr>
                  <th scope="col">Row</th>
                  <th scope="col">Result</th>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Details</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.row_number}>
                    <td>{row.row_number}</td>
                    <td>
                      {result && row.status === 'valid'
                        ? 'imported'
                        : row.status}
                    </td>
                    <td>{String(row.data.name ?? '—')}</td>
                    <td>{String(row.data.email ?? '—')}</td>
                    <td>
                      {row.errors.join('; ') || (result ? 'Saved' : 'Ready')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>
              {rows.length} rows · page {page} of{' '}
              {Math.max(1, Math.ceil(rows.length / 20))}
            </span>
            <div>
              <button
                className="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous rows
              </button>
              <button
                className="button"
                disabled={page * 20 >= rows.length}
                onClick={() => setPage((current) => current + 1)}
              >
                Next rows
              </button>
            </div>
          </div>
        </section>
      )}
      <p className="dashboard-footnote">
        Export includes all leads in this account, independently of filters.
        Spreadsheet formula-like text is prefixed with an apostrophe for safer
        opening; this may add a literal apostrophe on re-import.
      </p>
    </>
  );
}
