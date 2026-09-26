# JET DRIFT

宇宙空間で慣性を制御する、iPhone向け短時間ステージ制アクションです。

## コアループ

- 左スティックで噴射口（ノズル）の向きを決める
- JETボタンを押している間だけ噴射する
- 推力はノズルの反対方向へ働く
- 噴射を止めても速度は残る
- 慣性を読んでワープ口へ飛び込めば即クリア
- 障害物接触・TIME OUT・宇宙域外へ出ると即FAIL
- FAIL後は約0.52秒で同じステージを自動リトライ

プレイヤーは常に画面中央に表示し、宇宙空間側をスクロールさせます。

## UI

- 左下: ノズル方向スティック
- 右下: JETボタン
- 左上: STAGE / TIME / SPEED / SCORE
- 左上2段目: JET FUELゲージ
- 右上: ミニマップ
- ミニマップにプレイヤー、ワープ口、障害物、燃料回復を表示

スティックとJETは別Pointer IDで処理するため、iPhoneで同時押し可能です。

## ステージ進行

- STAGE 01–03: 慣性制御とワープ
- STAGE 04–05: アステロイド
- STAGE 06–08: 移動機雷
- STAGE 09–12: 重力場
- STAGE 13–18: 回転レーザー
- STAGE 19–24: 複合配置
- STAGE 25+: 自動生成ENDLESS

各ステージは番号をseedにした決定論的生成なので、同じ番号なら同じ配置になります。

## 燃料

JET中のみ燃料を消費します。緑色の + アイテムで燃料回復。燃料0でも慣性は残るため、速度が残っていればそのままワープへ入れます。燃料0かつ低速状態が続くとFAILです。

## テンポ

- 1ステージ約6.5〜10.5秒
- 成功 → 約0.36秒で次ステージ
- 失敗 → 約0.52秒で同じステージ
- 難度は操作追加ではなく、障害物・重力・動く危険・燃料判断の組み合わせで上げる

## iPhone / Web

- Canvas 2D / 60Hz fixed timestep
- Pointer Events / multi-touch
- touch-action:none
- pinch / double-tap zoom / scroll抑制
- safe-area対応
- DPR上限1.8
- PWA / Service Worker
- commit SHA単位asset cache busting
- 外部画像・外部font・外部通信なし

## GitHub Pages

https://yz4git.github.io/newgame1/

キャッシュ更新:

https://yz4git.github.io/newgame1/latest.html

## v1.1 — Countdown / Warp / Explosion

- TIME表示を大型化
- 残り4秒以下で警告色、2.5秒以下で赤点滅
- ステージクリア後は約1.0秒のワープ演出を再生してから次ステージ
- ワープ時は自機縮小・消失、同心円トンネル、放射ストリーク、最終ホワイトアウト
- 失敗時は約0.5秒の爆発演出
- 爆発は画面フラッシュ、火球、破片ストリーク、衝撃波リング
- CLEAR / FAILのハプティクスも演出に合わせて強化

## v1.2 — Forgiving Warp / Crisis Feedback

- ステージ生成範囲の外へ出ても死亡しない
- マップ外へ流れてもTIME OUTや燃料状況で自然に決着
- ワープ口のクリア判定を少し拡大
- TIME 4秒以下で警告、2.5秒以下で強い危機演出
- TIME危険時はHUDに加え、画面端の赤パルス＋中央上部の大型残り時間
- FUEL 25%以下でLOW、12%以下でCRITICAL
- FUEL危険時は燃料パネルを点滅させ、画面下部にも大きな警告
- TIME/FUEL閾値到達時に短い警告音とハプティクス
- マップ外へ出てもミニマップの自機マーカーは外周へクランプ表示

## v1.3 — SOUND WAVE 8BIT Studio Audio

`yz4git/sound-wave` の 8BIT Studio 実装を参照し、同じ `sound-wave-eight-bit-v1` 4ch方式をJET DRIFTへ導入。

