// ResultModal.js
// A themed modal that shows the backend's pipeline analysis (or an error).
// Replaces a plain window.alert() so the result matches the app's design.

export function ResultModal({ result, error, onClose }) {
  const isError = !!error;

  return (
    <div className="vs-modal__overlay" onClick={onClose}>
      <div className="vs-modal" onClick={(e) => e.stopPropagation()}>
        {isError ? (
          <>
            <div className="vs-modal__title">Couldn’t analyze the pipeline</div>
            <p className="vs-modal__msg">{error}</p>
            <p className="vs-modal__hint">
              Is the backend running on port 8000? Start it with{' '}
              <code>uvicorn main:app --reload</code>.
            </p>
          </>
        ) : (
          <>
            <div className="vs-modal__title">
              {result.is_dag ? 'Valid pipeline' : 'Pipeline has a cycle'}
            </div>

            <div className="vs-modal__stats">
              <div className="vs-stat">
                <span className="vs-stat__num">{result.num_nodes}</span>
                <span className="vs-stat__label">Nodes</span>
              </div>
              <div className="vs-stat">
                <span className="vs-stat__num">{result.num_edges}</span>
                <span className="vs-stat__label">Edges</span>
              </div>
              <div className="vs-stat">
                <span className="vs-stat__num">{result.is_dag ? 'Yes' : 'No'}</span>
                <span className="vs-stat__label">Is DAG</span>
              </div>
            </div>

            <p className="vs-modal__msg">
              {result.is_dag
                ? 'Your nodes and edges form a valid directed acyclic graph — good to run.'
                : 'Your pipeline contains a cycle, so it is not a valid DAG. Remove the loop and try again.'}
            </p>
          </>
        )}

        <button type="button" className="vs-modal__close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
