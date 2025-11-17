// src/App.jsx
import React, { useState, useRef, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import PetzyLanding from "./components/PetzyLanding";
import BackgroundParticles from "./components/BackgroundParticles";
import LeftSidebar from "./components/LeftSidebar";
import MainContent from "./components/MainContent";
import RightSidebar from "./components/RightSidebar";
import PetModel from "./components/PetModel";
import Game1 from "./components/games/Game1";
import Game2 from "./components/games/Game2";
import Game3 from "./components/games/Game3";
import Game4 from "./components/games/Game4";
import Dashboard from "./components/Dashboard";

// lazy-load the selector page to avoid circular-init problems
const PetModelSelectPage = lazy(() => import("./components/PetModelSelectPage"));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div>Loading…</div>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const petRef = useRef();

  // Authenticated layout (extracted for clarity)
  const AuthenticatedLayout = (
    <div className="grid grid-cols-[290px_1fr_290px] h-screen gap-0">
      <LeftSidebar />
      <div className="relative w-full h-full">
        <PetModel ref={petRef} className="absolute inset-0" />
        <MainContent petRef={petRef} />
      </div>
      <RightSidebar petRef={petRef} />
    </div>
  );

  return (
    <Router>
      <div
        className={`font-['Space_Grotesk'] bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-800 ${
          isAuthenticated ? "h-screen overflow-hidden" : ""
        }`}
      >
        <BackgroundParticles />

        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Root path: render landing if not authenticated, otherwise app */}
            <Route
              path="/"
              element={
                !isAuthenticated ? (
                  <PetzyLanding setIsAuthenticated={setIsAuthenticated} />
                ) : (
                  AuthenticatedLayout
                )
              }
            />

            {/* Pet model selector must be reachable even when not authenticated */}
            <Route path="/select-pet" element={<PetModelSelectPage />} />

            {/* Games and other pages (accessible when authenticated normally) */}
            <Route
              path="/game1"
              element={
                <Game1
                  onGameFinished={() => {
                    if (petRef.current?.handlePlayFinished) {
                      petRef.current.handlePlayFinished();
                    }
                  }}
                />
              }
            />
            <Route
              path="/game2"
              element={
                <Game2
                  onGameFinished={() => {
                    if (petRef.current?.handlePlayFinished) {
                      petRef.current.handlePlayFinished();
                    }
                  }}
                />
              }
            />
            <Route
              path="/game3"
              element={
                <Game3
                  onGameFinished={() => {
                    if (petRef.current?.handlePlayFinished) {
                      petRef.current.handlePlayFinished();
                    }
                  }}
                />
              }
            />
            <Route
              path="/game4"
              element={
                <Game4
                  onGameFinished={() => {
                    if (petRef.current?.handlePlayFinished) {
                      petRef.current.handlePlayFinished();
                    }
                  }}
                />
              }
            />

            <Route path="/Dashboard" element={<Dashboard />} />

            {/* convenience routes */}
            <Route path="/landing" element={<PetzyLanding setIsAuthenticated={setIsAuthenticated} />} />
            <Route path="/sidebar" element={<LeftSidebar />} />
            
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
