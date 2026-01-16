import React from 'react';
import '../assets/fonts/Font.css';

interface PlayerCardProps {
  name?: string;
  score?: number;
  color?: string;
}

export default function PlayerCard({ name = "NONE", score = 0, color = "#000" }: PlayerCardProps) {
  return (
    <div style={cardWrapperStyle}>
      <div className="nes-container is-rounded is-centered" style={{ ...contentLayout, padding: "4px 8px" }}>
        <span style={{ color: color, fontSize: "28px" }}>
          {name}
        </span>
        <span style={{ color: "#e76e55", fontSize: "28px" }}>
          {score.toLocaleString()}
        </span>
      </div>
    </div>

  );
}

const cardWrapperStyle: React.CSSProperties = {
  width: "180px",
  fontFamily: 'NeoDunggeunmo',
};

const contentLayout: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
};