import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Auth from '../components/auth/Auth';
import DashboardPage from '../pages/DashboardPage';
import MapPage from '../pages/MapPage';

// A component to protect routes that require authentication
const ProtectedRoute = ({ session }) => {
  if (!session) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};

// The main layout that includes the header and navigation
const AppLayout = ({ session, handleLogout }) => {
  const location = useLocation();
  const getLinkClass = (path) => {
    return location.pathname === path 
      ? 'text-primary font-bold'
      : 'text-muted-foreground hover:text-primary';
  };

  return (
    <div className="container mx-auto p-4">
      <header className="flex justify-between items-center mb-8 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold text-primary">Halo</h1>
        <nav className="flex items-center gap-6 text-lg">
          <Link to="/dashboard" className={getLinkClass('/dashboard')}>Dashboard</Link>
          <Link to="/map" className={getLinkClass('/map')}>Map</Link>
        </nav>
        <div className='flex items-center gap-4'>
          <p className="text-muted-foreground">{session.user.email}</p>
          <button 
            onClick={handleLogout} 
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
};

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div>Loading...</div>; // Or a proper spinner component
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Routes>
        <Route path="/" element={!session ? <Auth /> : <Navigate to="/dashboard" />} />
        {/* Debug route for map testing - bypasses authentication */}
        <Route path="/map-test" element={<MapPage />} />
        <Route element={<ProtectedRoute session={session} />}>
          <Route element={<AppLayout session={session} handleLogout={handleLogout} />}>
            <Route path="/dashboard" element={<DashboardPage user={session?.user} />} />
            <Route path="/map" element={<MapPage />} />
          </Route>
        </Route>
      </Routes>
    </div>
  );
}

export default App;