- BGM: BATTLE系 164 BPM / 4 bars / 約5.85秒ループ
- PULSE1 / PULSE2 / TRIANGLE / NOISE の4chチップ構成
- ステージを跨いでBGMを連続再生
- ワープ: MAGIC + CRITICAL
- 爆発: EXPLOSION
- 燃料取得: PICKUP
- TIME / FUEL警告: DAMAGE
- BGMとSEは決定論的seedで毎回同じ音
- WAV外部読み込みなし。Web Audioで8BIT Studioイベントを直接スケジュール
- FAIL後の次試行開始時に前のSEを停止し、爆発音の尾が次ステージへ残らない
- JET持続音のみ、操作フィードバック優先で従来の連続oscillatorを維持

再現用の設定は `docs/jet-drift-8bit-audio.md` に記録。

## v1.4 — Title UI / Warp Target / Nozzle Cursor / New BGM Seed

- タイトル画面では操作不能なSTICK / JET / utility UIを完全に非表示
- PAUSE中も操作UIを非表示、再開時に復帰
- 8BIT Studio BGM seedを `0x53504143` ("SPAC") へ変更
- 噴射方向表示を四角い部品から、エンジンベル＋点火予兆フレアへ変更
- JET未使用時でもノズル先端に小さな発光があり「ここから噴射する」と読める
- ワープクリア時、自機は画面中央から実際のワープ口中心へ吸い込まれる
- ハイパースペースの星ストリークと発光も実際のワープ口中心から発生
- ワープ中はミニマップや方向表示を隠し、演出へ視線を集中

## v1.5 — Dynamic Tempo / Spin Warp / Warp Out

- 8BIT Studio BGM seedは `0x53504143` ("SPAC") のまま維持
- 通常BGMを132 BPMへ減速
- TIMEが2.5秒以下、またはFUELが12%以下の赤警告域に入ると、同じフレーズのまま164 BPMへ切替
- FUEL回復で赤域を抜け、TIMEも赤でなければ132 BPMへ戻る
- ワープイン時、自機は約2回転以上しながらワープ口中心へ吸い込まれる
- 次ステージは約0.72秒のワープアウト演出から開始
- ワープアウト中はTIMEを減らさず、操作入力も受け付けない
- 星ストリークが中心へ収束し、自機が回転しながら小→通常サイズへ実体化

## v1.5.1 — 120 BPM / Control Lift

- 通常BGMを132 BPMから120 BPMへさらに減速
- 赤警告時の164 BPMは変更なし
- STICKとJETを、従来位置からスティック約1個分上へ移動
- iPhone向けの小画面では104px、通常レイアウトでは約118px上へ移動
- サウンド/ポーズのutilityも同じ操作クラスターに合わせて上へ移動

## v1.5.2 — Control Position / Title Start Hitbox

- STICKとJETをv1.5.1位置から約0.5スティック分下へ調整
- 通常レイアウト: STICK bottom 79px / JET bottom 84px
- 小画面: STICK bottom 67px / JET bottom 72px
- タイトルのSTARTボタンは見た目と実タップ矩形を同じ固定サイズへ統一
- iPhone Safariでズレ要因になり得る押下時transformを廃止
- タイトル本文のpointer hitを無効化し、STARTと更新リンクだけを操作対象に限定

## v1.5.3 — 110 BPM / Quarter-Lift / Start Heading

- 通常BGMを120 BPMから110 BPMへ減速
- 赤警告時の164 BPMは変更なし
- STICKとJETをv1.5.2位置から約0.25スティック分上へ移動
- ステージ開始時、自機の機首をワープ口を示す矢印方向へ向けて初期化
- ノズル初期方向は従来どおり機首の反対側なので、開始直後のJETでワープ口方向へ加速できる

## v1.5.4 — Restore Start Heading / Align Nozzle

