import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { auth, db } from "./services/firebase";
import { doc, getDoc } from "firebase/firestore";
import Enforcement from "./pages/Enforcement";
import Cenro from "./pages/Cenro";
import SignIn from "./sign-in-side/SignInSide";

function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // 🔑 Get user role from Firestore
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setRole(docSnap.data().role);
        } else {
          setRole(null);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <Routes>
        {/* Login Route */}
        <Route
          path="/login"
          element={
            user ? (
              role === "enforcement" ? (
                <Navigate to="/enforcement" />
              ) : role === "cenro" ? (
                <Navigate to="/cenro" />
              ) : (
                <Navigate to="/" />
              )
            ) : (
              <SignIn />
            )
          }
        />

        {/* Role-based protected routes */}
        <Route
          path="/enforcement"
          element={user && role === "enforcement" ? <Enforcement /> : <Navigate to="/login" />}
        />
        <Route
          path="/cenro"
          element={user && role === "cenro" ? <Cenro /> : <Navigate to="/login" />}
        />

        {/* Catch-all */}
        <Route
          path="*"
          element={
            user ? (
              role === "enforcement" ? (
                <Navigate to="/enforcement" />
              ) : role === "cenro" ? (
                <Navigate to="/cenro" />
              ) : (
                <Navigate to="/" />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
