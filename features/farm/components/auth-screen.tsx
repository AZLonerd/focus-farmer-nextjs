import type { useFarm } from "../use-farm";
import { asset } from "../constants";

type Props = Pick<
  ReturnType<typeof useFarm>,
  | "screen"
  | "setScreen"
  | "email"
  | "setEmail"
  | "password"
  | "setPassword"
  | "message"
  | "setMessage"
  | "busy"
  | "authenticate"
>;

/** Renders the farm authentication form. */
export function AuthScreen({
  screen,
  setScreen,
  email,
  setEmail,
  password,
  setPassword,
  message,
  setMessage,
  busy,
  authenticate,
}: Props) {
  return (
    <section className="card auth centered">
      <img
        className="auth-art"
        src={asset("title-screenhd.png")}
        alt="Focus Farmer"
      />
      <h1>{screen === "signup" ? "Join the farm" : "Welcome, Farmer"}</h1>
      <p className="subtle">
        {screen === "signup"
          ? "Create an account to save every harvest."
          : "Log in to pick up where you left off."}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void authenticate(screen === "signup" ? "signup" : "login");
        }}
      >
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={
              screen === "signup" ? "new-password" : "current-password"
            }
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="primary full" disabled={busy}>
          {busy ? "Working..." : screen === "signup" ? "SIGN UP" : "LOG IN"}
        </button>
      </form>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <button
        className="text-button"
        onClick={() => {
          setScreen(screen === "signup" ? "login" : "signup");
          setMessage("");
        }}
      >
        {screen === "signup"
          ? "Already have an account? Log in"
          : "New here? Sign up"}
      </button>
      <button
        className="text-button muted-link"
        onClick={() => setScreen("landing")}
      >
        Back to title
      </button>
    </section>
  );
}
