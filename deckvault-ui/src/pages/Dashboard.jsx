import { useState, useEffect } from 'react';
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

  useEffect(() => {
    getCollection().then(setCollection).catch(console.error);
    getDecks().then(setDecks).catch(console.error);
  }, []);

  const totalValue = collection.reduce((sum, e) => sum + e.quantity * (e.purchasePrice ?? 0), 0);
  const totalCards = collection.reduce((sum, e) => sum + e.quantity, 0);

  const barData = [...collection]
    .map((e) => ({ name: e.cardName, value: e.quantity * (e.purchasePrice ?? 0) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const lineData = (() => {
    const byDate = collection.reduce((acc, e) => {
      const spend = e.quantity * (e.purchasePrice ?? 0);
      acc[e.purchaseDate] = (acc[e.purchaseDate] ?? 0) + spend;
      return acc;
    }, {});
    const sorted = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
    let cumulative = 0;
    return sorted.map(([date, spend]) => {
      cumulative += spend;
      return { date, total: parseFloat(cumulative.toFixed(2)) };
    });
  })();

  const tooltipStyle = {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontSize: '0.8rem',
  };

  return (
    <div className="dashboard-page">
      <h2>Dashboard</h2>

      <div className="kpi-row">
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
        <div className="chart-card">
          <h3>Top 10 Cards by Value</h3>
          {barData.length === 0
            ? <p className="empty-state">Add cards to your collection to see this chart.</p>
            : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 4, right: 16, left: 0, bottom: 60 }}>
                  <XAxis dataKey="name" tick={{ fill: '#8b8fa8', fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tickFormatter={(v) => `$${v}`} tick={{ fill: '#8b8fa8', fontSize: 11 }} />
                  <Tooltip formatter={(v) => `$${(v ?? 0).toFixed(2)}`} contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="#c9a84c" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>

        <div className="chart-card">
          <h3>Cumulative Spend Over Time</h3>
          {lineData.length === 0
            ? <p className="empty-state">Add cards to your collection to see this chart.</p>
            : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={lineData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e3248" />
                  <XAxis dataKey="date" tick={{ fill: '#8b8fa8', fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${v}`} tick={{ fill: '#8b8fa8', fontSize: 11 }} />
                  <Tooltip formatter={(v) => `$${(v ?? 0).toFixed(2)}`} contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="total" stroke="#c9a84c" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
        </div>
      </div>
    </div>
  );
}
