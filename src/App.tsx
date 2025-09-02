import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { auth } from "./services/firebase";
import Enforcement from "./pages/Enforcement";
import SignIn from "./sign-in-side/SignInSide";

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(currentUser => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/enforcement" /> : <SignIn />} />
        <Route path="/enforcement" element={user ? <Enforcement /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={user ? "/enforcement" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;
