import { useState, useEffect } from 'react';
import 'nes.css/css/nes.min.css';
import '../assets/fonts/Font.css';
import './LandingPage.css';
import { useGameStore } from '../store/gameStore';
import { useSFXContext } from '../contexts/SFXContext';

const MAX_NICKNAME_LENGTH = 8;
const TOOLTIP_DURATION = 2000;

interface LandingPageProps {
  onStart: (nickname: string) => void;
}

function LandingPage({ onStart }: LandingPageProps) {
  const [nickname, setNickname] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [showLengthTooltip, setShowLengthTooltip] = useState(false);
  const { playSFX } = useSFXContext();

  const connectionError = useGameStore((s) => s.connectionError);
  const setConnectionError = useGameStore((s) => s.setConnectionError);

  // 접속 에러 메시지 자동 숨김 (2초 후)
  useEffect(() => {
    if (connectionError) {
      const timer = setTimeout(() => {
        setConnectionError(null);
      }, TOOLTIP_DURATION);
      return () => clearTimeout(timer);
    }
  }, [connectionError, setConnectionError]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim()) {
      onStart(nickname.trim());
    }
  };

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length > MAX_NICKNAME_LENGTH) {
      setShowLengthTooltip(true);
      setTimeout(() => setShowLengthTooltip(false), TOOLTIP_DURATION);
      return;
    }
    setNickname(value);
  };

  return (
    <div className="landing-container">
      <div className="landing-content">
        <h1 className="nes-text is-primary game-title">다같이 오락가락</h1>

        <form onSubmit={handleSubmit} className="landing-form">
          <div className="nes-field">
            <label htmlFor="nickname">닉네임</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                id="nickname"
                className="nes-input"
                placeholder="닉네임을 입력하세요"
                value={nickname}
                onChange={handleNicknameChange}
                maxLength={MAX_NICKNAME_LENGTH}
                required
              />
              {showLengthTooltip && (
                <div className="length-tooltip">
                  닉네임은 최대 8자까지 입력 가능합니다
                </div>
              )}
            </div>
          </div>

          <div
            className="button-wrapper"
            onMouseEnter={() => {
              playSFX('buttonHover');
              !nickname.trim() && setShowTooltip(true);
            }}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <button
              type="submit"
              className="nes-btn is-primary start-button"
              disabled={!nickname.trim()}
              onClick={() => playSFX('buttonClick')}
            >
              시작
            </button>
            {showTooltip && !nickname.trim() && (
              <div className="tooltip">닉네임을 입력하세요</div>
            )}
            {connectionError && (
              <div
                className="length-tooltip"
                style={{
                  bottom: '100%',
                  top: 'auto',
                  marginBottom: '10px',
                  marginTop: 0,
                }}
              >
                {connectionError.message}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default LandingPage;
