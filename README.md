# MIDNIGHT JUNCTION

夜間の列車運行を担当するリアルタイム配線パズルです。列車の到着順と目的ホームを読み、線路上の分岐器を直接タップして、列車が到達する前に進路を組み替えます。

**一文のゲーム設計:** 次に来る列車を先読みし、分岐器をいつ・どの状態にするか判断して、複数の進路を同時に成立させるゲームです。

## 遊び方

- 列車の色／車体の文字 `A / B / C` が目的ホームです。
- 線路上の `01–04` の分岐器をタップすると、直進とクロスを切り替えます。
- 列車が分岐器へ接近すると一時的に `LOCK` されるため、到着する前に進路を作ります。
- 画面下の `NEXT TRAINS` には入線位置と目的ホームが表示されます。先読みして次の列車まで準備できます。
- 金縁の `EXP` 列車は通常より速く走ります。
- SHIFT 04では02番分岐器が点検中になり、別ルートを使う必要があります。
- 誤配を3回すると運行終了。各シフトを無誤配で抜けるとボーナスが入ります。

## 操作

| 操作 | タッチ | キーボード |
|---|---|---|
| 分岐器切替 | 分岐器を直接タップ | 1 / 2 / 3 / 4 |
| 一時停止 | 左下の `Ⅱ` | P / Escape |
| サウンド | 左下の `♪` | — |

仮想スティックや攻撃ボタンは使いません。iPhoneでは画面そのものを配線盤として直接操作します。

## 起動

依存パッケージなしの静的ゲームです。

```sh
python3 -m http.server 4173
```

ブラウザーで `http://localhost:4173/` を開いてください。HTTPSではPWA／オフライン起動に対応します。

## 実装メモ

- Canvas 2D、固定60Hzシミュレーション
- 5シフト、通常列車／EXPRESS／メンテナンス制約
- AudioContextによる短い状態音
- safe-area、`touch-action: none`、pinch/double-tap/scroll抑制
- フォーカス変化では自動ポーズせず、明示的なPause操作だけで停止
- ベストスコア／ベストストリークは `localStorage`
- 外部通信・外部画像・外部フォントなし
- 詳細な設計判断は [`docs/design-notes.md`](docs/design-notes.md)

## GitHub Pages

公開プレイURL: https://yz4git.github.io/newgame1/

`main` 更新後、GitHub ActionsからPagesへデプロイします。

### 更新とキャッシュ

- デプロイごとのGit commit SHAをbuild IDとしてJS/CSS/Service WorkerのURLとcache名へ埋め込みます。
- HTML/JS/CSS/manifest/version系はネットワーク優先です。
- 新Service Workerは `skipWaiting()` / `clients.claim()` で適用し、`midnight-junction-newgame1-*` と旧 `afterwake-newgame1-*` の専用cacheだけを整理します。
- プレイ中の強制reloadは行いません。
- 古い画面が残る場合は `https://yz4git.github.io/newgame1/latest.html` からこのprojectのService Worker/cacheだけを整理できます。
