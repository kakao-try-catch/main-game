import React from 'react';
import 'nes.css/css/nes.min.css';

// crown.svg 내용을 직접 컴포넌트로 정의 (fill 색상 props로 제어, style prop 허용)
type CrownSvgProps = { fill: string; style?: React.CSSProperties };
const CrownSvg: React.FC<CrownSvgProps> = ({ fill, style }) => (
  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" style={style}>
    <path d="M0 0 C4.63541197 2.54947658 7.88683865 6.66012737 11.41601562 10.53515625 C12.01220703 11.16550781 12.60839844 11.79585937 13.22265625 12.4453125 C13.75640869 13.03070801 14.29016113 13.61610352 14.84008789 14.21923828 C16.44157844 15.5999109 16.44157844 15.5999109 18.51733398 15.18310547 C20.75957056 14.34612597 20.75957056 14.34612597 23.5 12.375 C29.5 8.375 29.5 8.375 31.5 7.375 C31.5 11.665 31.5 15.955 31.5 20.375 C30.84 20.375 30.18 20.375 29.5 20.375 C29.51160156 21.03886719 29.52320313 21.70273437 29.53515625 22.38671875 C29.62478032 31.15707381 29.62478032 31.15707381 28.5 35.375 C27.84 35.375 27.18 35.375 26.5 35.375 C26.70625 36.138125 26.9125 36.90125 27.125 37.6875 C27.5 40.375 27.5 40.375 25.5 43.375 C21.63110646 47.24389354 21.63110646 47.24389354 18.57839966 47.59773254 C17.85401703 47.58457504 17.1296344 47.57141754 16.38330078 47.55786133 C15.14654099 47.54212822 15.14654099 47.54212822 13.88479614 47.52607727 C12.99726654 47.50329208 12.10973694 47.4805069 11.1953125 47.45703125 C10.27918182 47.43912033 9.36305115 47.42120941 8.41915894 47.40275574 C6.48065535 47.36155859 4.54225988 47.31497539 2.60400391 47.26342773 C-0.35637138 47.1879748 -3.31639755 47.13885468 -6.27734375 47.09179688 C-8.16149586 47.04847762 -10.04561307 47.00360659 -11.9296875 46.95703125 C-13.25490921 46.9380352 -13.25490921 46.9380352 -14.60690308 46.9186554 C-19.31640681 46.76985821 -22.74036242 46.53513285 -26.5 43.375 C-28.09253537 38.5973939 -29.01297876 33.67128447 -30.0625 28.75 C-30.29646484 27.69425781 -30.53042969 26.63851562 -30.77148438 25.55078125 C-32.08959346 19.34836705 -32.75916349 13.71453767 -32.5 7.375 C-28.93242734 9.15878633 -25.56836905 11.44448502 -22.5625 14.0625 C-20.63257424 15.59419425 -20.63257424 15.59419425 -18.57592773 15.15673828 C-16.10393535 14.22585276 -14.99267494 13.12844468 -13.22265625 11.1796875 C-12.62646484 10.54675781 -12.03027344 9.91382813 -11.41601562 9.26171875 C-10.1782265 7.9182806 -8.9464518 6.56927653 -7.72070312 5.21484375 C-3.23819954 0.48572993 -3.23819954 0.48572993 0 0 Z " fill={fill} transform="translate(32.5,8.625)"/>
  </svg>
);

interface PlayerResultData {
  id: string;
  name: string;
  score: number;
  color: string;
  playerIndex: number;
}

interface RankedPlayer extends PlayerResultData {
  rank: number;
}

interface GameResultProps {
  players: PlayerResultData[];
  onReplay: () => void;
  onLobby: () => void;
}

