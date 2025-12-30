import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import QuestionManager from './pages/QuestionManager';
import ExamGenerator from './pages/ExamGenerator';
import MatrixBuilder from './pages/MatrixBuilder';
import Layout from './components/Layout';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        {/* The Dashboard is a standalone landing page */}
        <Route path="/" element={<Dashboard />} />
        
        {/* Inner pages share a common Layout */}
        <Route element={<Layout />}>
          <Route path="/questions" element={<QuestionManager />} />
          <Route path="/create-exam" element={<ExamGenerator />} />
          <Route path="/matrix" element={<MatrixBuilder />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;