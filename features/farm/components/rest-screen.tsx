import type { useFarm } from "../use-farm";
import { tips, jokes, clock } from "../constants";
import { Farmer } from "./sprites";

type Props = Pick<
  ReturnType<typeof useFarm>,
  | "setScreen"
  | "progress"
  | "outfit"
  | "now"
  | "breakMinutes"
  | "setBreakMinutes"
  | "breakEndsAt"
  | "restLine"
  | "setRestLine"
  | "startBreak"
  | "backToFocus"
  | "breakActive"
>;

/** Displays the rest screen; state changes are delegated to the farm controller. */
export function RestScreen({
  setScreen,
  progress,
  outfit,
  now,
  breakMinutes,
  setBreakMinutes,
  breakEndsAt,
  restLine,
  setRestLine,
  startBreak,
  backToFocus,
  breakActive,
}: Props) {
  return (
    <section className="card centered">
      <div className="eyebrow">REST GROVE</div>
      <h1>Take a little breather</h1>
      <div className="sprite-stage">
        <div className="stage-ground" />
        <Farmer color={outfit} frame={4} />
      </div>
      <p className="subtle">Every good farmer needs a pause.</p>
      <label className="break-input">
        Break timer <span>(minutes)</span>
        <input
          type="number"
          min="0.1"
          max="60"
          step="0.1"
          value={breakMinutes}
          onChange={(e) => setBreakMinutes(Number(e.target.value))}
        />
      </label>
      {breakEndsAt && (
        <div className="break-clock">
          {breakActive ? clock(breakEndsAt - now) : "00:00"}
        </div>
      )}
      {breakEndsAt && !breakActive && (
        <p className="ready">You&apos;re ready to FARM again!</p>
      )}
      <button className="primary full" onClick={startBreak}>
        Start Break
      </button>
      <div className="rest-actions">
        <button
          className="secondary"
          onClick={() =>
            setRestLine(tips[Math.floor(Math.random() * tips.length)])
          }
        >
          Get Focus Advice
        </button>
        <button
          className="secondary"
          onClick={() =>
            setRestLine(jokes[Math.floor(Math.random() * jokes.length)])
          }
        >
          Hear Farm Joke
        </button>
        <button
          className="secondary"
          onClick={() =>
            setRestLine(
              `Your island has ${progress.sessions} completed harvests and ${progress.coins} coins.`,
            )
          }
        >
          Check Island
        </button>
        <button className="secondary" onClick={() => setScreen("collection")}>
          My Penguins
        </button>
      </div>
      {restLine && (
        <p className="rest-line" role="status">
          {restLine}
        </p>
      )}
      <button className="primary full" onClick={backToFocus}>
        Back to Focus
      </button>
    </section>
  );
}
