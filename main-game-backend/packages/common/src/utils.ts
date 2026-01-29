// 미완
// 클라이언트는 드래그 종료 시 이 함수로 먼저 체크하고, 서버는 요청을 받았을 때 같은 함수로 검증합니다. 로직이 일치해야 하니까요.
function calculateSum(indices: number[], apples: number[]): number {
  return indices.reduce((sum, index) => sum + (apples[index] || 0), 0);
}
