
// You can write more code here

/* START OF COMPILED CODE */

class AppleGameScene extends Phaser.Scene {

	constructor() {
		super("AppleGameScene");

		/* START-USER-CTR-CODE */
		// Write your code here.
		/* END-USER-CTR-CODE */
	}

	editorCreate(): void {

		// editabletilemap
		this.cache.tilemap.add("editabletilemap_390db566-7e56-4b2b-82db-3b26f537c3f3", {
			format: 1,
			data: {
				width: 1234,
				height: 734,
				orientation: "orthogonal",
				tilewidth: 68,
				tileheight: 68,
				tilesets: [],
				layers: [],
			},
		});
		const editabletilemap = this.add.tilemap("editabletilemap_390db566-7e56-4b2b-82db-3b26f537c3f3");

		// image_1
		const image_1 = this.add.image(0, 0, "사과게임 1안");
		image_1.setOrigin(0, 0);

		// rectangle_170
		const rectangle_170 = this.add.rectangle(0, 0, 1380, 862);
		rectangle_170.setOrigin(0, 0);
		rectangle_170.isFilled = true;
		rectangle_170.fillColor = 15006687;

		// row 1
		const row_1 = this.add.container(91, 91);

		// rectangle_1
		const rectangle_1 = new applePrefab(this, 0, 0);
		row_1.add(rectangle_1);

		// rectangle
		const rectangle = new applePrefab(this, 73, 0);
		row_1.add(rectangle);

		// rectangle_2
		const rectangle_2 = new applePrefab(this, 146, 0);
		row_1.add(rectangle_2);

		// rectangle_3
		const rectangle_3 = new applePrefab(this, 219, 0);
		row_1.add(rectangle_3);

		// rectangle_4
		const rectangle_4 = new applePrefab(this, 292, 0);
		row_1.add(rectangle_4);

		// rectangle_5
		const rectangle_5 = new applePrefab(this, 365, 0);
		row_1.add(rectangle_5);

		// rectangle_6
		const rectangle_6 = new applePrefab(this, 438, 0);
		row_1.add(rectangle_6);

		// rectangle_7
		const rectangle_7 = new applePrefab(this, 511, 0);
		row_1.add(rectangle_7);

		// rectangle_8
		const rectangle_8 = new applePrefab(this, 584, 0);
		row_1.add(rectangle_8);

		// rectangle_9
		const rectangle_9 = new applePrefab(this, 657, 0);
		row_1.add(rectangle_9);

		// rectangle_10
		const rectangle_10 = new applePrefab(this, 730, 0);
		row_1.add(rectangle_10);

		// rectangle_11
		const rectangle_11 = new applePrefab(this, 803, 0);
		row_1.add(rectangle_11);

		// rectangle_12
		const rectangle_12 = new applePrefab(this, 876, 0);
		row_1.add(rectangle_12);

		// rectangle_13
		const rectangle_13 = new applePrefab(this, 949, 0);
		row_1.add(rectangle_13);

		// rectangle_14
		const rectangle_14 = new applePrefab(this, 1022, 0);
		row_1.add(rectangle_14);

		// rectangle_15
		const rectangle_15 = new applePrefab(this, 1095, 0);
		row_1.add(rectangle_15);

		// rectangle_16
		const rectangle_16 = new applePrefab(this, 1168, 0);
		row_1.add(rectangle_16);

		// row
		const row = this.add.container(91, 165);

		// rectangle_17
		const rectangle_17 = new applePrefab(this, 0, 0);
		row.add(rectangle_17);

		// rectangle_18
		const rectangle_18 = new applePrefab(this, 73, 0);
		row.add(rectangle_18);

		// rectangle_19
		const rectangle_19 = new applePrefab(this, 146, 0);
		row.add(rectangle_19);

		// rectangle_20
		const rectangle_20 = new applePrefab(this, 219, 0);
		row.add(rectangle_20);

		// rectangle_21
		const rectangle_21 = new applePrefab(this, 292, 0);
		row.add(rectangle_21);

		// rectangle_22
		const rectangle_22 = new applePrefab(this, 365, 0);
		row.add(rectangle_22);

		// rectangle_23
		const rectangle_23 = new applePrefab(this, 438, 0);
		row.add(rectangle_23);

		// rectangle_24
		const rectangle_24 = new applePrefab(this, 511, 0);
		row.add(rectangle_24);

		// rectangle_25
		const rectangle_25 = new applePrefab(this, 584, 0);
		row.add(rectangle_25);

		// rectangle_26
		const rectangle_26 = new applePrefab(this, 657, 0);
		row.add(rectangle_26);

		// rectangle_27
		const rectangle_27 = new applePrefab(this, 730, 0);
		row.add(rectangle_27);

		// rectangle_28
		const rectangle_28 = new applePrefab(this, 803, 0);
		row.add(rectangle_28);

		// rectangle_29
		const rectangle_29 = new applePrefab(this, 876, 0);
		row.add(rectangle_29);

		// rectangle_30
		const rectangle_30 = new applePrefab(this, 949, 0);
		row.add(rectangle_30);

		// rectangle_31
		const rectangle_31 = new applePrefab(this, 1022, 0);
		row.add(rectangle_31);

		// rectangle_32
		const rectangle_32 = new applePrefab(this, 1095, 0);
		row.add(rectangle_32);

		// rectangle_33
		const rectangle_33 = new applePrefab(this, 1168, 0);
		row.add(rectangle_33);

		// row_1
		const row_1 = this.add.container(91, 239);

		// rectangle_34
		const rectangle_34 = new applePrefab(this, 0, 0);
		row_1.add(rectangle_34);

		// rectangle_35
		const rectangle_35 = new applePrefab(this, 73, 0);
		row_1.add(rectangle_35);

		// rectangle_36
		const rectangle_36 = new applePrefab(this, 146, 0);
		row_1.add(rectangle_36);

		// rectangle_37
		const rectangle_37 = new applePrefab(this, 219, 0);
		row_1.add(rectangle_37);

		// rectangle_38
		const rectangle_38 = new applePrefab(this, 292, 0);
		row_1.add(rectangle_38);

		// rectangle_39
		const rectangle_39 = new applePrefab(this, 365, 0);
		row_1.add(rectangle_39);

		// rectangle_40
		const rectangle_40 = new applePrefab(this, 438, 0);
		row_1.add(rectangle_40);

		// rectangle_41
		const rectangle_41 = new applePrefab(this, 511, 0);
		row_1.add(rectangle_41);

		// rectangle_42
		const rectangle_42 = new applePrefab(this, 584, 0);
		row_1.add(rectangle_42);

		// rectangle_43
		const rectangle_43 = new applePrefab(this, 657, 0);
		row_1.add(rectangle_43);

		// rectangle_44
		const rectangle_44 = new applePrefab(this, 730, 0);
		row_1.add(rectangle_44);

		// rectangle_45
		const rectangle_45 = new applePrefab(this, 803, 0);
		row_1.add(rectangle_45);

		// rectangle_46
		const rectangle_46 = new applePrefab(this, 876, 0);
		row_1.add(rectangle_46);

		// rectangle_47
		const rectangle_47 = new applePrefab(this, 949, 0);
		row_1.add(rectangle_47);

		// rectangle_48
		const rectangle_48 = new applePrefab(this, 1022, 0);
		row_1.add(rectangle_48);

		// rectangle_49
		const rectangle_49 = new applePrefab(this, 1095, 0);
		row_1.add(rectangle_49);

		// rectangle_50
		const rectangle_50 = new applePrefab(this, 1168, 0);
		row_1.add(rectangle_50);

		// row_2
		const row_2 = this.add.container(91, 313);

		// rectangle_51
		const rectangle_51 = new applePrefab(this, 0, 0);
		row_2.add(rectangle_51);

		// rectangle_52
		const rectangle_52 = new applePrefab(this, 73, 0);
		row_2.add(rectangle_52);

		// rectangle_53
		const rectangle_53 = new applePrefab(this, 146, 0);
		row_2.add(rectangle_53);

		// rectangle_54
		const rectangle_54 = new applePrefab(this, 219, 0);
		row_2.add(rectangle_54);

		// rectangle_55
		const rectangle_55 = new applePrefab(this, 292, 0);
		row_2.add(rectangle_55);

		// rectangle_56
		const rectangle_56 = new applePrefab(this, 365, 0);
		row_2.add(rectangle_56);

		// rectangle_57
		const rectangle_57 = new applePrefab(this, 438, 0);
		row_2.add(rectangle_57);

		// rectangle_58
		const rectangle_58 = new applePrefab(this, 511, 0);
		row_2.add(rectangle_58);

		// rectangle_59
		const rectangle_59 = new applePrefab(this, 584, 0);
		row_2.add(rectangle_59);

		// rectangle_60
		const rectangle_60 = new applePrefab(this, 657, 0);
		row_2.add(rectangle_60);

		// rectangle_61
		const rectangle_61 = new applePrefab(this, 730, 0);
		row_2.add(rectangle_61);

		// rectangle_62
		const rectangle_62 = new applePrefab(this, 803, 0);
		row_2.add(rectangle_62);

		// rectangle_63
		const rectangle_63 = new applePrefab(this, 876, 0);
		row_2.add(rectangle_63);

		// rectangle_64
		const rectangle_64 = new applePrefab(this, 949, 0);
		row_2.add(rectangle_64);

		// rectangle_65
		const rectangle_65 = new applePrefab(this, 1022, 0);
		row_2.add(rectangle_65);

		// rectangle_66
		const rectangle_66 = new applePrefab(this, 1095, 0);
		row_2.add(rectangle_66);

		// rectangle_67
		const rectangle_67 = new applePrefab(this, 1168, 0);
		row_2.add(rectangle_67);

		// row_3
		const row_3 = this.add.container(91, 387);

		// rectangle_68
		const rectangle_68 = new applePrefab(this, 0, 0);
		row_3.add(rectangle_68);

		// rectangle_69
		const rectangle_69 = new applePrefab(this, 73, 0);
		row_3.add(rectangle_69);

		// rectangle_70
		const rectangle_70 = new applePrefab(this, 146, 0);
		row_3.add(rectangle_70);

		// rectangle_71
		const rectangle_71 = new applePrefab(this, 219, 0);
		row_3.add(rectangle_71);

		// rectangle_72
		const rectangle_72 = new applePrefab(this, 292, 0);
		row_3.add(rectangle_72);

		// rectangle_73
		const rectangle_73 = new applePrefab(this, 365, 0);
		row_3.add(rectangle_73);

		// rectangle_74
		const rectangle_74 = new applePrefab(this, 438, 0);
		row_3.add(rectangle_74);

		// rectangle_75
		const rectangle_75 = new applePrefab(this, 511, 0);
		row_3.add(rectangle_75);

		// rectangle_76
		const rectangle_76 = new applePrefab(this, 584, 0);
		row_3.add(rectangle_76);

		// rectangle_77
		const rectangle_77 = new applePrefab(this, 657, 0);
		row_3.add(rectangle_77);

		// rectangle_78
		const rectangle_78 = new applePrefab(this, 730, 0);
		row_3.add(rectangle_78);

		// rectangle_79
		const rectangle_79 = new applePrefab(this, 803, 0);
		row_3.add(rectangle_79);

		// rectangle_80
		const rectangle_80 = new applePrefab(this, 876, 0);
		row_3.add(rectangle_80);

		// rectangle_81
		const rectangle_81 = new applePrefab(this, 949, 0);
		row_3.add(rectangle_81);

		// rectangle_82
		const rectangle_82 = new applePrefab(this, 1022, 0);
		row_3.add(rectangle_82);

		// rectangle_83
		const rectangle_83 = new applePrefab(this, 1095, 0);
		row_3.add(rectangle_83);

		// rectangle_84
		const rectangle_84 = new applePrefab(this, 1168, 0);
		row_3.add(rectangle_84);

		// row_4
		const row_4 = this.add.container(91, 461);

		// rectangle_85
		const rectangle_85 = new applePrefab(this, 0, 0);
		row_4.add(rectangle_85);

		// rectangle_86
		const rectangle_86 = new applePrefab(this, 73, 0);
		row_4.add(rectangle_86);

		// rectangle_87
		const rectangle_87 = new applePrefab(this, 146, 0);
		row_4.add(rectangle_87);

		// rectangle_88
		const rectangle_88 = new applePrefab(this, 219, 0);
		row_4.add(rectangle_88);

		// rectangle_89
		const rectangle_89 = new applePrefab(this, 292, 0);
		row_4.add(rectangle_89);

		// rectangle_90
		const rectangle_90 = new applePrefab(this, 365, 0);
		row_4.add(rectangle_90);

		// rectangle_91
		const rectangle_91 = new applePrefab(this, 438, 0);
		row_4.add(rectangle_91);

		// rectangle_92
		const rectangle_92 = new applePrefab(this, 511, 0);
		row_4.add(rectangle_92);

		// rectangle_93
		const rectangle_93 = new applePrefab(this, 584, 0);
		row_4.add(rectangle_93);

		// rectangle_94
		const rectangle_94 = new applePrefab(this, 657, 0);
		row_4.add(rectangle_94);

		// rectangle_95
		const rectangle_95 = new applePrefab(this, 730, 0);
		row_4.add(rectangle_95);

		// rectangle_96
		const rectangle_96 = new applePrefab(this, 803, 0);
		row_4.add(rectangle_96);

		// rectangle_97
		const rectangle_97 = new applePrefab(this, 876, 0);
		row_4.add(rectangle_97);

		// rectangle_98
		const rectangle_98 = new applePrefab(this, 949, 0);
		row_4.add(rectangle_98);

		// rectangle_99
		const rectangle_99 = new applePrefab(this, 1022, 0);
		row_4.add(rectangle_99);

		// rectangle_100
		const rectangle_100 = new applePrefab(this, 1095, 0);
		row_4.add(rectangle_100);

		// rectangle_101
		const rectangle_101 = new applePrefab(this, 1168, 0);
		row_4.add(rectangle_101);

		// row_5
		const row_5 = this.add.container(91, 535);

		// rectangle_102
		const rectangle_102 = new applePrefab(this, 0, 0);
		row_5.add(rectangle_102);

		// rectangle_103
		const rectangle_103 = new applePrefab(this, 73, 0);
		row_5.add(rectangle_103);

		// rectangle_104
		const rectangle_104 = new applePrefab(this, 146, 0);
		row_5.add(rectangle_104);

		// rectangle_105
		const rectangle_105 = new applePrefab(this, 219, 0);
		row_5.add(rectangle_105);

		// rectangle_106
		const rectangle_106 = new applePrefab(this, 292, 0);
		row_5.add(rectangle_106);

		// rectangle_107
		const rectangle_107 = new applePrefab(this, 365, 0);
		row_5.add(rectangle_107);

		// rectangle_108
		const rectangle_108 = new applePrefab(this, 438, 0);
		row_5.add(rectangle_108);

		// rectangle_109
		const rectangle_109 = new applePrefab(this, 511, 0);
		row_5.add(rectangle_109);

		// rectangle_110
		const rectangle_110 = new applePrefab(this, 584, 0);
		row_5.add(rectangle_110);

		// rectangle_111
		const rectangle_111 = new applePrefab(this, 657, 0);
		row_5.add(rectangle_111);

		// rectangle_112
		const rectangle_112 = new applePrefab(this, 730, 0);
		row_5.add(rectangle_112);

		// rectangle_113
		const rectangle_113 = new applePrefab(this, 803, 0);
		row_5.add(rectangle_113);

		// rectangle_114
		const rectangle_114 = new applePrefab(this, 876, 0);
		row_5.add(rectangle_114);

		// rectangle_115
		const rectangle_115 = new applePrefab(this, 949, 0);
		row_5.add(rectangle_115);

		// rectangle_116
		const rectangle_116 = new applePrefab(this, 1022, 0);
		row_5.add(rectangle_116);

		// rectangle_117
		const rectangle_117 = new applePrefab(this, 1095, 0);
		row_5.add(rectangle_117);

		// rectangle_118
		const rectangle_118 = new applePrefab(this, 1168, 0);
		row_5.add(rectangle_118);

		// row_6
		const row_6 = this.add.container(91, 609);

		// rectangle_119
		const rectangle_119 = new applePrefab(this, 0, 0);
		row_6.add(rectangle_119);

		// rectangle_120
		const rectangle_120 = new applePrefab(this, 73, 0);
		row_6.add(rectangle_120);

		// rectangle_121
		const rectangle_121 = new applePrefab(this, 146, 0);
		row_6.add(rectangle_121);

		// rectangle_122
		const rectangle_122 = new applePrefab(this, 219, 0);
		row_6.add(rectangle_122);

		// rectangle_123
		const rectangle_123 = new applePrefab(this, 292, 0);
		row_6.add(rectangle_123);

		// rectangle_124
		const rectangle_124 = new applePrefab(this, 365, 0);
		row_6.add(rectangle_124);

		// rectangle_125
		const rectangle_125 = new applePrefab(this, 438, 0);
		row_6.add(rectangle_125);

		// rectangle_126
		const rectangle_126 = new applePrefab(this, 511, 0);
		row_6.add(rectangle_126);

		// rectangle_127
		const rectangle_127 = new applePrefab(this, 584, 0);
		row_6.add(rectangle_127);

		// rectangle_128
		const rectangle_128 = new applePrefab(this, 657, 0);
		row_6.add(rectangle_128);

		// rectangle_129
		const rectangle_129 = new applePrefab(this, 730, 0);
		row_6.add(rectangle_129);

		// rectangle_130
		const rectangle_130 = new applePrefab(this, 803, 0);
		row_6.add(rectangle_130);

		// rectangle_131
		const rectangle_131 = new applePrefab(this, 876, 0);
		row_6.add(rectangle_131);

		// rectangle_132
		const rectangle_132 = new applePrefab(this, 949, 0);
		row_6.add(rectangle_132);

		// rectangle_133
		const rectangle_133 = new applePrefab(this, 1022, 0);
		row_6.add(rectangle_133);

		// rectangle_134
		const rectangle_134 = new applePrefab(this, 1095, 0);
		row_6.add(rectangle_134);

		// rectangle_135
		const rectangle_135 = new applePrefab(this, 1168, 0);
		row_6.add(rectangle_135);

		// row_7
		const row_7 = this.add.container(91, 683);

		// rectangle_136
		const rectangle_136 = new applePrefab(this, 0, 0);
		row_7.add(rectangle_136);

		// rectangle_137
		const rectangle_137 = new applePrefab(this, 73, 0);
		row_7.add(rectangle_137);

		// rectangle_138
		const rectangle_138 = new applePrefab(this, 146, 0);
		row_7.add(rectangle_138);

		// rectangle_139
		const rectangle_139 = new applePrefab(this, 219, 0);
		row_7.add(rectangle_139);

		// rectangle_140
		const rectangle_140 = new applePrefab(this, 292, 0);
		row_7.add(rectangle_140);

		// rectangle_141
		const rectangle_141 = new applePrefab(this, 365, 0);
		row_7.add(rectangle_141);

		// rectangle_142
		const rectangle_142 = new applePrefab(this, 438, 0);
		row_7.add(rectangle_142);

		// rectangle_143
		const rectangle_143 = new applePrefab(this, 511, 0);
		row_7.add(rectangle_143);

		// rectangle_144
		const rectangle_144 = new applePrefab(this, 584, 0);
		row_7.add(rectangle_144);

		// rectangle_145
		const rectangle_145 = new applePrefab(this, 657, 0);
		row_7.add(rectangle_145);

		// rectangle_146
		const rectangle_146 = new applePrefab(this, 730, 0);
		row_7.add(rectangle_146);

		// rectangle_147
		const rectangle_147 = new applePrefab(this, 803, 0);
		row_7.add(rectangle_147);

		// rectangle_148
		const rectangle_148 = new applePrefab(this, 876, 0);
		row_7.add(rectangle_148);

		// rectangle_149
		const rectangle_149 = new applePrefab(this, 949, 0);
		row_7.add(rectangle_149);

		// rectangle_150
		const rectangle_150 = new applePrefab(this, 1022, 0);
		row_7.add(rectangle_150);

		// rectangle_151
		const rectangle_151 = new applePrefab(this, 1095, 0);
		row_7.add(rectangle_151);

		// rectangle_152
		const rectangle_152 = new applePrefab(this, 1168, 0);
		row_7.add(rectangle_152);

		// row_8
		const row_8 = this.add.container(91, 757);

		// rectangle_153
		const rectangle_153 = new applePrefab(this, 0, 0);
		row_8.add(rectangle_153);

		// rectangle_154
		const rectangle_154 = new applePrefab(this, 73, 0);
		row_8.add(rectangle_154);

		// rectangle_155
		const rectangle_155 = new applePrefab(this, 146, 0);
		row_8.add(rectangle_155);

		// rectangle_156
		const rectangle_156 = new applePrefab(this, 219, 0);
		row_8.add(rectangle_156);

		// rectangle_157
		const rectangle_157 = new applePrefab(this, 292, 0);
		row_8.add(rectangle_157);

		// rectangle_158
		const rectangle_158 = new applePrefab(this, 365, 0);
		row_8.add(rectangle_158);

		// rectangle_159
		const rectangle_159 = new applePrefab(this, 438, 0);
		row_8.add(rectangle_159);

		// rectangle_160
		const rectangle_160 = new applePrefab(this, 511, 0);
		row_8.add(rectangle_160);

		// rectangle_161
		const rectangle_161 = new applePrefab(this, 584, 0);
		row_8.add(rectangle_161);

		// rectangle_162
		const rectangle_162 = new applePrefab(this, 657, 0);
		row_8.add(rectangle_162);

		// rectangle_163
		const rectangle_163 = new applePrefab(this, 730, 0);
		row_8.add(rectangle_163);

		// rectangle_164
		const rectangle_164 = new applePrefab(this, 803, 0);
		row_8.add(rectangle_164);

		// rectangle_165
		const rectangle_165 = new applePrefab(this, 876, 0);
		row_8.add(rectangle_165);

		// rectangle_166
		const rectangle_166 = new applePrefab(this, 949, 0);
		row_8.add(rectangle_166);

		// rectangle_167
		const rectangle_167 = new applePrefab(this, 1022, 0);
		row_8.add(rectangle_167);

		// rectangle_168
		const rectangle_168 = new applePrefab(this, 1095, 0);
		row_8.add(rectangle_168);

		// rectangle_169
		const rectangle_169 = new applePrefab(this, 1168, 0);
		row_8.add(rectangle_169);

		// rectangle_171
		const rectangle_171 = this.add.rectangle(1324, 75, 22, 752);
		rectangle_171.setOrigin(0, 0);
		rectangle_171.isFilled = true;
		rectangle_171.fillColor = 4170789;

		// text_1
		const text_1 = this.add.text(1298, 24, "", {});
		text_1.scaleX = 0.9;
		text_1.scaleY = 1.3;
		text_1.text = "TIME";
		text_1.setStyle({ "color": "#000000ff", "fontSize": "32px", "fontStyle": "bold", "stroke": "#000000ff" });

		// lists
		const list: Array<any> = [];

		this.editabletilemap = editabletilemap;
		this.list = list;

		this.events.emit("scene-awake");
	}

	private editabletilemap!: Phaser.Tilemaps.Tilemap;
	private list!: Array<any>;

	/* START-USER-CODE */

	// Write your code here

	create() {

		this.editorCreate();
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
