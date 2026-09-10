import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './components/AuthProvider'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import OpenLobbyBoard from './pages/OpenLobbyBoard'
import CreateLobby from './pages/CreateLobby'
import MyLobbies from './pages/MyLobbies'
import TeamDirectory from './pages/TeamDirectory'
import CreateTeam from './pages/CreateTeam'
import TeamProfile from './pages/TeamProfile'
import MatchHistory from './pages/MatchHistory'
import MatchDetail from './pages/MatchDetail'
import Settings from './pages/Settings'
import PlayerProfile from './pages/PlayerProfile'
import LobbyDetail from './pages/LobbyDetail'
import Terms from './pages/Terms'
import Admin from './pages/Admin'
import Landing from './pages/Landing'
import NotFound from './pages/NotFound'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

function PageTransitionLayout({ children }) {
  const location = useLocation()

  return (
    <div
      key={location.pathname}
      className="animate-content-settle min-h-screen flex flex-col flex-1 bg-transparent overflow-x-hidden"
    >
      {children}
    </div>
  )
}

function HomeRoute() {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-cream">
        <div className="font-headline-lg text-ink-black animate-pulse uppercase text-4xl">Loading...</div>
      </div>
    )
  }

  if (session) {
    if (!profile || !profile.display_name) {
      return <Navigate to="/onboarding" replace />
    }
    return <Dashboard />
  }

  return <Landing />
}

function RequireAuth({ children }) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-paper-cream"><div className="font-headline-lg text-ink-black animate-pulse uppercase text-4xl">Loading...</div></div>
  }
  
  if (!session) {
    return <Navigate to="/login" replace />
  }

  // If user has no profile or no display_name, they must go to onboarding
  if ((!profile || !profile.display_name) && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  // If user is already onboarded and tries to access onboarding, send to dashboard
  if (profile && profile.display_name && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />
  }

  return children
}

function RequireAdmin({ children }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-paper-cream"><div className="font-headline-lg text-ink-black animate-pulse uppercase text-4xl">Loading...</div></div>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!profile?.is_admin) {
    return <Navigate to="/" replace />
  }

  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <PageTransitionLayout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/onboarding" 
              element={
                <RequireAuth>
                  <Onboarding />
                </RequireAuth>
              } 
            />
            <Route 
              path="/board" 
              element={
                <RequireAuth>
                  <OpenLobbyBoard />
                </RequireAuth>
              } 
            />
            <Route 
              path="/teams" 
              element={
                <RequireAuth>
                  <TeamDirectory />
                </RequireAuth>
              } 
            />
            <Route 
              path="/teams/new" 
              element={
                <RequireAuth>
                  <CreateTeam />
                </RequireAuth>
              } 
            />
            <Route 
              path="/team/:id" 
              element={
                <RequireAuth>
                  <TeamProfile />
                </RequireAuth>
              } 
            />
            <Route 
              path="/matches" 
              element={
                <RequireAuth>
                  <MatchHistory />
                </RequireAuth>
              } 
            />
            <Route 
              path="/match/:id" 
              element={
                <RequireAuth>
                  <MatchDetail />
                </RequireAuth>
              } 
            />
            <Route 
              path="/my-lobbies" 
              element={
                <RequireAuth>
                  <MyLobbies />
                </RequireAuth>
              } 
            />
            <Route 
              path="/create-lobby" 
              element={
                <RequireAuth>
                  <CreateLobby />
                </RequireAuth>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <RequireAuth>
                  <Settings />
                </RequireAuth>
              } 
            />
            <Route 
              path="/player/:id" 
              element={
                <RequireAuth>
                  <PlayerProfile />
                </RequireAuth>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <RequireAuth>
                  <PlayerProfile />
                </RequireAuth>
              } 
            />
            <Route 
              path="/lobby/:id" 
              element={
                <RequireAuth>
                  <LobbyDetail />
                </RequireAuth>
              } 
            />
            <Route 
              path="/" 
              element={<HomeRoute />} 
            />
            <Route 
              path="/admin" 
              element={
                <RequireAdmin>
                  <Admin />
                </RequireAdmin>
              } 
            />
            <Route path="/terms" element={<Terms />} />
            {/* Fallback route for all unmatched URLs */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PageTransitionLayout>
      </Router>
    </AuthProvider>
  )
}
