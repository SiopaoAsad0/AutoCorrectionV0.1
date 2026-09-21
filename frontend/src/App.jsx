import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Landing from "./pages/Landing";
import Checker from "./pages/Checker";
import Profile from "./pages/Profile";
import StudentMessages from "./pages/StudentMessages";
import AdminLogin from "./pages/AdminLogin";
import AdminMessages from "./pages/AdminMessages";
import AdminUsers from "./pages/AdminUsers";
import AdminDictionaryAdd from "./pages/AdminDictionaryAdd";
import AdminReports from "./pages/AdminReports";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

// This helper component hides the Navbar on Auth pages
function Layout({ children }) {
  const location = useLocation();
  const authPaths = ['/login', '/signup', '/', '/admin/login', '/forgot-password', '/reset-password'];
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
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/checker" element={<ProtectedRoute type="student"><Checker /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute type="student"><Profile /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute type="student"><StudentMessages /></ProtectedRoute>} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/messages" element={<ProtectedRoute type="admin"><AdminMessages /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute type="admin"><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/dictionary/add" element={<ProtectedRoute type="admin"><AdminDictionaryAdd /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute type="admin"><AdminReports /></ProtectedRoute>} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
