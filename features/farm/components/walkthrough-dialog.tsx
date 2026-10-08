import type { useFarm } from "../use-farm";

type Props = Pick<
  ReturnType<typeof useFarm>,
  "walkthrough" | "nextWalkthrough"
>;

/** Renders the walkthrough dialog overlay. */
export function WalkthroughDialog({ walkthrough, nextWalkthrough }: Props) {
  return (
    <div className="modal-backdrop tutorial-backdrop">
      <div
        className="card tutorial"
        role="dialog"
        aria-modal="true"
        aria-label="Farm walkthrough"
      >
        <div className="eyebrow">
          A LITTLE FARM TOUR · {walkthrough + 1} / 4
        </div>
        <h2>
          {
            [
              "Welcome to your farm",
              "FARM to begin",
              "REAP your harvest",
              "REST and repeat",
            ][walkthrough]
          }
        </h2>
        <p>
          {
            [
              "Focus Farmer turns dedicated time into coins and penguin friends.",
              "Choose a duration, mode, and outfit. Your timer resumes after a refresh.",
              "When the timer ends, press REAP to collect your reward. Reaping early earns nothing.",
              "Take a break in Rest Grove, visit your penguins, then start fresh.",
            ][walkthrough]
          }
        </p>
        <div className="steps">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={i === walkthrough ? "active" : ""} />
          ))}
        </div>
        <button className="primary full" onClick={nextWalkthrough}>
          {walkthrough === 3 ? "LET'S FARM" : "NEXT"}
        </button>
      </div>
    </div>
  );
}
