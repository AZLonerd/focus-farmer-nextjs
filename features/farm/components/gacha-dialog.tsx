import type { useFarm } from "../use-farm";
import { petAssets, asset } from "../constants";
import { Coin } from "./sprites";

type Props = Pick<
  ReturnType<typeof useFarm>,
  | "message"
  | "busy"
  | "progress"
  | "setGachaOpen"
  | "eggStage"
  | "newPet"
  | "pullEgg"
>;

/** Renders the gacha dialog overlay. */
export function GachaDialog({
  message,
  busy,
  progress,
  setGachaOpen,
  eggStage,
  newPet,
  pullEgg,
}: Props) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) setGachaOpen(false);
      }}
    >
      <div
        className="card gacha-modal centered"
        role="dialog"
        aria-modal="true"
        aria-label="Open Egg Gacha"
      >
        <button
          className="close"
          aria-label="Close"
          disabled={busy}
          onClick={() => setGachaOpen(false)}
        >
          ×
        </button>
        <div className="eyebrow">EGG GACHA</div>
        <h1>What will hatch?</h1>
        <div className={`egg ${eggStage}`}>
          {eggStage === "reveal" && newPet ? (
            <img src={asset(petAssets[newPet.asset_id])} alt={newPet.name} />
          ) : (
            <div
              role="img"
              aria-label="Mystery egg"
              className="egg-sprite"
              style={{
                backgroundImage: `url(${asset("egg_base_wobble.png")})`,
              }}
            />
          )}
        </div>
        {newPet ? (
          <p className="hatched">
            {newPet.name} <span>· {newPet.rarity}</span>
          </p>
        ) : (
          <p className="subtle">A new penguin is one lucky pull away.</p>
        )}
        <div className="gacha-balance">
          <Coin />
          Your coins: <strong>{progress.coins}</strong>
        </div>
        <button
          className="primary full"
          disabled={busy || progress.coins < 10}
          onClick={pullEgg}
        >
          Pull Egg (10 coins)
        </button>
        {progress.coins < 10 && (
          <p className="fineprint">You need 10 coins for an egg.</p>
        )}
        {message && <p className="notice">{message}</p>}
      </div>
    </div>
  );
}
