import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./components/Toast";
import { ProtectedRoute } from "./layouts/ProtectedRoute";
import { VerifiedRoute } from "./layouts/VerifiedRoute";

import { Splash } from "./pages/Splash";
import { Onboarding } from "./pages/Onboarding";
import { Login } from "./pages/Login";
import { SignUp } from "./pages/SignUp";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { VerifyEmail } from "./pages/VerifyEmail";
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
import { ShareSpace } from "./pages/ShareSpace";
import { PostPermalink } from "./pages/PostPermalink";
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
            {/* Auth-only (not VerifiedRoute) — an unverified user must be able to land here
                without being bounced right back to itself. */}
            <Route path="/verify-email" element={<ProtectedRoute><VerifyEmail /></ProtectedRoute>} />

            {/* Protected — final bottom nav: Stream | Discover | Make | Rush | Space */}
            <Route path="/home" element={<VerifiedRoute><Home /></VerifiedRoute>} />
            <Route path="/explore" element={<VerifiedRoute><Explore /></VerifiedRoute>} />
            <Route path="/create" element={<VerifiedRoute><Make /></VerifiedRoute>} />
            <Route path="/create/flick" element={<VerifiedRoute><CreatePost /></VerifiedRoute>} />
            <Route path="/create/rush" element={<VerifiedRoute><RushCompose /></VerifiedRoute>} />
            <Route path="/create/moment" element={<VerifiedRoute><MomentCompose /></VerifiedRoute>} />
            <Route path="/rush" element={<VerifiedRoute><Rush /></VerifiedRoute>} />
            <Route path="/notifications" element={<VerifiedRoute><Notifications /></VerifiedRoute>} />
            <Route path="/profile" element={<VerifiedRoute><Profile /></VerifiedRoute>} />
            <Route path="/space/share" element={<VerifiedRoute><ShareSpace /></VerifiedRoute>} />
            <Route path="/p/:postId" element={<VerifiedRoute><PostPermalink /></VerifiedRoute>} />
            <Route path="/r/:postId" element={<VerifiedRoute><PostPermalink /></VerifiedRoute>} />
            <Route path="/users/:userId" element={<VerifiedRoute><OtherUserProfile /></VerifiedRoute>} />
            <Route path="/flicksy-ai" element={<VerifiedRoute><FlicksyAI /></VerifiedRoute>} />
            <Route path="/settings" element={<VerifiedRoute><Settings /></VerifiedRoute>} />
            <Route path="/admin" element={<VerifiedRoute><Admin /></VerifiedRoute>} />
            <Route
              path="/messages"
              element={
                <VerifiedRoute>
                  <Messages />
                </VerifiedRoute>
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