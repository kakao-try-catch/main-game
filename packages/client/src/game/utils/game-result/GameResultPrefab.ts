import RankOnePlayerPrefab from './rank/RankOnePlayerPrefab';
import ButtonPrefab from './button/ButtonPrefab';
// You can write more code here

/* START OF COMPILED CODE */

export default class GameResultPrefab extends Phaser.GameObjects.Container {

	constructor(scene: Phaser.Scene, x?: number, y?: number) {
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

		//rank players
		const playerCount = 4; // 나중에 실제 플레이어 수로 변경
		const spacing = 216;
		const centerX = 39; // 가운데 정렬 기준점
		const startX = centerX - ((playerCount - 1) * spacing) / 2;

		for(let i = 0; i < playerCount; i++) {
			const rankPlayer = new RankOnePlayerPrefab(scene, startX + i * spacing, 29);
			rankPlayer.setRank(i + 1); //1~4등 //임시로 1,2,3,4 순서로 하게 하였음
			this.add(rankPlayer);
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

	// Write your code here.

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
