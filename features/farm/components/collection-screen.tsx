import type { useFarm } from "../use-farm";
import { petAssets, asset } from "../constants";

type Props = Pick<
  ReturnType<typeof useFarm>,
  "setScreen" | "pets" | "breakEndsAt"
>;

/** Displays the collection screen; state changes are delegated to the farm controller. */
export function CollectionScreen({ setScreen, pets, breakEndsAt }: Props) {
  return (
    <section className="card collection">
      <div className="eyebrow">YOUR COLLECTION</div>
      <h1>My Penguins</h1>
      <p className="subtle">
        Every hatch has a place on your shelves. Duplicates are welcome!
      </p>
      {(["legendary", "epic", "rare", "common"] as const).map((rarity) => (
        <div className="shelf" key={rarity}>
          <h2>{rarity}</h2>
          <div className="shelf-items">
            {pets.some((p) => p.rarity === rarity) ? (
              pets
                .filter((p) => p.rarity === rarity)
                .map((p) => (
                  <div className="pet" key={p.id}>
                    <img src={asset(petAssets[p.asset_id])} alt="" />
                    <span>{p.name}</span>
                  </div>
                ))
            ) : (
              <p>No {rarity} penguins yet.</p>
            )}
          </div>
        </div>
      ))}
      <button
        className="primary full"
        onClick={() => setScreen(breakEndsAt ? "rest" : "setup")}
      >
        Back
      </button>
    </section>
  );
}
