// NodeField.js
// Renders a single form field inside a node based on its `kind`.
// This is the ONLY place that knows how to draw each field type, so adding a
// new field kind = adding a case here (never touching individual node files).

export function NodeField({ field, value, onChange }) {
  const { kind, label, options, min, max, step, placeholder } = field;

  const control = renderControl();

  // checkbox reads best with the label to the right of the box
  if (kind === 'checkbox') {
    return (
      <label className="vs-field vs-field--inline">
        {control}
        <span className="vs-field__label">{label}</span>
      </label>
    );
  }

  return (
    <label className="vs-field">
      {label ? <span className="vs-field__label">{label}</span> : null}
      {control}
    </label>
  );

  function renderControl() {
    switch (kind) {
      case 'textarea':
        return (
          <textarea
            className="vs-input nodrag"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case 'select':
        return (
          <select className="vs-input nodrag" value={value} onChange={(e) => onChange(e.target.value)}>
            {(options || []).map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        );

      case 'number':
        return (
          <input
            className="vs-input nodrag"
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case 'slider':
        return (
          <div className="vs-slider nodrag">
            <input
              type="range"
              value={value}
              min={min ?? 0}
              max={max ?? 1}
              step={step ?? 0.1}
              onChange={(e) => onChange(e.target.value)}
            />
            <span className="vs-slider__val">{value}</span>
          </div>
        );

      case 'checkbox':
        return (
          <input
            className="nodrag"
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
          />
        );

      case 'text':
      default:
        return (
          <input
            className="vs-input nodrag"
            type="text"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  }
}
