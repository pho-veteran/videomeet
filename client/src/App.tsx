import { StrictMode } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SocketProvider } from './contexts/SocketContext.tsx';
import Home from './pages/Home';
import Room from './pages/Room';
import NotFound from './pages/NotFound';

function App() {
  return (
    <StrictMode>
      <SocketProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/room/:roomId" element={<Room />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
          </div>
        </Router>
      </SocketProvider>
    </StrictMode>
  );
}

export default App;
