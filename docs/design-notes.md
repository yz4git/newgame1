# VECTOR CUT — Design Notes

## 読み込み前提

実装前に `yz4git/game-core` の現在の `main` に存在する全89 Markdownを読み直した。

設計はそこに保存されている著作権安全な抽象原則から行い、資料の文章・画面・固有表現をコピーしていない。

## One-sentence game

> プレイヤーは船体の現在速度・回転・形を観察し、切り落とす質量の位置と量を決め、CUT反動だけでコアをドックへLOCKすることに上達する。

「宇宙もの」という設定ではなく、**CUT位置が次の物理状態を作る**ことが差別化の中心。

## 旧newgame1と切り離した点

### MIDNIGHT JUNCTION
- route planningなし
- switchなし
- queueなし
- 到着順管理なし

### ABYSSAL ECHO
- hidden targetなし
- sonarなし
- reveal/captureなし
- spatial searchなし

### VECTOR CUT
- 常に見えている一つの船体が操作対象
- gestureはpoint tapではなくline drag
- 主問題は探索でなくmass / inertia / geometry
- goalは発見でなくphysics stateの整合

## Core loop

Observe  
→ Draw a cut  
→ Preview retained/discarded mass + recoil + spin  
→ Commit  
→ New velocity / rotation / silhouette  
→ Correct with the next cut  
→ Dock

ゲーム側の返答によって、同じdragが次の判断材料を作る。

## CUT一つに複数用途

新しいbuttonを増やさず、同じCUTを状況で使い分ける。

- **Thrust**: 後方を切って前進
- **Brake**: 前方を切って減速
- **Spin**: 重心から外したCUTでtorque
- **Counterspin**: 逆側を切って角速度を相殺
- **Shape**: ゲートに通るsilhouetteへ加工
- **Score optimization**: 必要最小量だけ切り、質量を残す

初心者は「切ると動く」を使い、上級者は一つの線で複数問題を同時に解く。

## Commit前のpreview

物理結果が完全なtrial-and-errorにならないよう、pointerを離す前に表示する。

- green: retained hull
- red: discarded hull
- arrow: resulting linear impulse
- `CW / CCW`: torque direction

これは簡単化ではなく、**入力前に意味ある判断を可能にする情報**。

## Failure grammar

入力が不成立な場合、無反応にはしない。

- `NO SECTION`: 船体を横切っていない
- `CORE PROTECTED`: cut lineがcoreへ近すぎる
- `CUT TOO THIN`: 意味のないsliver
- `MINIMUM MASS`: 25%未満になる
- `GATE CONTACT`: clearance不足 / speed過大
- `CHAMBER WALL`: vector control不足
- timeout: speedを作りすぎた、brake timingを改善

重要な失敗は「次に何を変えるか」へ翻訳する。

## Learning sequence

### Chamber 1 — Introduce
一回のCUTで反動を体験。

### Chamber 2 — Practice / inversion
同じ仕組みを逆方向へ使い、brakeを学ぶ。

### Chamber 3 — Test
CUT位置を重心からずらし、linear + angular responseを同時に読む。

### Chamber 4 — Combine with geometry
「移動するためのCUT」と「通過形状にするCUT」が競合する。

### Chamber 5 — Mastery
mass / speed / angular velocity / silhouette / orientationを同時に扱う。

ルールを途中で別ゲームへ置き換えない。

## Difficulty

増やさないもの:
- 敵HP
- 大量button
- 不可視random
- 単純な全体速度倍率

増やすもの:
- 同じCUTが担う目的
- commit時に考えるstate
- geometry constraint
- angular constraint
- resource tradeoff（残存mass）

## Resource design

弾数やenergy barではなく**船体そのものがresource**。

CUTは必ず将来の選択肢を減らすため、
- 今大きく切って強い反動
- 少量を残して後の調整余地
が競合する。

25% floorはsoft-lock回避用のsafety railであり、最適解を自動決定するものではない。

