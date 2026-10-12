import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:8081/api/transactions";

function localDateTimeValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatAmount(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function getStatus(transaction) {
  return String(transaction?.fraudStatus ?? "UNKNOWN").toUpperCase();
}

// The backend currently stores the configured threshold inside the report text.
// Read it from there so the dashboard doesn't silently assume a fixed threshold.
function getThreshold(transaction) {
  if (transaction?.threshold != null && Number.isFinite(Number(transaction.threshold))) {
    return Number(transaction.threshold);
  }
  const report = String(transaction?.report ?? "");
  const match = report.match(/decision threshold is\s*([0-9]*\.?[0-9]+)/i);
  return match ? Number(match[1]) : null;
}

function formatScore(value) {
  return value == null || !Number.isFinite(Number(value)) ? "—" : Number(value).toFixed(4);
}

function App() {
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [form, setForm] = useState({
    userId: "",
    amount: "",
    merchant: "",
    location: "",
    transactionTime: localDateTimeValue(),
    transactionType: "TRANSFER",
    oldBalanceOrg: "",
    newBalanceOrig: "",
    oldBalanceDest: "",
    newBalanceDest: "",
  });

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error(`Backend returned HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("The transactions API did not return a list.");
      setTransactions(data);
      setLastUpdated(new Date());
      setSelected((previous) => {
        if (!previous) return null;
        return data.find((item) => item.transactionId === previous.transactionId) ?? null;
      });
    } catch (err) {
      setError(`${err.message}. Check that the backend is running at localhost:8081 and allows requests from this frontend.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadTransactions(), 0);
    return () => clearTimeout(timer);
  }, [loadTransactions]);

  const summary = useMemo(() => {
    const safe = transactions.filter((item) => getStatus(item) === "SAFE").length;
    const suspicious = transactions.filter((item) => getStatus(item) === "SUSPICIOUS").length;
    return { total: transactions.length, safe, suspicious };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions.filter((item) => {
      const status = getStatus(item);
      const matchesStatus = statusFilter === "ALL" || status === statusFilter;
      const searchable = [
        item.transactionId, item.userId, item.merchant, item.location,
        item.fraudStatus, item.report, item.transactionType,
      ].filter(Boolean).join(" ").toLowerCase();
      return matchesStatus && (!query || searchable.includes(query));
    });
  }, [transactions, search, statusFilter]);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function submitTransaction(event) {
    event.preventDefault();
    setFormError("");
    setFormSuccess("");

    const amount = Number(form.amount);
    if (!form.userId.trim() || !form.merchant.trim() || !form.location.trim()) {
      setFormError("Please complete the user ID, merchant, and location fields.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Enter an amount greater than ₹0.");
      return;
    }
    if (!form.transactionTime) {
      setFormError("Choose the transaction date and time.");
      return;
    }

    const balanceFields = ["oldBalanceOrg", "newBalanceOrig", "oldBalanceDest", "newBalanceDest"];
    for (const field of balanceFields) {
      if (form[field] !== "" && (!Number.isFinite(Number(form[field])) || Number(form[field]) < 0)) {
        setFormError("Balance values must be zero or greater.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        userId: form.userId.trim(),
        amount,
        merchant: form.merchant.trim(),
        location: form.location.trim(),
        transactionTime: form.transactionTime.length === 16 ? `${form.transactionTime}:00` : form.transactionTime,
        transactionType: form.transactionType,
      };
      // Leave optional balances out if blank; the backend defaults them to zero.
      if (form.oldBalanceOrg !== "") payload.oldBalanceOrg = Number(form.oldBalanceOrg);
      if (form.newBalanceOrig !== "") payload.newBalanceOrig = Number(form.newBalanceOrig);
      if (form.oldBalanceDest !== "") payload.oldBalanceDest = Number(form.oldBalanceDest);
      if (form.newBalanceDest !== "") payload.newBalanceDest = Number(form.newBalanceDest);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = result?.message || result?.error || `Backend returned HTTP ${response.status}`;
        throw new Error(detail);
      }

      setFormSuccess(`Transaction ${result?.transactionId ?? "submitted"} was saved and analysed.`);
      setForm({
        userId: "", amount: "", merchant: "", location: "",
        transactionTime: localDateTimeValue(), transactionType: "TRANSFER",
        oldBalanceOrg: "", newBalanceOrig: "", oldBalanceDest: "", newBalanceDest: "",
      });
      await loadTransactions();
      if (result?.transactionId) setSelected(result);
    } catch (err) {
      setFormError(`${err.message}. Check that both the backend and ML service are running.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">FD</div>
          <div><p className="eyebrow">TRANSACTION MONITORING</p><h1>Fraud Detection</h1></div>
        </div>
        <div className="topbar-right">
          <span className="connection"><span className="connection-dot" />API dashboard</span>
          <button className="refresh-button" onClick={loadTransactions} disabled={loading}>
            <span aria-hidden="true">↻</span>{loading ? "Loading..." : "Refresh data"}
          </button>
        </div>
      </header>

      <section className="welcome">
        <div><p className="eyebrow">OVERVIEW</p><h2>Transaction intelligence</h2><p className="subtitle">Review saved transactions and investigate model alerts.</p></div>
        <div className="welcome-actions">
          <p className="updated">Last refreshed<br /><strong>{lastUpdated ? lastUpdated.toLocaleTimeString() : "Not yet"}</strong></p>
          <button className="refresh-button new-transaction-button" onClick={() => { setShowForm((value) => !value); setFormError(""); setFormSuccess(""); }}>
            {showForm ? "− Close form" : "+ New transaction"}
          </button>
        </div>
      </section>

      {error && <section className="error-banner" role="alert"><strong>Could not load transactions</strong><p>{error}</p><button onClick={loadTransactions}>Try again</button></section>}

      {showForm && (
        <section className="new-transaction-panel">
          <div className="panel-heading form-panel-heading"><div><p className="eyebrow">TRANSACTION INPUT</p><h2>Analyse a new transaction</h2><p className="subtitle">Submit transaction details to the backend and run the current ML model.</p></div></div>
          <form className="transaction-form" onSubmit={submitTransaction}>
            <label>User ID<input name="userId" value={form.userId} onChange={updateForm} placeholder="e.g. USER_1001" required maxLength={100} /></label>
            <label>Amount (₹)<input name="amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={updateForm} placeholder="e.g. 2500" required /></label>
            <label>Merchant<input name="merchant" value={form.merchant} onChange={updateForm} placeholder="e.g. Online Store" required maxLength={150} /></label>
            <label>Location<input name="location" value={form.location} onChange={updateForm} placeholder="e.g. Hyderabad" required maxLength={150} /></label>
            <label>Transaction type<select name="transactionType" value={form.transactionType} onChange={updateForm} required><option value="PAYMENT">PAYMENT</option><option value="TRANSFER">TRANSFER</option><option value="CASH_OUT">CASH_OUT</option><option value="DEBIT">DEBIT</option><option value="CASH_IN">CASH_IN</option></select></label>
            <label className="form-date-field">Transaction date and time<input name="transactionTime" type="datetime-local" step="1" value={form.transactionTime} onChange={updateForm} required /></label>
            <label>Origin balance before<input name="oldBalanceOrg" type="number" min="0" step="0.01" value={form.oldBalanceOrg} onChange={updateForm} placeholder="Optional; defaults to 0" /></label>
            <label>Origin balance after<input name="newBalanceOrig" type="number" min="0" step="0.01" value={form.newBalanceOrig} onChange={updateForm} placeholder="Optional; defaults to 0" /></label>
            <label>Destination balance before<input name="oldBalanceDest" type="number" min="0" step="0.01" value={form.oldBalanceDest} onChange={updateForm} placeholder="Optional; defaults to 0" /></label>
            <label>Destination balance after<input name="newBalanceDest" type="number" min="0" step="0.01" value={form.newBalanceDest} onChange={updateForm} placeholder="Optional; defaults to 0" /></label>
            <div className="form-actions"><button className="refresh-button" type="submit" disabled={submitting}>{submitting ? "Analysing..." : "Analyse transaction"}</button></div>
          </form>
          {formError && <p className="form-message form-error" role="alert">{formError}</p>}
          {formSuccess && <p className="form-message form-success" role="status">{formSuccess}</p>}
          <p className="form-note">Important: balance inputs improve test realism, but the model uses PaySim features. Location is not currently a trained feature, and predictions are not proof of fraud.</p>
        </section>
      )}

      <section className="summary-grid" aria-label="Transaction summary">
        <article className="summary-card total-card"><div className="card-heading"><span>Total transactions</span><span className="card-icon">▤</span></div><p className="metric">{summary.total}</p><p className="metric-note">Records returned by the backend</p></article>
        <article className="summary-card safe-card"><div className="card-heading"><span>Safe</span><span className="card-icon">✓</span></div><p className="metric">{summary.safe}</p><p className="metric-note">Not flagged at the configured threshold</p></article>
        <article className="summary-card suspicious-card"><div className="card-heading"><span>Suspicious</span><span className="card-icon">!</span></div><p className="metric">{summary.suspicious}</p><p className="metric-note">Flagged for further review</p></article>
      </section>

      <section className="history-panel">
        <div className="panel-heading"><div><h2>Transaction history</h2><p className="subtitle">Select a transaction to inspect its score, threshold, and report.</p></div><span className="record-count">{filteredTransactions.length} records</span></div>
        <div className="filters">
          <label className="search-box"><span aria-hidden="true">⌕</span><input type="search" placeholder="Search ID, user, merchant, location..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <label className="status-filter"><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">All statuses</option><option value="SAFE">Safe</option><option value="SUSPICIOUS">Suspicious</option></select></label>
        </div>
        <div className="table-wrap"><table>
          <thead><tr><th>Transaction</th><th>User</th><th>Merchant</th><th>Amount</th><th>Fraud score</th><th>Threshold</th><th>Status</th><th>Time</th><th>Details</th></tr></thead>
          <tbody>
            {filteredTransactions.map((item) => {
              const status = getStatus(item);
              const threshold = getThreshold(item);
              return <tr key={item.transactionId}>
                <td className="transaction-id">{item.transactionId ?? "—"}</td><td>{item.userId ?? "—"}</td><td>{item.merchant ?? "—"}</td>
                <td className="amount">{formatAmount(item.amount)}</td><td className="score">{formatScore(item.fraudScore)}</td><td>{threshold == null ? "—" : threshold.toFixed(2)}</td>
                <td><span className={`status-badge ${status === "SAFE" ? "status-safe" : status === "SUSPICIOUS" ? "status-suspicious" : "status-unknown"}`}>{status}</span></td>
                <td className="date-cell">{formatDate(item.transactionTime)}</td><td><button className="details-button" onClick={() => setSelected(item)}>View report</button></td>
              </tr>;
            })}
            {!loading && filteredTransactions.length === 0 && <tr><td colSpan="9" className="empty-state">No matching transactions found.</td></tr>}
            {loading && transactions.length === 0 && <tr><td colSpan="9" className="empty-state">Loading transactions...</td></tr>}
          </tbody>
        </table></div>
        <p className="table-footnote">A suspicious result is a model alert, not proof of fraud. The threshold is read from the saved report; older records without threshold text show “—”.</p>
      </section>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)} role="presentation">
          <section className="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-heading"><div><p className="eyebrow">TRANSACTION INVESTIGATION</p><h2 id="report-title">Transaction report</h2></div><button className="close-button" onClick={() => setSelected(null)} aria-label="Close report">×</button></div>
            <p className="modal-id">{selected.transactionId}</p>
            <div className="report-grid">
              <div><span>User ID</span><strong>{selected.userId ?? "—"}</strong></div><div><span>Amount</span><strong>{formatAmount(selected.amount)}</strong></div>
              <div><span>Merchant</span><strong>{selected.merchant ?? "—"}</strong></div><div><span>Location</span><strong>{selected.location ?? "—"}</strong></div>
              <div><span>Transaction time</span><strong>{formatDate(selected.transactionTime)}</strong></div><div><span>Transaction type</span><strong>{selected.transactionType ?? "See model report"}</strong></div>
              <div><span>Fraud score</span><strong>{formatScore(selected.fraudScore)}</strong></div><div><span>Decision threshold</span><strong>{getThreshold(selected) == null ? "Not recorded" : getThreshold(selected).toFixed(2)}</strong></div>
              <div><span>Status</span><strong>{getStatus(selected)}</strong></div>
            </div>
            <div className="report-text"><h3>Model report</h3><p>{selected.report || "No detailed report was saved for this transaction."}</p></div>
            <p className="disclaimer">This is decision support, not a final determination of fraud. A score is not a calibrated real-world fraud probability. Verify suspicious transactions before taking action.</p>
            <button className="refresh-button modal-close" onClick={() => setSelected(null)}>Close report</button>
          </section>
        </div>
      )}

      <footer>Fraud Detection Agent <span>•</span> React + Spring Boot + ML</footer>
    </main>
  );
}

export default App;