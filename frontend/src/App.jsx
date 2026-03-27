import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Landing from "./pages/Landing";
import Checker from "./pages/Checker";
import Profile from "./pages/Profile";
import Navbar from "./components/Navbar"; 

// This helper component hides the Navbar on Auth pages
function Layout({ children }) {
  const location = useLocation();
  const authPaths = ['/login', '/signup', '/'];
  const showNavbar = !authPaths.includes(location.pathname);

  return (
    <>
      {showNavbar && <Navbar />}
      {children}
    </>
  );
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/checker" element={<Checker />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;