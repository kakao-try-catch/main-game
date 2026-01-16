import React from "react";
import "../assets/fonts/Font.css";

interface PlayerCardProps {
  name?: string;
  score?: number;
  color?: string;
}

export default function PlayerCard({
  name = "NONE",
  score = 0,
  color = "#000",
}: PlayerCardProps) {
  // 닉네임 길이에 따라 폰트 크기 조절
  const getNameFontSize = (nameLength: number) => {
    if (nameLength <= 4) return "28px";
    if (nameLength <= 6) return "24px";
    return "20px"; // 7-8자
  };

  return (
    <div style={cardWrapperStyle}>
      <div
        className="nes-container is-centered"
        style={{
          ...contentLayout,
          padding: "4px 8px",
          minHeight: "80px",
          height: "80px",
        }}
      >
        <div style={nameContainerStyle}>
          <span
            style={{
              ...nameStyle,
              color: color,
              fontSize: getNameFontSize(name.length),
            }}
          >
            {name}
          </span>
        </div>
        <span style={{ color: "#212529", fontSize: "28px" }}>
          {score.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

const cardWrapperStyle: React.CSSProperties = {
  width: "180px",
  fontFamily: "NeoDunggeunmo",
};

const contentLayout: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  gap: "4px",
};

const nameContainerStyle: React.CSSProperties = {
  minHeight: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const nameStyle: React.CSSProperties = {
  wordBreak: "keep-all",
  textAlign: "center",
};
