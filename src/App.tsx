import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Monitor from './pages/Monitor';
import Consultation from './pages/Consultation';
import Reports from './pages/Reports';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/monitor/:studentId" element={<Monitor />} />
          <Route path="/consultation/:studentId" element={<Consultation />} />
          <Route path="/reports/:studentId" element={<Reports />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
