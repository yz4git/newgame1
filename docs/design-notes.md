# JET DRIFT — Design Notes

## One-sentence game

スティックで噴射口の向きを決め、限られたJET燃料で慣性を制御し、数秒以内に危険地帯を抜けてワープ口へ飛び込む。

## Core decisions

- スティックは移動方向ではなくノズル方向を指示する。
- JET中の推力はノズルの反対方向へ働く。
- 噴射を止めても速度は残るため、入力していない時間にも意味がある。
- プレイヤーを画面中心に固定し、空間をスクロールさせることで速度と慣性を読みやすくする。
- 右上ミニマップはワープ方向、危険物、燃料回復の戦略情報を担当する。
- 燃料は時間制限とは別の短期リソース。使い切っても慣性があればクリア可能。

## Fast retry

一面に長く滞在させない。

- クリア: ワープ口へ入った瞬間
- FAIL: 障害物接触 / TIME OUT / 領域外 / 燃料0かつ停止
- CLEAR transition: 約0.36秒
- FAIL retry: 約0.52秒
- Stage window: 約6.5〜10.5秒

## Difficulty ramp

操作方法は増やさず、同じNOZZLE + JETへ新しい読みを加える。

1. 慣性だけ
2. アステロイド
3. 移動機雷
4. 重力場
5. 回転レーザー
6. 燃料回復ルート
7. 複合配置
8. STAGE 25以降はstage番号seedのENDLESS

## iPhone input

左スティックと右JETを別Pointer IDで追跡する。両方を同時に押せることを必須とし、touch-action:none、viewport固定、gesture抑制を維持する。
