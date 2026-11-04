import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { CARD_ATTRS, cardTier, vsiqRating } from "../utils/rating";
import { LEAGUE_COLORS, initials } from "../utils/metrics";

const POS_CODE = { Forward: "FWD", Midfielder: "MID", Defender: "DEF" };

export default function PlayerCard({ player }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const rating = vsiqRating(player);
  const tier = cardTier(rating);

  async function download() {
    if (!ref.current) return;
    setBusy(true);
    try {
      const url = await toPng(ref.current, { pixelRatio: 2, cacheBust: true });
      const link = document.createElement("a");
      link.href = url;
      link.download = `${player.name.replace(/\s+/g, "-").toLowerCase()}-${player.seasonLabel}.png`;
      link.click();
    } catch (error) {
      console.error("Card export failed", error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-wrap">
      <div ref={ref} className={`pcard ${tier}`}>
        <div className="pcard-top">
          <div className="pcard-rating">
            <strong>{rating}</strong>
            <span>{POS_CODE[player.position]}</span>
          </div>
          <span className="pcard-league" style={{ color: LEAGUE_COLORS[player.league] }}>{player.league}</span>
        </div>
        <div className="pcard-face">{initials(player.name)}</div>
        <div className="pcard-name">{player.name}</div>
        <div className="pcard-club">{player.club} · {player.seasonLabel}</div>
        {player.playStyle && <div className="pcard-style">{player.playStyle}</div>}
        <div className="pcard-attrs">
          {CARD_ATTRS.map((a) => (
            <div key={a.code}><strong>{Math.max(1, player.pct?.[a.key] ?? 0)}</strong><span>{a.code}</span></div>
          ))}
        </div>
        <div className="pcard-foot">VSIQ · Villegas Scout IQ</div>
      </div>
      <button className="btn" onClick={download} disabled={busy}>{busy ? "Rendering..." : "Download card (PNG)"}</button>
    </div>
  );
}