function calculateRanks(players: PlayerResultData[]): RankedPlayer[] {
  if (players.length === 0) return [];
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.playerIndex - b.playerIndex;
  });
  const rankedPlayers: RankedPlayer[] = [];
  let currentRank = 1;
  for (let i = 0; i < sortedPlayers.length; i++) {
    const player = sortedPlayers[i];
    if (i > 0 && sortedPlayers[i - 1].score !== player.score) {
      currentRank = i + 1;
    }
    rankedPlayers.push({ ...player, rank: currentRank });
  }
  return rankedPlayers;
}

function getRankHeight(rank: number): number {
  const heights: Record<number, number> = { 1: 246, 2: 186, 3: 126, 4: 76 };
  return heights[rank] || 76;
}

function getCrownProps(rank: number): { visible: boolean; fill: string } {
  if (rank === 1) return { visible: true, fill: '#FAA629' };
  if (rank === 2) return { visible: true, fill: '#A7AFB3' };
  return { visible: false, fill: 'none' };
}

const GameResult: React.FC<GameResultProps> = ({ players, onReplay, onLobby }) => {
  const rankedPlayers = calculateRanks(players);
  return (
    <div style={overlayStyle}>
      <div className="nes-container is-rounded" style={containerStyle}>
        <h1 style={titleStyle}>APPLE GAME TOGETHER</h1>
        <div style={rankContainerStyle}>
          {rankedPlayers.map((player, idx) => {
            const height = getRankHeight(player.rank);
            const crown = getCrownProps(player.rank);
            return (
              <div 
              key={player.id}
                style={{
                    ...rankItemStyle,
                    marginLeft: idx === 0 ? 0 : '-5px', // 첫 박스는 0, 나머지는 음수
                }}>
                {crown.visible && (
                  <CrownSvg style={{ ...crownStyle, marginTop: '0px', marginBottom: '3px' }} fill={crown.fill} />
                )}
                <div style={{ ...playerNameStyle, marginTop: '0px' }}>{player.name}</div>
                <div
                  style={{
                    ...rankBarStyle,
                    height: `${height}px`,
                    backgroundColor: player.color,
                  }}
                >
                  <div style={scoreStyle}>{player.score}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={buttonContainerStyle}>
          <button 
            type="button" 
            className="nes-btn is-primary"
            style={buttonStyle}
            onClick={onReplay}
          >
            REPLAY
          </button>
          <button 
            type="button" 
            className="nes-btn is-primary"
            style={buttonStyle}
            onClick={onLobby}
          >
            LOBBY
          </button>
        </div>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '1380px',
  height: '862px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
  zIndex: 1000,
};

const containerStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  width: '1052px',
  height: '700px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '40px',
  boxSizing: 'border-box',
};

const titleStyle: React.CSSProperties = {
  fontFamily: 'NeoDunggeunmo',
  fontSize: '55px',
  marginBottom: '20px',
  marginTop: '0',
  color: '#212529',
};

const rankContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-end', // 상단 정렬로 변경
  gap: '1px',
  marginBottom: '30px',
  minHeight: '320px',
  width: '100%',
};

const rankItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start', // 추가!
  gap: '0px',
  width: '220px',
  marginLeft: '-5px',
};

const crownStyle: React.CSSProperties = {
  width: '48px',
  height: '48px',
  marginBottom: '-32px',
};

const playerNameStyle: React.CSSProperties = {
  fontFamily: 'NeoDunggeunmo',
  fontSize: '48px',
  color: '#212529',
  marginBottom: '0px',
  marginTop: '-18px',
  lineHeight: '45px', 
};

const scoreStyle: React.CSSProperties = {
  fontFamily: 'NeoDunggeunmo',
  fontSize: '48px',
  color: '#212529',
  paddingTop: '10px',
};

const rankBarStyle: React.CSSProperties = {
  width: '210px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
};

const buttonContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: '60px',
  marginTop: '10px',
};

const buttonStyle: React.CSSProperties = {
  fontFamily: 'NeoDunggeunmo',
  fontSize: '51px', // 36 + 15
  width: '386px',
  height: '136px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  cursor: 'pointer',
};

export default GameResult;
