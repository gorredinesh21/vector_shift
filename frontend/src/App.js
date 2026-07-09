import { Workflow } from 'lucide-react';
import { PipelineToolbar } from './toolbar';
import { PipelineUI } from './ui';
import { SubmitButton } from './submit';
import { HistoryControls } from './HistoryControls';

function App() {
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
          <SubmitButton />
        </div>
      </header>

      <main className="vs-stage">
        <PipelineUI />
      </main>

      <PipelineToolbar />
    </div>
  );
}

export default App;
