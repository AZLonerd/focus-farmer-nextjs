"use client";

import { AuthScreen } from "./auth-screen";
import { GachaDialog } from "./gacha-dialog";
import { WalkthroughDialog } from "./walkthrough-dialog";
import { SetupScreen } from "./setup-screen";
import { FocusScreen } from "./focus-screen";
import { SummaryScreen } from "./summary-screen";
import { RestScreen } from "./rest-screen";
import { CollectionScreen } from "./collection-screen";
import { useFarm } from "../use-farm";
import { asset } from "../constants";
import { Coin } from "./sprites";

/** Renders the farm screen selected by the controller and its overlays. */
export function FarmApp() {
  const farm = useFarm();
  const {
    screen,
    setScreen,
    loading,
    userId,
    message,
    setMessage,
    busy,
    progress,
    focus,
    summary,
    gachaOpen,
    walkthrough,
    logout,
  } = farm;
  return (
    <main className={`world ${progress.sessions > 0 ? "flow" : ""}`}>
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <div className="app-shell">
        {loading ? (
          <div className="card centered">Loading your farm...</div>
        ) : !userId ? (
          screen === "landing" ? (
            <section className="card intro centered">
              <img
                className="title-art"
                src={asset("title-screenhd.png")}
                alt="Focus Farmer title art"
              />
              <p>Plant your focus. Harvest your progress.</p>
              <button
                className="primary big"
                onClick={() => {
                  setScreen("login");
                  setMessage("");
                }}
              >
                START
              </button>
            </section>
          ) : (
            <AuthScreen {...farm} />
          )
        ) : screen === "welcome" ? (
          <section className="card intro centered">
            <img
              className="title-art"
              src={asset("title-screenhd.png")}
              alt="Focus Farmer"
            />
            <h1>Welcome Back, Farmer</h1>
          </section>
        ) : (
          <>
            <header className="topbar">
              <div className="brand">
                FOCUS <span>FARMER</span>
              </div>
              <div className="stats">
                <span className="stat">
                  <Coin size={22} />
                  {progress.coins}
                </span>
                <span className="stat">
                  <img src={asset("session_icon.png")} alt="" />
                  {progress.sessions}
                </span>
              </div>
              <button className="logout" disabled={busy} onClick={logout}>
                Logout
              </button>
            </header>
            {screen === "setup" && <SetupScreen {...farm} />}
            {screen === "focus" && focus && <FocusScreen {...farm} />}
            {screen === "summary" && summary && <SummaryScreen {...farm} />}
            {screen === "rest" && <RestScreen {...farm} />}
            {screen === "collection" && <CollectionScreen {...farm} />}
            {message && screen !== "setup" && (
              <p className="notice global-notice" role="status">
                {message}
              </p>
            )}
          </>
        )}
      </div>
      {gachaOpen && <GachaDialog {...farm} />}
      {walkthrough >= 0 && userId && <WalkthroughDialog {...farm} />}
    </main>
  );
}
