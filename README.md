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
