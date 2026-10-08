import type { useFarm } from "../use-farm";
import type { Outfit } from "../types";
import { Farmer } from "./sprites";

type Props = Pick<
  ReturnType<typeof useFarm>,
  | "setScreen"
  | "message"
  | "setMessage"
  | "busy"
  | "minutes"
  | "setMinutes"
  | "displayMode"
  | "setDisplayMode"
  | "mode"
  | "setMode"
  | "outfit"
  | "setOutfit"
  | "setGachaOpen"
  | "setEggStage"
  | "setNewPet"
  | "farm"
>;

/** Displays the setup screen; state changes are delegated to the farm controller. */
export function SetupScreen({
  setScreen,
  message,
  setMessage,
  busy,
  minutes,
  setMinutes,
  displayMode,
  setDisplayMode,
  mode,
  setMode,
  outfit,
  setOutfit,
  setGachaOpen,
  setEggStage,
  setNewPet,
  farm,
}: Props) {
  return (
    <section className="card centered">
      <div className="eyebrow">YOUR NEXT HARVEST</div>
      <h1>Ready to focus?</h1>
      <div className="sprite-stage">
        <div className="stage-ground" />
        <Farmer color={outfit} />
      </div>
      <div className="form-grid">
        <label>
          Focus duration <span>(minutes)</span>
          <input
            type="number"
            min="0.1"
            max="180"
            step="0.1"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
          />
        </label>
        <label>
          Timer display
          <select
            value={displayMode}
            onChange={(e) => setDisplayMode(e.target.value as "down" | "up")}
          >
            <option value="down">Count down</option>
            <option value="up">Count up</option>
          </select>
        </label>
        <label>
          Mode
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "regular" | "hard")}
          >
            <option value="regular">Regular</option>
            <option value="hard">Hard</option>
          </select>
        </label>
      </div>
      {mode === "hard" && (
        <p className="fineprint">
          Hard Mode adds 50% coins and a 30% chance for 30 lucky coins.
        </p>
      )}
      <p className="outfit-label">Choose your outfit</p>
      <div className="outfit-row">
        {(["blue", "green", "red"] as Outfit[]).map((color) => (
          <button
            key={color}
            className={`outfit-option ${outfit === color ? "selected" : ""}`}
            aria-label={`${color} outfit`}
            aria-pressed={outfit === color}
            onClick={() => setOutfit(color)}
          >
            <Farmer color={color} size={55} />
            <span>{color}</span>
          </button>
        ))}
      </div>
      <button className="primary big full" disabled={busy} onClick={farm}>
        FARM ✦
      </button>
      <button
        className="secondary full"
        onClick={() => {
          setGachaOpen(true);
          setEggStage("idle");
          setNewPet(null);
          setMessage("");
        }}
      >
        🥚 Open Egg Gacha
      </button>
      <button className="text-button" onClick={() => setScreen("collection")}>
        My Penguins →
      </button>
      {message && <p className="notice">{message}</p>}
    </section>
  );
}
