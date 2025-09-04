import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { auth, db } from "./services/firebase";
import Enforcement from "./pages/Enforcement";
import { doc, getDoc } from "firebase/firestore";
import Cenro from "./pages/Cenro";
import SignIn from "./sign-in-side/SignInSide";

function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // fetch role from Firestore
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data().role);
        }
      } else {
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
        {/* Login route */}
        <Route
          path="/login"
          element={
            user ? (
              role === "enforcement" ? (
                <Navigate to="/enforcement" />
              ) : role === "cenro" ? (
                <Navigate to="/cenro" />
              ) : (
                <div>loading...</div>
              )
            ) : (
              <SignIn />
            )
          }
        />

        {/* Enforcement page */}
        <Route
          path="/enforcement"
          element={
            user && role === "enforcement" ? (
              <Enforcement />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Cenro page */}
        <Route
          path="/cenro"
          element={
            user && role === "cenro" ? <Cenro /> : <Navigate to="/login" />
          }
        />

        {/* Fallback */}
        <Route
          path="*"
          element={
            user ? (
              role === "enforcement" ? (
                <Navigate to="/enforcement" />
              ) : role === "cenro" ? (
                <Navigate to="/cenro" />
              ) : (
                <Navigate to="/login" />
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
