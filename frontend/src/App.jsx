import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Landing from "./pages/Landing";
import Checker from "./pages/Checker";
import Profile from "./pages/Profile";
import StudentMessages from "./pages/StudentMessages";
import AdminLogin from "./pages/AdminLogin";
import AdminMessages from "./pages/AdminMessages";
import AdminUsers from "./pages/AdminUsers";
import AdminDictionaryAdd from "./pages/AdminDictionaryAdd";
import Navbar from "./components/Navbar"; 

// This helper component hides the Navbar on Auth pages
function Layout({ children }) {
  const location = useLocation();
  const authPaths = ['/login', '/signup', '/', '/admin/login'];
  const showNavbar = !authPaths.includes(location.pathname) && !location.pathname.startsWith('/admin');

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
          <Route path="/messages" element={<StudentMessages />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/messages" element={<AdminMessages />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/dictionary/add" element={<AdminDictionaryAdd />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;