import type { useFarm } from "../use-farm";
import { Farmer, Coin } from "./sprites";

type Props = Pick<ReturnType<typeof useFarm>, "setScreen" | "summary">;

/** Displays the summary screen; state changes are delegated to the farm controller. */
export function SummaryScreen({ setScreen, summary }: Props) {
  if (!summary) return null;
  return (
    <section className="card centered">
      <div className="eyebrow">HARVEST SUMMARY</div>
      <h1>{summary.completed ? "A fine harvest!" : "Harvest ended early"}</h1>
      <div className="sprite-stage">
        <div className="stage-ground" />
        <Farmer color={summary.outfit} frame={summary.completed ? 2 : 3} />
      </div>
      <div className="reward-total">
        <Coin size={34} />+{summary.earned || 0}
      </div>
      <div className="reward-lines">
        <div>
          <span>Focus reward</span>
          <strong>+{summary.base_coins || 0}</strong>
        </div>
        <div>
          <span>Hard Mode bonus</span>
          <strong>+{summary.hard_bonus || 0}</strong>
        </div>
        <div>
          <span>Lucky bonus</span>
          <strong>+{summary.lucky_bonus || 0}</strong>
        </div>
      </div>
      <p className="subtle">
        {summary.completed
          ? "One more completed session for your farm."
          : "Only completed sessions earn coins and count toward your total."}
      </p>
      <button className="primary big full" onClick={() => setScreen("rest")}>
        REST
      </button>
    </section>
  );
}
