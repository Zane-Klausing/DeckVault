import { useState, useEffect } from 'react';
// Recharts components — each one maps to a visual layer of the chart
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import { getCollection } from '../api/collection';
import { getDecks } from '../api/decks';
import './Dashboard.css';

export default function Dashboard() {
  const [collection, setCollection] = useState([]);
  const [decks, setDecks] = useState([]);

  // Fetch both data sources in parallel when the component mounts.
  // The empty [] dependency array means this runs once, like a constructor.
  useEffect(() => {
    getCollection().then(setCollection).catch(console.error);
    getDecks().then(setDecks).catch(console.error);
  }, []);

  // KPI calculations — all done client-side from the fetched data, no extra API calls needed

  // Sum of (quantity × price) across all collection entries
  const totalValue = collection.reduce((sum, e) => sum + e.quantity * (e.purchasePrice ?? 0), 0);

  // Total number of individual cards (respects quantities)
  const totalCards = collection.reduce((sum, e) => sum + e.quantity, 0);

  // Bar chart data: top 10 entries by total value (quantity × price), sorted descending
  const barData = [...collection]  // spread to avoid mutating state
    .map((e) => ({ name: e.cardName, value: e.quantity * (e.purchasePrice ?? 0) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);  // only show the top 10

  // Line chart data: cumulative spend over time.
  // Uses an IIFE (immediately invoked function expression) to keep the
  // intermediate variables scoped locally rather than polluting the component scope.
  const lineData = (() => {
    // Aggregate spend by date — multiple purchases on the same day are summed
    const byDate = collection.reduce((acc, e) => {
      const spend = e.quantity * (e.purchasePrice ?? 0);
      acc[e.purchaseDate] = (acc[e.purchaseDate] ?? 0) + spend;
      return acc;
    }, {});

    // Sort dates ascending (ISO strings sort correctly as strings)
    const sorted = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));

    // Accumulate spend into a running total for the line chart
    let cumulative = 0;
    return sorted.map(([date, spend]) => {
      cumulative += spend;
      return { date, total: parseFloat(cumulative.toFixed(2)) };
    });
  })();

  // Shared tooltip style — applied to both charts to match the dark theme
  const tooltipStyle = {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontSize: '0.8rem',
  };

  return (
    <div className="dashboard-page">
      <h2>Dashboard</h2>

      {/* KPI row — three metric cards across the top */}
      <div className="kpi-row">
        {/* <dl> (definition list) is semantically correct for label/value pairs */}
        <div className="kpi-card">
          <dl>
            <dt>Total Collection Value</dt>
            <dd className="kpi-value">${totalValue.toFixed(2)}</dd>
          </dl>
        </div>
        <div className="kpi-card">
          <dl>
            <dt>Total Cards Owned</dt>
            <dd className="kpi-value">{totalCards}</dd>
          </dl>
        </div>
        <div className="kpi-card">
          <dl>
            <dt>Decks</dt>
            <dd className="kpi-value">{decks.length}</dd>
          </dl>
        </div>
      </div>

      <div className="charts">
        {/* Bar Chart — top 10 cards by value */}
        <div className="chart-card">
          <h3>Top 10 Cards by Value</h3>
          {barData.length === 0
            ? <p className="empty-state">Add cards to your collection to see this chart.</p>
            : (
              // ResponsiveContainer makes the chart fill its parent's width
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 4, right: 16, left: 0, bottom: 60 }}>
                  {/* XAxis reads the "name" field from each data point */}
                  <XAxis dataKey="name" tick={{ fill: '#8b8fa8', fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                  {/* tickFormatter adds a $ prefix to Y-axis labels */}
                  <YAxis tickFormatter={(v) => `$${v}`} tick={{ fill: '#8b8fa8', fontSize: 11 }} />
                  <Tooltip formatter={(v) => `$${(v ?? 0).toFixed(2)}`} contentStyle={tooltipStyle} />
                  {/* Bar reads the "value" field and renders in gold */}
                  <Bar dataKey="value" fill="#c9a84c" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* Line Chart — cumulative spend over time */}
        <div className="chart-card">
          <h3>Cumulative Spend Over Time</h3>
          {lineData.length === 0
            ? <p className="empty-state">Add cards to your collection to see this chart.</p>
            : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={lineData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  {/* CartesianGrid adds the subtle background grid lines */}
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e3248" />
                  {/* XAxis reads the "date" field; YAxis reads "total" */}
                  <XAxis dataKey="date" tick={{ fill: '#8b8fa8', fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${v}`} tick={{ fill: '#8b8fa8', fontSize: 11 }} />
                  <Tooltip formatter={(v) => `$${(v ?? 0).toFixed(2)}`} contentStyle={tooltipStyle} />
                  {/* type="monotone" draws smooth curves; dot={false} hides individual data points */}
                  <Line type="monotone" dataKey="total" stroke="#c9a84c" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
        </div>
      </div>
    </div>
  );
}
