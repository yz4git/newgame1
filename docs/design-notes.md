# ABYSSAL ECHO — Design Notes

2026-09-24時点の `yz4git/game-core` にある全89 Markdownを読み直した後に設計した。前作 `MIDNIGHT JUNCTION` の鉄道・線路・分岐器・経路管理・到着順予測を再利用した別スキンではなく、入力文法と判断対象から別ゲームにしている。

## 一文のゲーム

> プレイヤーは見えない海へソナーの中心を置き、返ってきた一瞬の輪郭と移動履歴から次の位置を予測し、限られた観測回数で標本を記録する。

## MIDNIGHT JUNCTIONと切り離した点

- 列車、ホーム、線路、分岐器、運行管理を完全に廃止。
- 固定ノードを切り替える操作を廃止。
- 次の対象を一覧表示するqueue UIを廃止。
- 主入力を「任意地点へ情報波を置く」と「可視化された対象を直接触る」に変更。
- 目標を配送／正着から、探索・観察・予測・記録へ変更。
- 世界を信号扱所から無照明の深海調査へ変更。

## game-coreから反映した主要原則

### 1. One-sentence game / observable decision loop
タイトルや設定より先に、観察→判断→入力→改善を一文で定義した。全追加要素は「どこへPINGを置くか」「いつ記録するか」を変えるものだけに絞った。

### 2. Touchはcontrollerのコピーではない
仮想stickや小型buttonを主入力にしない。位置そのものが意味を持つゲームなので、水面と生物を直接タップする。見た目の生物よりhit領域を大きくし、指で輪郭が隠れてもcapture particle・音・optional hapticが画面外側へ返る。

### 3. 少ない入力に技術密度を持たせる
基本gestureはtapだけだが、
- PING中心位置
- 対象の速度
- 逃げる方向
- 波が到達する時刻
- 2回観測の時間窓
- 熱水ノイズとの距離
で同じtapの価値が変わる。

### 4. Prediction itself is pleasurable
対象の現在位置を常時見せない。反響時の短いtrailから未来位置を読ませる。上達を「反応が速くなった」だけでなく「少ないPINGで先読みできた」にする。

### 5. 情報チャネルとしての音
PINGとecho音は視線をHUDへ移さず状態を伝える。ただしサウンドOFFでも輪郭・波紋・色・文字で同じ情報を得られ、音を必須条件にはしない。

### 6. 制限は判断を作るために使う
SONARは3回までだが、単なる弾切れではなく「今広く探すか、回復を待って確実に2回観測するか」を迷わせる。自動回復によって一度の浪費から永続的な失敗cascadeにはしない。

### 7. 難度を速度一本で上げない
- DIVE 1: 基本のPING→LOG
- DIVE 2: 移動予測、PINGで逃げるSKITTER
- DIVE 3: 熱水ノイズによる情報品質の選択
- DIVE 4: 2回観測のDEEP ECHOを既存要素と統合

速度も少し上がるが、主な増加は同時に考えるルールの種類。

### 8. Reveal rules remain learnable
ランダムな「見える／見えない」にせず、波面が実際に対象位置へ届いた時だけ反響する。同じ状況では同じ因果を返し、驚きは配置と相互作用から作る。

### 9. Failure produces information
時間切れ時には「未来位置へPINGを置く」という改善方向を結果画面に返す。SONAR不足時は入力を無視せずCHARGINGを明示する。DEEP ECHOの1回目は `1 / 2 ECHO` を表示し、なぜまだ記録できないかを説明する。

### 10. Success feedback is causal
捕捉した個体からparticleを放ち、species名、score、chainを同時に返す。単なる通貨ではなく「いま触った輪郭が正しかった」と0.5秒以内に理解できることを優先。

### 11. Score measures intended mastery
得点はspecies難度、連続捕捉、残SONAR、残時間へ寄せる。長時間待機や無意味な連打を高効率にしない。PINGS USEDをresultへ残し、クリアとは別の改善軸にする。

### 12. Short-session retry
失敗後は1buttonで即再開。長いdeath演出やmenu traversalを挟まない。全体は数分で一周でき、クリア後は少ないPING／高scoreを第二目標にする。

### 13. Safe-area / browser gesture reliability
`touch-action: none`、overscroll抑制、pinch/double-tap対策、safe-area内HUDを維持する。iOSのbrowser chromeや一時focus変化をゲーム内failureに変えないため、blur/visibilityによる自動Pauseはしない。

### 14. PWA更新のキャッシュ移行
同じrepoを別ゲームへ差し替えるため、新しいcache prefixだけでなく旧 `MIDNIGHT JUNCTION` と `AFTERWAKE` のprefixも所有cacheとして削除する。プレイ中は強制reloadしない。

## Fresh-eyes playtest項目

1. タイトルのデモだけで「波を出す→何かが見える」が10秒以内に推測できるか。
2. 最初のPING後、輪郭を直接触ることを長文説明なしで理解できるか。
3. 指で対象を隠してもcapture成功が分かるか。
4. DRIFTERのtrailから未来位置を読む行動が自然に生まれるか。
5. SKITTERの逃走がランダムではなく「PING中心から逃げた」と理解できるか。
6. 熱水域の偽反響が単なる視認性悪化ではなく、PING位置を変える判断になるか。
7. DEEP ECHOの1回目で「2回必要」が明確か。
8. SONARが0の時、ゲームが壊れたように見えないか。
9. 待つだけが最適戦略になっていないか。
10. 高scoreのrunほど少ない無駄PINGと素早いcaptureを伴っているか。
11. iPhone縦／横、小型／大型で主要play areaがsafe-areaや指で過度に隠れないか。
12. 複数tap・長押し・連続tapでpage zoom/scrollや勝手なPauseが起きないか。
13. 30分相当の繰り返しでも高頻度button reachを要求しないため疲労が小さいか。
14. Visual quality / Controls / Decisions / Learning / Pacing / Replayを別軸でレビューできるか。
