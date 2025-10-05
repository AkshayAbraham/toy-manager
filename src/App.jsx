// src/App.jsx
import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { supabase } from "./supabaseClient";
import Login from "./Login";
import ToyCollectionPage from "./ToyCollectionPage";
import ToyForm from "./ToyForm";
import ToyDetailsPage from "./ToyDetailsPage";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<ToyCollectionPage onLogout={handleLogout} />} />
        <Route path="/add-toy" element={<ToyForm />} />
        <Route path="/toy/:toyId" element={<ToyDetailsPage />} />
        <Route path="/edit-toy/:toyId" element={<ToyForm />} /> 
      </Routes>
    </Router>
  );
}

export default App;