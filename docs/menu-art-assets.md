# タイトル・ロビーの参考素材

2026-10-12。ユーザー添付の「雪山スキーのクマ タイトル画面.png」「ふんわり雪ボタンの雪山ロビー.png」を編集対象として、組み込みimage_gen（imagegenスキル、CLI未使用）で6枚の素材に分離した。アプリの実行時は外部画像サービスへ接続しない。

保存先は web/public/assets/menu/。生成元は残し、新規ファイルとしてコピーした。元のSVGロゴ、3Dモデル、著作権・ライセンス表記を削除していない。画像生成による再構成のため、原画のピクセルをそのまま抽出した素材ではない。

| ファイル | 原寸 | 用途 |
|---|---|---|
| title-background.png | 1672×941 | ロゴ・クマ・小屋・開始案内を除いたタイトル背景 |
| lobby-background.png | 1672×941 | 小屋・クマ・UIを除いたロビー背景 |
| title-bear.png | 1289×1220 | 斜め向きのクマ、スキー、ストック、雪煙。透過 |
| lobby-bear.png | 1374×1145 | 後ろ向きのクマ、スキー、ストック、影。透過 |
| chalet.png | 1273×1236 | 木造小屋、雪屋根、入口、窓、階段。透過 |
| logo.png | 2172×724 | 白い雪ロゴ、青い厚みと肉球。透過 |

6枚合計約7.44 MB。スマートフォンでの読込時間・メモリー・FPSは未測定。メニューは静的な画像合成で、表示中のThree描画は省く。新しい推論やカメラは起動しない。

## 採用した最終プロンプト

### title-background.png
~~~text
Use case: precise-object-edit. Edit target: the attached snowy Be The Bear title illustration. Make a clean 16:9 game menu BACKGROUND PLATE for this exact illustration. Preserve the exact blue sky, sun, mountain/cloud panorama, framing, low-poly rocks, snow-covered fir trees, smooth snowy foreground and the winding pale-blue ski tracks. REMOVE only the entire title lettering/logo, the large foreground skiing bear including skis/poles/spray/shadow, the bottom paw/TAP TO START, and the small right cabin. Inpaint these removed regions seamlessly with the surrounding sky or snow, preserving nearby landscape. No text, UI, bear, buildings, buttons, logos, or people anywhere. Do not redesign the mountains. This is an image asset for a functioning game; separate UI and character layers will be overlaid later. Keep crisp snow texture, sunlight and original bright ice blue palette.
~~~

### title-bear.png
~~~text
Use case: background-extraction. Extract ONLY the exact skiing teddy bear from the foreground left of this reference into a tightly framed transparent PNG asset. Preserve its original three-quarter right-facing pose, warm brown fur, cream muzzle, black eyes/nose, blue skis, both poles, ski baskets, snow spray at its heels and subtle translucent contact shadow. Keep the original proportions and premium softly shaded low-poly 3D look; do not redesign or change pose. All skis and poles entirely inside the canvas with a small transparent margin. No landscape, no white rectangular background, no text, logo, cabin or UI. True alpha transparency. This will overlay the original clean background as an independent game menu character layer.
~~~

### lobby-bear.png
~~~text
Use case: background-extraction. Extract ONLY the rear-facing skiing brown teddy bear from this exact reference, including BOTH blue skis and both black/dark-blue ski poles, complete pole baskets, tiny round tail, no scarf/clothes, and soft translucent ground shadow extending to the LEFT. Match the reference's proportions and rear view, do not turn the head or add face. Tightly frame the entire extracted character on genuinely transparent alpha background with small clear margins. Maintain warm brown softly shaded low-poly 3D rendering and cyan skis. No snowfield, tracks, mountain, hut, text, logo, buttons or other objects. Asset for layering in an interactive game lobby.
~~~

### lobby-background.png
~~~text
Precise image edit: create a clean 16:9 BACKGROUND PLATE from the attached exact game lobby image. Preserve its bright blue sky, sun, mountain/cloud panorama, snow-covered firs, rolling white foreground snow and thin pale cyan ski tracks in exactly the original framing. Remove ALL UI, text, buttons, account icon, counters, all of the chalet/building including roof, chimney, door, steps and foreground rocks attached to building, and the skiing bear including poles, skis, shadow. Inpaint the building area as snowy slope with distant mountains/sky naturally continuous with surroundings. No text, no buildings, no bear, no buttons. Do not redesign the panorama. This is a background layer for independent interactive characters/building/UI to overlay.
~~~

### chalet.png
~~~text
Extract the original LEFT CHALET only as a transparent PNG foreground layer. Keep exactly the visible cropped wooden mountain hut of the reference: thick pillow-like white snow roof sloping down to the right, left portion cut by image border, chimney, timber beams, warm yellow windows, dark blue door on RIGHT of facade, white steps, snowy rock cluster at base. Keep original perspective/materials/light. Door fully visible. No SHOP button or connector line, no UI, no text, no mountains/sky, no bear, no terrain extending far from base. Genuine transparent alpha around roof and right edge and base rocks. Tightly frame, original visible building only (do not invent complete house left wing). Asset will be anchored cropped off left screen edge in game lobby.
~~~

### logo.png
~~~text
Extract only the exact Be The Bear logo in this reference onto a tightly framed transparent PNG. Exact text 'Be The Bear', single line, huge round white puffy letters, soft snow caps especially B/T/B, rich cyan extruded underside/depth, subtle blue shadows, dark blue paw inside the a of Bear. Preserve original letter shapes and spacing. No sky, mountains, bears, UI, start prompt or extra words. Full logo inside canvas with small transparent margins, wide aspect 4.5:1. Genuine alpha transparency, high quality crisp edges. Do not redesign the typography.
~~~

## 参考との差分と確認の限界

生成素材は直接表示して確認した。原画と比べてクマの頭身・面の細かさ、木造小屋の窓や岩、ロゴの字間・雪の縁に差が残る。背景の人物やUIを除いた部分は補完されている。タイトルの小屋非表示は以前の明示指定を維持。ゲスト登録/ログイン、言語、遊び方、記録の説明など、画像にない既存機能も残す。

ブラウザーが利用できず、合成後の実画面・影の馴染み・スクリーンショット比較は未確認。完全再現とは記載しない。縦画面では背景をcoverし、キャラクター、小屋、ロゴ、ボタンを独立配置するため、原画全体の縮小表示とは異なる。
