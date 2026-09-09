import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./components/Toast";
import { ProtectedRoute } from "./layouts/ProtectedRoute";

import { Splash } from "./pages/Splash";
import { Onboarding } from "./pages/Onboarding";
import { Login } from "./pages/Login";
import { SignUp } from "./pages/SignUp";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { Home } from "./pages/Home";
import { Explore } from "./pages/Explore";
import { Make } from "./pages/Make";
import { CreatePost } from "./pages/CreatePost";
import { RushCompose } from "./pages/RushCompose";
import { Rush } from "./pages/Rush";
import { MomentCompose } from "./pages/MomentCompose";
import { Notifications } from "./pages/Notifications";
import { Profile } from "./pages/Profile";
import { OtherUserProfile } from "./pages/OtherUserProfile";
import { Messages } from "./pages/Messages";
import { Chat } from "./pages/Chat";
import { FlicksyAI } from "./pages/FlicksyAI";
import { Settings } from "./pages/Settings";
import { Admin } from "./pages/Admin";

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Splash />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected — final bottom nav: Stream | Discover | Make | Rush | Space */}
            <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
            <Route path="/create" element={<ProtectedRoute><Make /></ProtectedRoute>} />
            <Route path="/create/flick" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
            <Route path="/create/rush" element={<ProtectedRoute><RushCompose /></ProtectedRoute>} />
            <Route path="/create/moment" element={<ProtectedRoute><MomentCompose /></ProtectedRoute>} />
            <Route path="/rush" element={<ProtectedRoute><Rush /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/users/:userId" element={<ProtectedRoute><OtherUserProfile /></ProtectedRoute>} />
            <Route path="/flicksy-ai" element={<ProtectedRoute><FlicksyAI /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            >
              <Route path=":conversationId" element={<Chat />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
