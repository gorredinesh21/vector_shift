import { useState } from 'react';
import { Workflow, BookOpen, FolderOpen } from 'lucide-react';
import { PipelineToolbar } from './toolbar';
import { PipelineUI } from './ui';
import { SubmitButton } from './submit';
import { RunButton } from './RunButton';
import { HistoryControls } from './HistoryControls';
import { NodeGuide } from './NodeGuide';
import { PipelinesPanel } from './PipelinesPanel';

function App() {
  const [guideOpen, setGuideOpen] = useState(false);
  const [pipesOpen, setPipesOpen] = useState(false);

  return (
    <div className="vs-app">
      <header className="vs-header">
        <div className="vs-brand">
          <Workflow size={20} className="vs-brand__mark" />
          <span className="vs-brand__name">VectorShift</span>
          <span className="vs-brand__sub">Pipeline Builder</span>
        </div>
        <div className="vs-header__actions">
          <HistoryControls />
          <button
            type="button"
            className="vs-icon-btn"
            onClick={() => setGuideOpen(true)}
            title="Node Guide"
            aria-label="Node Guide"
          >
            <BookOpen size={16} />
          </button>
          <button
            type="button"
            className="vs-icon-btn"
            onClick={() => setPipesOpen(true)}
            title="Save / load pipelines"
            aria-label="Pipelines"
          >
            <FolderOpen size={16} />
          </button>
          <RunButton />
          <SubmitButton />
        </div>
      </header>

      <main className="vs-stage">
        <PipelineUI />
      </main>

      <PipelineToolbar />

      {guideOpen && <NodeGuide onClose={() => setGuideOpen(false)} />}
      {pipesOpen && <PipelinesPanel onClose={() => setPipesOpen(false)} />}
    </div>
  );
}

export default App;