- ステージ開始時の機首向きを、ワープ口方向へ向ける仕様から元の固定向きへ戻した
- 自機は毎ステージ開始時に右向き（angle 0）で開始
- 噴射口の初期角度は、その機首の真反対へ自動設定
- したがって開始時の噴射口は左向きとなる

## v1.6.0 — Ghost Line / Line Rating / Five New Gimmicks

### ゴースト軌跡
- 各ステージの直前走行を端末内に保存
- リトライ時は前回の走行ラインを半透明の破線で表示
- 走行時間に同期してGHOST機もライン上を再生
- 通常24ステージに加えENDLESSの最近の走行も一定数保存
- 外部通信なし。localStorageのみ使用

### ライン取り評価
- クリア時にLINE S / A / B / C / Dを表示
- 主評価は実走行距離÷スタートからワープ口までの直線距離
- 残りTIMEとFUELも補助評価
- 評価点をスコアボーナスへ加算
- ワープ演出中にPATH倍率と評価点を表示

### 新ギミック5種類
1. SOLAR WIND — 青い流れの中で一定方向へ加速
2. PULSE BEACON — 周期的な衝撃波で自機を押し出す
3. PHASE GATE — 周期的に実体化するレーザー壁。消失時に抜けるか端を迂回
4. BOOST RING — 通過するとワープ方向へ速度ブースト
5. DRAG CLOUD — 内部で速度が減衰する星雲。短く横切るか迂回

すべて既存のSTICK + JETだけで攻略でき、操作ボタンは追加しない。

## v1.7.0 — Experimental 3D Wireframe Warp

- 従来の2Dワープ演出を削除せず、実験機能として3Dワイヤーフレーム演出を追加
- デフォルトはON
- PAUSE画面の `3D WIREFRAME WARP` をOFFにすると従来演出へ即時復帰
- 設定はlocalStorageへ保存し、保留したまま従来版を使える

### Warp In
- 2D画面のワープ口を消失点として使用
- 画面四隅とグリッドが消失点へ収束し、2D平面から遠近感のある3Dカメラへ連続移行
- 多角形リング＋縦レールのワイヤーフレームトンネルへ接続
- 自機は通常2D描画からワイヤーフレーム機へクロスフェードし、回転しながら奥へ吸い込まれる
- 最後に短いホワイトフラッシュ

### Warp Out
- 次ステージは3Dワイヤーフレームトンネル内から開始
- カメラの奥行きを徐々に潰しながら2D正面視点へ戻す
- ワイヤーフレーム機から通常2D自機へクロスフェード
- 演出完了までTIME停止・操作無効
- HUD/操作UIは演出中フェードして視界を空ける

Canvas 2D上の軽量な疑似3D投影で実装し、three.js等の追加依存は増やしていない。

## v1.7.1 — Projection Morph Warp

3D WIREFRAME WARPを「別3D演出の重ね描き」から「ゲーム世界そのものの投影変形」へ変更。

- 通常時の既存2D描画をそのまま使用
- ワープ中だけworldToScreenを正投影から透視投影へ連続補間
- ステージの進行方向を3Dカメラの奥方向として扱う
- 星、ワープ口、障害物、レーザー、ギミック、ゴースト線、自機すべて同じ投影変換を受ける
- 奥行きに応じて位置だけでなく大きさも変化
- 円・面要素は奥行き方向に圧縮され、2D平面がそのまま3D空間の床面へ起き上がる
- 同一ワールド座標上の補助グリッドも同じ投影で表示
- 旧v1.7の別ワイヤーフレームトンネルと別ワイヤーフレーム自機は表示しない
- ワープ境界の短い白フラッシュだけ残す
- ワープアウトは同じ投影を逆補間して3D→通常2Dへ接続
- ExperimentalをOFFにすると従来2Dワープへ戻せる

## v1.8.0 — 3D Hyperspace Stage Transition

v1.7.1の「2D→3Dへ投影そのものが変形する」仕組みを維持したまま、その後のステージ切替ワープを高速ハイパースペース演出へ拡張。

