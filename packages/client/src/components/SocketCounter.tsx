// src/SocketCounter.tsx
import { useEffect } from "react";
import { useGameStore } from "../store/gameStore";
import { socketManager } from "../network/socket";

export default function SocketCounter() {
  const count = useGameStore((state) => state.count);

  useEffect(() => {
    // 테스트를 위해 최초 1회만 연결 실행
    socketManager.connect("http://localhost:3000");

    // 테스트 종료(컴포넌트 제거) 시 연결을 완전히 끊고 싶다면 주석 해제
    return () => socketManager.disconnect();
  }, []);

  // 4. 화면에 그려질 모양 (HTML과 비슷함)
  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        background: "transparent",
        border: "2px solid #007bff", // 파란색 테두리 추가
        color: "#007bff", // 글자 색상 맞춤
        padding: "8px 12px",
        borderRadius: "4px",
        zIndex: 9999,
        fontWeight: "bold",
        pointerEvents: "none", // 중요: 이 요소가 마우스 클릭을 방해하지 않도록 설정
      }}
    >
      <h4 style={{ margin: 0 }}>소켓 통신 테스트용 카운터: {count}</h4>
    </div>
  );
}
