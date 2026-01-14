import RankOnePlayerPrefab from './rank/RankOnePlayerPrefab';
import ButtonPrefab from './button/ButtonPrefab';
// You can write more code here

/** 플레이어 데이터 인터페이스 */
export interface PlayerResultData {
	id: string;
	name: string;
	score: number;
	color: string;
	playerIndex: number; // 원래 플레이어 번호 (0~3)
}

/** 순위가 매겨진 플레이어 데이터 */
interface RankedPlayer extends PlayerResultData {
	rank: number; // 1~4
}

/** HEX 색상 문자열을 숫자로 변환 */
function hexStringToNumber(hex: string): number {
	return parseInt(hex.replace('#', ''), 16);
}

/* START OF COMPILED CODE */

export default class GameResultPrefab extends Phaser.GameObjects.Container {

	private rankPlayers: RankOnePlayerPrefab[] = [];

	constructor(scene: Phaser.Scene, playerCount: number = 4, players: PlayerResultData[] = [], x?: number, y?: number) {
		super(scene, x ?? 684, y ?? 283);

		// background
		const background = scene.add.rectangle(36, 165, 1440, 896);
		background.isFilled = true;
		background.fillColor = 0;
		background.fillAlpha = 0.4;
		this.add(background);

		// Frame
		const frame = scene.add.rectangle(35, 146, 1041, 690);
		frame.isFilled = true;
		frame.fillColor = 16184822;
		frame.isStroked = true;
		frame.strokeColor = 9530303;
		frame.lineWidth = 10;
		this.add(frame);

		// TitleText
		const titleText = scene.add.text(35, -90, "", {});
		titleText.setOrigin(0.5, 1);
		titleText.text = "APPLE GAME TOGETHER";
		titleText.setStyle({ "align": "center", "color": "#000000ff", "fontFamily": "Ariel", "fontSize": "60px", "fontStyle": "bold", "resolution": 5 });
		this.add(titleText);


		/* START-USER-CTR-CODE */
		// Write your code here.

		// 순위 계산 및 정렬
		const rankedPlayers = this.calculateRanks(players, playerCount);

		//rank players
		const spacing = 216;
		const centerX = 39; // 가운데 정렬 기준점
		const startX = centerX - ((playerCount - 1) * spacing) / 2;

		for(let i = 0; i < rankedPlayers.length; i++) {
			const player = rankedPlayers[i];
			const rankPlayer = new RankOnePlayerPrefab(scene, startX + i * spacing, 29);
			rankPlayer
				.setRank(player.rank)
				.setPlayerName(player.name)
				.setScore(player.score)
				.setPlayerColor(hexStringToNumber(player.color));
			this.add(rankPlayer);
			this.rankPlayers.push(rankPlayer);
		}

		
		// ReplayButton
		const replayButton = new ButtonPrefab(scene, -198, 347);
		replayButton
			.setText("REPLAY")
			.setOnClick(() => {
				scene.scene.restart();
			});
		this.add(replayButton);

		// RoomButton
		const roomButton = new ButtonPrefab(scene, 283, 347);
		roomButton
			.setText("LOBBY")
			.setOnClick(() => {
				console.log("Room clicked!");
			});
		this.add(roomButton);

		/* END-USER-CTR-CODE */
	}

	/* START-USER-CODE */

	/**
	 * 플레이어 순위를 계산합니다.
	 * - 점수 내림차순 정렬
	 * - 같은 점수인 경우 플레이어 번호가 작은 순서
	 * - 공동 순위 허용 (동점자 수만큼 다음 순위 건너뜀)
	 * 예: 10,10,10,5 → 1,1,1,4 / 10,10,5,5 → 1,1,3,3
	 */
	private calculateRanks(players: PlayerResultData[], playerCount: number): RankedPlayer[] {
		// 플레이어가 없으면 빈 배열 반환
		if (players.length === 0) {
			// 기본 플레이어 데이터 생성 (테스트용)
			const defaultPlayers: RankedPlayer[] = [];
			for (let i = 0; i < playerCount; i++) {
				defaultPlayers.push({
					id: `id_${i + 1}`,
					name: `${i + 1}P`,
					score: 0,
					color: ['#209cee', '#e76e55', '#92cc41', '#f2d024'][i] || '#209cee',
					playerIndex: i,
					rank: i + 1
				});
			}
			return defaultPlayers;
		}

		// 1. 점수 내림차순, 같으면 playerIndex 오름차순 정렬
		const sortedPlayers = [...players].sort((a, b) => {
			if (b.score !== a.score) {
				return b.score - a.score; // 점수 내림차순
			}
			return a.playerIndex - b.playerIndex; // 플레이어 번호 오름차순
		});

		// 2. 기본 순위 부여 (공동 순위 허용)
		const rankedPlayers: RankedPlayer[] = [];
		let currentRank = 1;

		for (let i = 0; i < sortedPlayers.length; i++) {
			const player = sortedPlayers[i];
			
			// 첫 번째 플레이어가 아니고, 이전 플레이어와 점수가 다르면 순위 증가
			if (i > 0 && sortedPlayers[i - 1].score !== player.score) {
				currentRank = i + 1;
			}

			rankedPlayers.push({
				...player,
				rank: currentRank
			});
		}

		return rankedPlayers;
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
