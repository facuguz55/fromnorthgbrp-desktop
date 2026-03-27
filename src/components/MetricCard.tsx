import React from 'react';
import './MetricCard.css';

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  subtitle?: string;
  currency?: string;
}

export default function MetricCard({ title, value, trend, icon, subtitle, currency }: MetricCardProps) {
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;

  return (
    <div className="metric-card glass-panel">
      <div className="metric-header">
        <h3 className="metric-title">{title}</h3>
        <div className="metric-icon">{icon}</div>
      </div>
      <div className="metric-body">
        {currency && <span className="metric-currency">{currency}</span>}
        <div className="metric-value">{value}</div>
        {subtitle && <div className="metric-subtitle">{subtitle}</div>}
        {trend !== undefined && (
          <div className={`metric-trend ${isPositive ? 'trend-up' : isNegative ? 'trend-down' : 'trend-neutral'}`}>
            {isPositive ? '+' : ''}{trend}%
            <span className="trend-label"> from last month</span>
          </div>
        )}
      </div>
    </div>
  );
}
