// src/SocketCounter.tsx
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export default function SocketCounter() {
  // 1. 상태 변수 선언 (count라는 변수를 0으로 시작, setCount로 변경)
  const [count, setCount] = useState(0);

  useEffect(() => {
    // 2. 컴포넌트가 나타날 때 소켓 연결
    const socket = io('http://localhost:3000');

    socket.on('update_number', (data: number) => {
      setCount(data); // 서버에서 받은 숫자로 count 업데이트
    });

    // 3. 컴포넌트가 사라질 때 소켓 연결 해제 (정리 작업)
    return () => {
      socket.disconnect();
    };
  }, []);

  // 4. 화면에 그려질 모양 (HTML과 비슷함)
  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: 'transparent',
        border: '2px solid #007bff', // 파란색 테두리 추가
        color: '#007bff', // 글자 색상 맞춤
        padding: '8px 12px',
        borderRadius: '4px',
        zIndex: 9999,
        fontWeight: 'bold',
        pointerEvents: 'none', // 중요: 이 요소가 마우스 클릭을 방해하지 않도록 설정
      }}
    >
      <h4 style={{ margin: 0 }}>소켓 통신 테스트용 카운터: {count}</h4>
    </div>
  );
}
