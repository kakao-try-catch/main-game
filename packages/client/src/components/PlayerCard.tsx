import React from 'react';

interface PlayerCardProps {
  name?: string;
  score?: number;
  color?: string;
}

export default function PlayerCard({ name = "NONE", score = 0, color = "#000" }: PlayerCardProps) {
  return (
    <div style={cardWrapperStyle}>
        <div className="nes-container is-centered" style={contentLayout}>
            <span style={{ color: color, fontSize: "20px" }}>
                {name}
            </span>
            <span style={{ color: "#e76e55", fontSize: "20px" }}>
                {score.toLocaleString()}
            </span>
        </div>
    </div>

  );
}

const cardWrapperStyle: React.CSSProperties = {
  padding: "8px",
  width: "200px",
};

const contentLayout: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
};