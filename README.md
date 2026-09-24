# VECTOR CUT

船体を指で切り、**切り落とした質量の反動**で速度・回転・形を操り、さらに**飛んでいく切断片自体を仕掛けへ当てて使う**iPhone向け無重力アクションです。

**一文のゲーム設計:** プレイヤーは現在の速度・回転・船体形状を観察し、どこをどの角度で切り落とすか判断し、切断反動だけでコアをドックへ静かにLOCKする技術に上達する。

## MIDNIGHT JUNCTION / ABYSSAL ECHOとは別物

このrepoで以前公開していたゲームのゲーム性は引き継いでいません。

- 線路、列車、分岐器、運行管理なし
- ソナー、探索、隠れた生物、反響捕捉なし
- プレイヤーキャラクター移動用のstickなし
- 攻撃buttonなし
- 主操作は**船体を横切る1本のドラッグ**だけ

同じ静的Web/PWA基盤とiPhone向け入力保護だけを再利用し、判断ループは新規です。

## 操作

1. 船体の外側から反対側へ、指で線を引きます。
2. ドラッグ中に
   - 緑 = 残る船体
   - 赤 = 切り落とす船体
   - 緑矢印 = CUT後の反動方向
   - `CW / CCW` = 追加される回転方向
   を予告します。
3. 緑の点線はCUT後の自機、赤の点線は切断片の約1秒先までを予告します。
4. 指を離すとCUT確定。切断片はしばらく実体として残り、SCRAP SWITCHを起動できます。
5. オレンジのコアを緑のドックへ入れ、必要な速度・向き・船体サイズ・SWITCH条件を満たすとLOCKします。

切断線がコアへ近すぎる、船体を横切っていない、薄すぎる切断、残存質量25%未満になる切断は実行せず理由を表示します。

## 8 CHAMBERS

1. **FIRST RECOIL** — 切った側と逆へ進む基本反動。
2. **BRAKE VECTOR** — 進行方向側を切り、逆向き反動で減速。
3. **COUNTERSPIN** — 重心から外したCUTで回転を制御。
4. **NARROW GATE** — 船体形状そのものを削って狭いゲートを通過。
5. **VECTOR LOCK** — 速度・回転・形・ゲートを統合。
6. **SCRAP LINK** — 切断片をSCRAP SWITCHへ当てながら、自機は反対側へ進む。
7. **HEAVY VECTOR** — 二重リングの高密度材を読み、面積ではなく質量で反動を設計する。
8. **TWIN PURPOSE** — 高密度材・切断片・SWITCH LOCKゲート・姿勢LOCKを同時に処理する。

難度は単なる速度上昇ではなく、同じCUTに「推進・制動・回転・形状編集・切断片操作・質量選択」という用途を段階的に重ねます。

## 上達指標

- FINAL SCORE
- TOTAL CUTS
- FINAL MASS
- 接触回数
- 各ドックの残り時間

高得点は、無意味な連打ではなく**少ないCUT・多い残存質量・早いLOCK・少ない接触**へ結びつきます。

## iPhone / Web

- Canvas 2D
- 60Hz固定ステップ
- Pointer Events
- `touch-action: none`
- pinch / double-tap / page scroll抑制
- safe-area対応
- browser focus / visibility変化では自動Pauseしない
- Web AudioによるCUT / collision / LOCKの短いfeedback
- hapticは補助で、OFFでも必要情報を失わない
- DPR上限を設定
- 外部画像・外部font・外部通信なし

## game-core

制作前に `yz4git/game-core` の2026-09-24現在の `main` にある **全89 Markdown** を現在treeから読み直しています。

利用したのは各資料から抽象化済みの設計原則であり、雑誌本文や著作権保護された表現の転載ではありません。

特に反映した原則:

- one-sentence game
- simple controls / dense mastery
- direct touch
- preview before commitment
- failure should produce information
- multi-purpose tools
- difficulty by new decisions, not only faster numbers
- second mastery objective
- fast retry
- attract screen as teaching
- visual feedback must escape finger occlusion
- calibration / input reliability is game quality

詳細: [`docs/design-notes.md`](docs/design-notes.md)

## ローカル起動

依存packageはありません。

```sh
python3 -m http.server 4173
```

またはJavaScript構文確認:

```sh
npm run check
```

## GitHub Pages

公開URL:

https://yz4git.github.io/newgame1/

### Cache更新

デプロイ時のGit commit SHAを `__BUILD_ID__` へ埋め込み、JS/CSS/Service Workerをcommit単位で分離します。

Service Workerはこのrepoが過去に使った次のcacheだけを整理します。

- `vector-cut-newgame1-*`
- `abyssal-echo-newgame1-*`
- `midnight-junction-newgame1-*`
- `afterwake-newgame1-*`
- 旧AFTERWAKE固定cache

他projectのcacheは削除しません。プレイ中の強制reloadもしません。

古い画面が残る場合:

https://yz4git.github.io/newgame1/latest.html

## v1.1 — Scrap Is A Tool

game-coreの「既存能力へ第二用途を与える」「未来情報で計画を作る」「難易度は問いを増やす」という原則から、CUTそのものを拡張しました。

- 切断片を12秒程度残る物理オブジェクトへ変更
- 切断片だけが起動できるSCRAP SWITCH
- SWITCHが開くロックゲート
- CUT前に自機と切断片の約1秒先までの軌道を表示
- 二重リングで見える高密度材を追加
- 高密度材を含む側は同じ面積でも反動が強くなる
- CHAMBER 6〜8で新要素をIntroduce → Practice → Combine
- SCRAP LINK成功はスコア加点と独立した音・振動で確認
