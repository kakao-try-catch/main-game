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

	private calculateRanks(players: PlayerResultData[], playerCount: number): RankedPlayer[] {
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