- まず既存ゲーム世界が正投影2Dから透視投影3Dへ変形
- 3D視点が完成してからハイパースペース加速を開始
- 星は3D深度を持つ点として扱い、前フレーム相当の深度位置と現在位置を結んで長い光条へ変化
- 光条は画面中央上寄りの消失点から放射状に伸び、高速前進感を出す
- ワープ突入後半はステージ描画を暗くしつつ光条を主役にしてステージ境界を隠す
- 切替直前は短い強い白フラッシュ
- 次ステージは長い光条が残った状態から始まり、減速するように光条が短くなる
- その後3D透視投影から通常2D正投影へ戻る
- 自機は同じ描画のまま奥へ縮小して消え、次ステージ側で奥から同じ機体が戻る
- TIME停止・操作無効は継続
- PAUSEのExperimental OFFで従来2Dワープへ戻せる

## v1.8.1 — Stable Ship During Warp

- 3Dハイパースペース演出中の自機のクルクル回転を削除
- 2D→3D投影変形、奥への縮小、ハイパースペース光条、ワープアウト時の拡大復帰は維持
- 自機の向きは通常ゲーム側の機首角度だけを使用

## v1.8.2 — Warp-Out Start Heading

- ワープアウト後の新ステージ開始時だけ、自機の機首を画面上向き（-90°）へ変更
- 初回STAGE 01開始時は従来どおり右向き
- 噴射口は機首の真反対方向へ自動設定されるため、ワープアウト後は下向きから開始

## v1.8.3 — Out-of-Map Fuel Explosion

- マップ範囲外に出ている状態でFUELが0になったら即座に爆発してFAIL
- FAIL表示は `LOST IN SPACE`
- マップ内では従来どおり、燃料0でも慣性が残っていればそのまま航行可能
- マップ内で燃料0かつ低速になった場合の従来OUT OF FUEL判定も維持

## v1.9.0 — Ghost Rival / Continuous Warp / Slingshot / Sectors / Specials

### 1. LAST + BEST Ghost
- 前回走行と自己ベスト走行を別々に保存
- LASTは青い破線、BESTは白い細破線
- 両方とも走行時間に同期した半透明機体を表示
- BESTはLINE評価点を優先し、同点ならクリア時間が速い走行へ更新
- 自己ベスト更新時は `NEW BEST` を表示
- localStorageのみ使用

### 2. Stage-to-Stage Warp Continuity
- クリア時の実際の進行速度ベクトルをワープ進行方向として保存
- 次ステージのワープアウト3D視点は前ステージの進行方向から開始
- ワープアウト中に次ステージの進行方向へ滑らかにカメラ軸を補間
- 自機のワープアウト後の上向き開始仕様は維持
- 2D→3D→ハイパースペース→次ステージ3D→2Dの流れを維持

### 3. Gravity Slingshot
- 重力井戸の引力カーブを近距離ほど強くなる形へ変更
- 重力井戸の内側で十分な接線速度を作るとSLINGSHOT charge
- 外向きに抜けた瞬間、現在の進行方向へ追加速度を付与
- `GRAVITY SLINGSHOT` と追加VELOCITYを表示
- スコアボーナスあり
- charge時は重力井戸にシアンの弧、使用後は緑の弧を表示

### 4. SECTOR System
- 6ステージを1 SECTORとしてグループ化
- HUDを `SECTOR 01 · 1/6 · STAGE 01` 表示へ変更
- SECTORごとに名称を付与
- 6面目は必ずSPECIALステージ
- SECTOR最終面クリア時はSECTOR CLEAR表示と追加ボーナス
- ENDLESS以降も6面単位のSECTOR構成を継続

### 5. Special Stages
SPECIALはSECTORごとに循環。

1. `VELOCITY ENTRY`
   - 上向きに高速初速を持った状態から開始
   - 最初の慣性を殺さず攻略するステージ

2. `SLINGSHOT ARC`
   - 初期燃料を大幅に制限
   - 2つの強い重力井戸を配置
   - JETだけでなく重力スリングショットを使うことが主攻略