## Score

scoreは意図したskillを測る。

Positive:
- chamber clear
- remaining time
- remaining mass

Negative:
- excessive cuts
- wall/gate contact

「安全な場所で無限に操作する」ほど有利にならない。

## Touch-native input

仮想gamepadを使わず、指の線と切断面を1:1対応させる。

- 一本指で完結
- simultaneous buttonなし
- hit regionではなくcanvas全体をdirect manipulation surface化
- drag線はfingerの外側にも描画され、入力取得を確認可能
- preview arrowはfinger footprintから離れたbody center付近へ表示
- system edgeだけに依存するgestureは使わない

## iPhone browser reliability

- `viewport-fit=cover`
- scale固定
- `touch-action:none`
- overscroll防止
- gesturestart/change/end防止
- dblclick/double-tap zoom防止
- Pointer Captureでdrag継続
- safe-area HUD
- explicit pause only
- DPR上限

過去プロジェクトで問題になった「操作中にページzoom」「ブラウザfocus変化で勝手にpause」を再発させない。

## Art direction

深海blueだったABYSSAL ECHOから明確に切り離す。

- graphite / warm ivory / amber
- retained mass = ivory
- discard preview = coral red
- valid recoil = green
- core = orange
- industrial zero-g test chamber
- texture assetなし、shape / line / glowで情報階層を作る

静止画の装飾より、CUTとdrift中の読みやすさを優先。

## Fresh-eyes checklist

1. title demoを10秒見れば「線を引いて物体を切る」と推測できるか。
2. 最初のCUTで反動方向を理解できるか。
3. preview arrowと実際の速度変化が一致して感じられるか。
4. invalid CUT理由を次のgestureへ利用できるか。
5. Chamber 2で「前側を切ればbrake」という第二用途を自発的に理解できるか。
6. Chamber 3でCW/CCW previewがtorque学習を助けるか。
7. Chamber 4のgateは単なる狭さではなくshape decisionを作るか。
8. small repeated cutsが支配戦法になっていないか。
9. giant first cutだけで全chamberを解けないか。
10. high scoreと少CUT / high mass / low contactが相関するか。
11. fingerが重要なvector arrowやcoreを恒常的に隠さないか。
12. drag中にpage scroll / zoom / browser gestureが出ないか。
13. pointerがcanvas外へ少し出てもPointer Captureでgestureが破綻しないか。
14. blur / browser chromeによる勝手なpauseが起きないか。
15. failure→retryに長い待ち時間がないか。

## v1.1 — Scrap Is A Tool

### 破片の第二用途
従来はCUT後の赤い破片が主に演出だった。v1.1では同じ破片を物理オブジェクトとして一定時間残し、SCRAP SWITCHへ当てることで回路を起動できる。

一つのCUTが同時に二つの結果を作る。

- retained hull: 自機の速度・回転・形状を変える
- discarded scrap: 反対方向へ飛び、離れた仕掛けへ作用する

これにより「自機を右へ動かす」と「破片を左へ飛ばす」を一本の線で同時に設計する判断が生まれる。

### Planning horizon
CUT commit前に、緑の自機軌道と赤の切断片軌道を約1秒先まで表示する。
正解線を直接表示するのではなく、現在の入力が作る未来状態を短く可視化して、反射から計画へ移す。

### Visible mass density
二重リングの高密度材は追加質量を持つ。面積だけでなく、どの高密度材を切り捨てるかで反動量が変わる。
隠し補正にはせず、重量差を船体内の視覚文法として常時表示する。

### Learning sequence extension
6. SCRAP LINK — 切断片の第二用途を単独導入
7. HEAVY VECTOR — 質量分布を単独導入
8. TWIN PURPOSE — scrap / heavy mass / switch-locked gate / angle lockを統合

追加buttonや別操作modeは導入しない。同じ一本のdragに新しい判断を重ねる。
