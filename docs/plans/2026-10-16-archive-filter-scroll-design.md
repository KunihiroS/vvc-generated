# KUN-1181 Archive Filter Scroll — Design / Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** 月フィルターを専用の横スクロール領域へ収め、ページ全体の横はみ出しを防ぎつつ全フィルターを操作可能にする。

**Architecture:** 小さなAstro slot componentが幅制約されたnative scroll viewportと必要時だけ表示する左右ボタンを持つ。既存filter/sortロジックとnav/button markupはindex側に残す。sortはスクロール領域外、820px以下では下段へ分離する。UIライブラリは追加しない。

**Tech Stack:** Astro 6 / CSS / browser DOM / Node built-in test runner。

## 承認・境界

2026-10-16、operatorが横スクロール案を提案し、native scroll＋overflow時のみ左右送りボタン＋sort分離案に「任せます」と承認。KUN-1181のScope / AC-1 / AC-3 / Documentation gateを整合済み。独立read-only契約監査はPass（description revision 2026-10-16T09:02:54.663Z）。

- Base: `30f077280b47ed612433ea8c709f67c2f9934da4`、最新取得origin/main。
- Branch: `kunihiros/kun-1181-featured-filter-layout-stability`。
- 許可: local実装・検証、branch commit/push、PR。
- 保留: merge、deploy、Linear Done。
- Non-target: card/poster、generated content、producer、filter/sort semantics、公開URL。

## 設計

- `src/components/HorizontalScroll.astro`を追加。slot内の既存月navは単一行とし、buttonは縮めない。
- 外枠とviewportは`min-width: 0`等で親幅に拘束。native `overflow-x: auto`を使用。document overflowを隠して合格にしない。
- overflow時だけ左右ボタンを出し、各端で対応ボタンをdisabledにする。ボタンの出現自身で判定が振動しないよう、全体の利用可能幅とcontent幅を比較する。
- resize、content/font寸法変化、visibility復帰で再計測。Tab focusをviewport内へ収め、focus ring用の余白を確保。スクロール補助はreduced-motionを尊重する。
- JS無効でも月列はnative scroll可能。送りボタンは初期hiddenで、死んだ操作を表示しない。
- sortは別grid列、狭幅では次行。Featured中Newest固定、aria-pressed、empty stateは不変。
- bodyの固定`min-width: 320px`がclassic scrollbarを含む320px viewportで15pxのdocument overflowを生む観測があるため、固定最小幅を除去する。card等の無関係なCSSは変更しない。

## 変更前観測と限界

Production Chromium 145 / DPR 1、load後103〜136秒、fonts=loaded。1280px: document client/scroll 1265/1265、controls1180。768px: 753/753、月列2段。320px desktop classic scrollbar: 305/320、body min-width320、月列4段。元報告の時間依存現象は未再現で、この15px overflowと同じ原因とは断定しない。変更前raw geometryはrepo外`kun1181-production-before.json`に保存。PRへ比較要約を残す。

## Task 1: Contract RED → component / page GREEN

**Objective:** 合意した横スクロール契約をproduction-used sourceと実ブラウザーで検証し、最小実装する。

**Files:**
- Create: `test/archive-scroll.test.mjs`
- Create: `src/components/HorizontalScroll.astro`
- Modify: `src/pages/index.astro`（import、controls/body CSS、月navのwrapperのみ）
- Modify: `README.md`（Archive UI Contractのみ）

1. 現行23 testsと変更前local browser geometryを取得する。
2. source contract testを先に作成する。pageが専用componentを使い、月navだけを包みsortは外にあること、外枠の幅制約、単一行native overflow、縮まないbutton、focus余白、arrowsの初期hiddenを検証する。missing importをassertion failureとしてREDにする。source contractはgeometryの証明とは扱わない。
3. `node --test test/archive-scroll.test.mjs`で意味のあるREDを確認し、失敗メッセージを保存する。
4. component / CSS / wrapperの最小実装とREADME操作契約を追加する。既存23 testsの意図を弱めない。
5. `pnpm run test` / `pnpm run build` / `git diff --check`を通す。専用lint設定なしは明記し、buildによるAstro/JS処理とdiff checkを利用する。
6. 変更前に戻したsourceに対して追加contractが失敗することをrepo外コピー等で確認し、非空虚性を示す。

## Task 2: 実ブラウザー・独立review・PR

**Objective:** 実際の操作と寸法でUIを検証し、operator reviewに渡す。

1. 1280 / 768 / 320pxとoverflow境界を確認。document client/scroll一致、外枠内のsort、月buttonが同一行であることを計測する。
2. 左右送りの進行／端disabled、native wheel/touch、Tab全button到達／focus ring、resizeによるoverflow解消・再発生、reduced-motion、JS無効を確認する。
3. `document.fonts.ready`、遅延image load、一定時間、visibility復帰後に同geometryを確認。All→Featured→月、Newest/Oldest、aria-pressedとempty stateを確認する。fixtureはbrowser memoryまたはrepo外のみ。
4. 独立spec reviewのPass後、独立quality reviewを受ける。指摘は現在コードで再検証し、合意範囲のblockerのみ修正する。
5. 正式commit後にfull test/buildを再確認し、branchをpushしてPRを作成。GitHub Codex current-head reviewと非deploy CIを観測する。review不成立は成功と扱わない。
6. PRに変更前後の比較、元の時間依存症状の再現限界、検証範囲を残し、LinearへPRと証拠を一度だけhandoffする。
7. 自分で開始したdev server、temporary browser fixtures/sessionを片付ける。generated content変更ゼロとclean treeを確認する。merge/deploy/Doneは実行しない。
