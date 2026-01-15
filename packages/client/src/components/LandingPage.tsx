import { useState } from "react";
import "nes.css/css/nes.min.css";
import "../assets/fonts/Font.css";
import "./LandingPage.css";

interface LandingPageProps {
  onStart: (nickname: string) => void;
}

function LandingPage({ onStart }: LandingPageProps) {
  const [nickname, setNickname] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim()) {
      onStart(nickname.trim());
    }
  };

  return (
    <div className="landing-container">
      <div className="landing-content">
        <h1 className="nes-text is-primary game-title">다같이 오락가락</h1>

        <form onSubmit={handleSubmit} className="landing-form">
          <div className="nes-field">
            <label htmlFor="nickname">닉네임</label>
            <input
              type="text"
              id="nickname"
              className="nes-input"
              placeholder="닉네임을 입력하세요"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              required
            />
          </div>

          <button
            type="submit"
            className="nes-btn is-primary start-button"
            disabled={!nickname.trim()}
          >
            시작
          </button>
        </form>
      </div>
    </div>
  );
}

export default LandingPage;
