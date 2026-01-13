
// You can write more code here

/* START OF COMPILED CODE */

export default class RankOnePlayerPrefab extends Phaser.GameObjects.Container {

	private playerRank!: Phaser.GameObjects.Rectangle;
	private scoreText!: Phaser.GameObjects.Text;
	private playerNameText!: Phaser.GameObjects.Text;
	private crown!: Phaser.GameObjects.Image;

	// 1등 기준 Y 좌표 (높이 246 기준)
	private readonly BASE_HEIGHT = 246;
	private readonly BASE_PLAYER_RANK_Y = 233;
	private readonly BASE_SCORE_TEXT_Y = 0;
	private readonly BASE_PLAYER_NAME_TEXT_Y = -13;
	private readonly BASE_CROWN_Y = -69;

	constructor(scene: Phaser.Scene, x?: number, y?: number) {
		super(scene, x ?? 0, y ?? 0);

		
		/* START-USER-CTR-CODE */
		// Write your code here.

		// PlayerRank
		this.playerRank = scene.add.rectangle(3, this.BASE_PLAYER_RANK_Y, 210, this.BASE_HEIGHT);//x, y, width, height
		this.playerRank.setOrigin(0.5, 1);
		this.playerRank.isFilled = true;
		this.playerRank.fillColor = 13211340;
		this.add(this.playerRank);

		// scoreText
		this.scoreText = scene.add.text(0, this.BASE_SCORE_TEXT_Y, "", {});
		this.scoreText.setOrigin(0.5, 0);
		this.scoreText.text = "6";
		this.scoreText.setStyle({ "color": "#000000ff", "fontFamily": "Ariel", "fontSize": "50px", "fontStyle": "bold", "resolution": 5 });
		this.add(this.scoreText);

		// playerNameText
		this.playerNameText = scene.add.text(4, this.BASE_PLAYER_NAME_TEXT_Y, "", {});
		this.playerNameText.setOrigin(0.5, 1);
		this.playerNameText.text = "Sonia";
		this.playerNameText.setStyle({ "color": "#000000ff", "fontFamily": "Ariel", "fontSize": "50px", "strokeThickness": 1, "resolution": 5 });
		this.add(this.playerNameText);

		// crown
		this.crown = scene.add.image(-1, this.BASE_CROWN_Y, "crown");
		this.crown.setOrigin(0.5, 0.85);
		this.add(this.crown);

		/* END-USER-CTR-CODE */
	}

	/* START-USER-CODE */

	/**
	 * 랭킹 순위에 따라 높이와 스타일을 설정합니다.
	 * @param rank 1~4 사이의 순위
	 */
	setRank(rank: number): void {
		const rankConfig: Record<number, { height: number; crownTint?: number; crownVisible: boolean }> = {
			1: { height: 246, crownTint: 0xFAA629, crownVisible: true },
			2: { height: 186, crownTint: 0xA7AFB3, crownVisible: true },
			3: { height: 126, crownVisible: false },
			4: { height: 76, crownVisible: false },
		};

		const config = rankConfig[rank];
		if (!config) return;

		// 높이 차이 계산 (1등 기준과의 차이)
		const heightDiff = this.BASE_HEIGHT - config.height;

		// playerRank 높이 변경 (setSize 사용하여 origin 기준으로 크기 조정)
		this.playerRank.setSize(210, config.height);

		// 높이 차이에 따라 Y 좌표 조정
		this.scoreText.setY(this.BASE_SCORE_TEXT_Y + heightDiff);
		this.playerNameText.setY(this.BASE_PLAYER_NAME_TEXT_Y + heightDiff);
		this.crown.setY(this.BASE_CROWN_Y + heightDiff);

		// crown 설정
		this.crown.setVisible(config.crownVisible);
		if (config.crownVisible && config.crownTint) {
			this.crown.setTint(config.crownTint);
		}
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