3. `MOVING WARP`
   - ゴールのワープ口が進行方向と直交する軸で周期移動
   - 到達時刻を読んで進路を先回りする

4. `LASER CORRIDOR`
   - 通常レーザーに加え、進行ルート上へ3本の回転レーザーを追加
   - 周期を見て狭い区間を抜ける

最初の24ステージでは STAGE 06 / 12 / 18 / 24 がそれぞれ上記SPECIALになり、ENDLESSでは4種類を循環する。

## v1.9.1 — Fair Start / Deterministic Retry / Stage 06 Course Fix

### STAGE 06
- VELOCITY ENTRYの無操作直進クリアを廃止
- 初期の上向き高速慣性は維持
- 無操作直進ライン中央へ専用アステロイドを追加
- ワープ口を横へ150ずらし、実際に進路修正しないと到達できないコースへ変更

### Countdown Start
- ステージ開始直後はTIMEカウントを停止
- スティックを有効方向へ動かす、またはJETボタンを押した瞬間にカウント開始
- 入力待ち中は自機物理も停止
- 入力待ち中はステージギミック時計も停止
- VELOCITY ENTRYなど初速を持つステージでも、入力前に自機が勝手に進まない

### Deterministic Retry
- リトライ時はstageElapsedを必ず0へ戻す
- 移動地雷と回転レーザーをglobalTime依存からstageElapsed依存へ変更
- PHASE GATE / PULSE BEACON / MOVING WARPは既存のstageElapsed方式を維持
- アステロイド、地雷、燃料、重力井戸、DRAG CLOUDなどギミック側の主要視覚アニメーションもstageElapsedへ統一
- リトライ時は動的ギミックが毎回同じ位置・角度・周期位相から開始

## v1.9.2 — Faster Velocity Entry / Auto-Run Exception

### Initial-speed stage start rule
- 通常ステージはv1.9.1どおり、最初のスティック/JET入力までTIME・物理・ギミック時計を停止
- `startVelocity`を持つVELOCITY ENTRYだけは例外
- ワープアウト終了直後から未入力でも自機がスクロールし、TIMEカウントダウンも開始
- リトライ時も同じルールで自動スタート
- ギミック位相はstageElapsed=0から始まるため、リトライ時の初期状態は毎回同一

### VELOCITY ENTRY redesign
- 初速を185から310へ大幅アップ
- 通常ステージとの速度差を明確化
- コース全長を従来より約330延長
- 高速ステージ専用レイアウトとして通常のランダム危険物密度をリセット
- 最初の必須回避障害物をコース約60%地点へ配置し、初速310でも約1.7秒の操作猶予を確保
- 出口ワープを進行軸から横へ175ずらし、無操作直進ではクリア不可
- 後半の障害物は高速ラインを読めるサイドマーカー中心にして、310の速度でもクリア可能な余白を確保

## v1.10.0 — In-Play Stage Badge / Special Stage Identity

### Stage number in gameplay
- プレイ中画面右上に小型のSTAGE番号バッジを常時表示
- 通常面は控えめな半透明表示
- SPECIAL面は `SPECIAL · STAGE XX` 表示へ切り替え
- 既存のSECTOR/STAGE詳細HUDはそのまま維持

### Special stage presentation
- SPECIAL開始時に中央へ専用タイトル演出を約1.5秒表示
- SPECIAL STAGE / 専用名 / SECTOR番号とチャレンジ種別を表示
- VELOCITY ENTRY: 高速ストリーク
- SLINGSHOT ARC: 紫系の重力リング
- MOVING WARP: シアンの走査線
- LASER CORRIDOR: 赤い警戒エッジ
- 全SPECIALで薄い専用フレームを表示
- HUDステージカードと右上STAGEバッジもSPECIAL種別に応じて色を変更
- 演出はゲーム判定や操作を妨げず、追加ボタンなし
