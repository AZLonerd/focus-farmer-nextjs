import type { CSSProperties } from "react";
import type { Outfit } from "../types";
import { asset } from "../constants";

/** Displays a sprite sheet frame; walking selects the four-frame animated sheet. */
export function Farmer({
  color,
  frame = 0,
  walking = false,
  size = 128,
}: {
  color: Outfit;
  /** Zero-based index in the front-facing sprite sheet. */
  frame?: number;
  walking?: boolean;
  /** Rendered width and height in CSS pixels. */
  size?: number;
}) {
  return (
    <div
      role="img"
      aria-label={`${color} farmer`}
      className={`farmer ${walking ? "walking" : ""}`}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${asset(`jojo_${color}_${walking ? "walk" : "front"}.png`)})`,
        backgroundSize: `${size * (walking ? 4 : 5)}px ${size}px`,
        backgroundPosition: `${-frame * size}px 0`,
      }}
    />
  );
}
/** Decorative ten-frame coin animation scaled to the requested pixel size. */
export function Coin({ size = 24 }: { size?: number }) {
  return (
    <span
      className="coin"
      aria-hidden="true"
      style={
        {
          width: size,
          height: size,
          backgroundImage: `url(${asset("coin_anim.png")})`,
          backgroundSize: `${size * 10}px ${size}px`,
          "--coin-end": `${-size * 10}px`,
        } as CSSProperties
      }
    />
  );
}
