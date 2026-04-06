import { useMonth } from '../context/MonthContext';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

interface Props {
  availableMonths?: string[];
}

export default function MonthSelector({ availableMonths }: Props) {
  const { selectedMonth, setSelectedMonth } = useMonth();

  const AR_OFFSET = -3 * 60 * 60 * 1000;
  const nowAR = new Date(Date.now() + AR_OFFSET);
  const currentYear = nowAR.getUTCFullYear();
  const currentMonth = nowAR.getUTCMonth() + 1;

  const hasLastYear = availableMonths?.some(k => parseInt(k.split('-')[0]) < currentYear) ?? false;
  const years = hasLastYear ? [currentYear - 1, currentYear] : [currentYear];

  const months = years.flatMap(year =>
    Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const isFuture = year > currentYear || (year === currentYear && m > currentMonth);
      return {
        key: `${year}-${String(m).padStart(2, '0')}`,
        label: `${MESES[m - 1]} ${year}`,
        disabled: isFuture,
        month: m,
        year,
      };
    })
  );

  const selectedKey = `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}`;

  return (
    <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>
      {months.map(({ key, label, disabled, month, year }) => {
        const isActive = key === selectedKey;
        return (
          <button
            key={key}
            onClick={() => { if (!disabled) setSelectedMonth({ month, year }); }}
            disabled={disabled}
            style={{
              padding: '0.35rem 0.9rem',
              borderRadius: '999px',
              border: '1px solid',
              borderColor: isActive ? 'var(--accent-primary)' : 'var(--border-color)',
              background: isActive ? 'rgba(6,182,212,0.12)' : 'transparent',
              color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: isActive ? 600 : 400,
              cursor: disabled ? 'default' : 'pointer',
              opacity: disabled ? 0.35 : 1,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'border-color 0.15s, color 0.15s, background 0.15s',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
