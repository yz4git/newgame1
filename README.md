# ABYSSAL ECHO

暗い深海をソナーだけで調査する、タッチ主体の短編探索ゲームです。水中の好きな場所をタップすると波紋が広がり、波が見えない生物へ触れた瞬間だけ輪郭が浮かびます。その短い情報から移動を読み、見えている個体を直接タップして記録します。

**一文のゲーム設計:** 見えない対象へソナーを置き、返ってきた輪郭と軌跡から未来位置を予測し、少ないPINGで必要な標本を記録するゲームです。

## 遊び方

- 暗い海をタップすると `PING` を1回使い、そこを中心にソナー波が広がります。
- ソナー波が生物へ触れると、輪郭が短時間だけ見えるようになります。
- 見えている生物を直接タップすると標本として記録できます。
- `SONAR` は最大3回分。使った分は少しずつ自動回復します。
- 青の `DRIFTER` は素直に移動します。
- 黄の `SKITTER` はPINGを受けると音源から逃げるため、少し先へPINGを置くと捕捉しやすくなります。
- 後半の熱水域は偽反響を生みます。熱水の近くへPINGを置きすぎると視界が散らかります。
- 紫の `DEEP ECHO` は3秒以内に2回反響させて初めて完全に記録できます。
- 各DIVEで規定数を時間内に記録すると次へ進みます。全4DIVEを完了するとクリアです。

## 操作

| 操作 | iPhone / タッチ | PC |
|---|---|---|
| ソナー | 暗い海を直接タップ | クリック |
| 標本記録 | 見えている輪郭を直接タップ | クリック |
| 中央へPING | — | Space |
| 一時停止 | `Ⅱ` | P / Escape |
| サウンド | `♪` | — |

仮想スティック、移動キャラクター、攻撃ボタンはありません。画面上の「調べたい場所」と「見つけた対象」そのものを触ります。

## ゲーム構成

1. **SHALLOW LISTEN** — 止まり気味のDRIFTERでPING→LOGを覚える。
2. **MOVING WATER** — 移動と短い軌跡を読み、未来位置へPINGする。
3. **THERMAL NOISE** — 熱水域が偽反響を作り、PING位置の判断が増える。
4. **BLACK CHOIR** — SKITTER、熱水、2回観測が必要なDEEP ECHOを組み合わせる。

難度は単純な速度上昇だけではなく、「移動予測」「PINGで行動が変わる相手」「情報ノイズ」「複数回観測」という異なる判断を順に追加します。

## 起動

依存パッケージなしの静的ゲームです。

```sh
python3 -m http.server 4173
```

ブラウザーで `http://localhost:4173/` を開いてください。HTTPS環境ではPWA・オフライン起動に対応します。

## 実装

- Canvas 2D / 固定60Hzシミュレーション
- 位置指定そのものを入力にするdirect-touch設計
- iPhone safe-area / `touch-action: none` / pinch・double-tap・scroll抑制
- ブラウザーUIの一時的なfocus変化では自動Pauseしない
- AudioContextによるPING距離・捕捉・成功の短い音
- ハプティクスOFFでも情報を失わない冗長表示
- ベストスコア／ベストCHAINを `localStorage` に保存
- 外部画像・外部フォント・外部通信なし
- 詳細は [`docs/design-notes.md`](docs/design-notes.md)

## game-core

制作前に `yz4git/game-core` の現在の `main` にある **全89 Markdown** を読み、著作権保護された具体表現ではなく、そこへ抽象化されているゲーム設計・タッチ操作・QAの知見だけを利用しています。

## GitHub Pages

公開URL: https://yz4git.github.io/newgame1/

`main` 更新後にGitHub ActionsからPagesへ公開します。

### 更新とキャッシュ

- デプロイごとのGit commit SHAをbuild IDとしてJS/CSS/Service Worker URLへ埋め込みます。
- HTML/JS/CSS/manifest/version系はネットワーク優先です。
- 新Service Workerは `skipWaiting()` / `clients.claim()` を使用します。
- `abyssal-echo-newgame1-*` に加え、この同じrepoで過去に公開した `midnight-junction-newgame1-*` / `afterwake-newgame1-*` も移行時に整理します。
- プレイ中の強制reloadは行いません。
- 古い画面が残る場合は https://yz4git.github.io/newgame1/latest.html を開くと、このrepo専用のService Worker/cacheだけを整理できます。
