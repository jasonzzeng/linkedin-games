import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Home } from './pages/Home';

// Each game is its own chunk — dnd-kit only downloads if you open Crossclimb.
const Tango = lazy(() => import('./games/tango/TangoGame'));
const Zip = lazy(() => import('./games/zip/ZipGame'));
const Crossclimb = lazy(() => import('./games/crossclimb/CrossclimbGame'));
const Sudoku = lazy(() => import('./games/sudoku/SudokuGame'));
const Queens = lazy(() => import('./games/queens/QueensGame'));

function Loading() {
  return (
    <div className="flex min-h-full items-center justify-center bg-ground">
      <div className="text-sm font-medium text-faint">Loading…</div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tango" element={<Tango />} />
          <Route path="/zip" element={<Zip />} />
          <Route path="/crossclimb" element={<Crossclimb />} />
          <Route path="/sudoku" element={<Sudoku />} />
          <Route path="/queens" element={<Queens />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
