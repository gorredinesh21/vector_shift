// textNode.js
// Custom body for the Text node, plugged into BaseNode via the `renderBody`
// escape hatch (see definitions.js). Part 1 provides a basic textarea; Part 3
// adds auto-resize and dynamic {{ variable }} → Handle logic here.

export function TextNodeBody({ setField, values }) {
  const text = values.text ?? '';

  return (
    <div className="vs-textnode">
      <label className="vs-field">
        <span className="vs-field__label">Text</span>
        <textarea
          className="vs-input vs-textnode__area"
          value={text}
          onChange={(e) => setField('text', e.target.value)}
        />
      </label>
    </div>
  );
}
