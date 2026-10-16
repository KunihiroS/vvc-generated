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

## Task 3: 承認済み visual polish（2026-10-16）

**Objective:** 操作性は承認済みのまま、追加操作部の丸枠・太い灰色bar・余白を控えめな暖色UIへ整える。見た目の好みに対する調整であり、旧操作やACの不具合修正とは区別する。

**承認・今回の境界:** assistantが「丸枠なしの小chevron、細い暖色bar、続き側edge fade、toolbar余白整理、元chipとsemantics維持」を提案し、operatorが「すすめて」と承認。上記Task 1/2の履歴は維持するが、今回の実装subagentはlocalの指定4ファイルだけを書き、commit/push・PR/Linear等の外部write・merge/deploy/Doneは行わない。既存previewの停止・再起動・browser操作もしない。親agentのbranch commit/push・PR更新権限と、merge/deploy/Doneのoperator gateは上記のまま。

**Files:**
- Modify: `test/archive-scroll.test.mjs`（既存7件を維持し、外観source contractを先行追加）
- Modify: `src/components/HorizontalScroll.astro`（追加操作部の外観とfadeの状態反映だけ）
- Modify: `src/pages/index.astro`（`.controls`のgapだけ）
- Modify: この既存plan（承認内容・設計・検証結果を追記）

**設計:**
- Unicode矢印をaria-hidden / focusable=falseの16px SVG chevronへ置換。border 0・background transparent・4pxの小角丸にし、hit areaは共有CSS変数で36px以上を維持する。
- root gapは共有変数で4px、fadeのviewport端位置もarrow幅＋gapの同じ変数から算出する。rootはposition relativeのみとし、overflow hidden/clipを付けない。
- native scrollbarは隠さず、`scrollbar-width: thin` / `scrollbar-color: var(--line-strong) transparent`。WebKit fallbackは4px高、透明track、同じ暖色thumb。
- rootのpseudo-elementsを幅18px・控えめなopacityのedge fadeにする。既存measureの端disabled状態から`root.toggleAttribute`で続き側だけを有効化し、overflowなし／no-JSでは表示しない。pointer-events noneを必須とし、focus-withinでは両側を消してoutlineを覆わない。
- toolbarはrow gap 10px / column gap 14pxへ。元のmonth/sort chip、nav/button semantics、filter/sort script、body/card/header/poster/generated contentは変更しない。
- arrow初期hidden、arrow-free rootによるoverflow判定、端disabled、focus補正、reduced-motion、ResizeObserver/font/visibility再計測を維持。新helper/module/lib・依存は追加しない。interaction contractは不変のためREADMEは変更しない。

**TDD / 検証手順:**
1. 変更前`pnpm run test`の30/30成功を確認。
2. SVG/丸枠なし・native bar・directional fade/focus・toolbar gapの4件を追加し、`node --test --test-reporter=spec test/archive-scroll.test.mjs`で既存7成功／新4失敗のREDを確認。stdout/stderr/exitはrepo外`/Users/kunihiros/.hermes/cache/scratch/kun1181-visual-red.log`へ保存する。
3. 合意済み外観のみ最小実装し、focused tests、`pnpm run test`、`pnpm run build`、`git diff --check`を実行する。専用lint / coverage設定はなく、既存source contractは実描画やgeometryの証明とはしない。
4. repo外にtest/page/componentのsourceコピーを作り、componentだけを旧HEAD `58323b1d011207df885e988827c2f62371049190`へ戻す。新component外観3件が意図したassertionで失敗し、旧7件とpageのgap契約が成功する非空虚性を確認する。本体ファイルは一時revertしない。
5. build後の実ブラウザー・操作・各幅の外観確認は親エージェントが既存previewで行う。旧reviewは履歴とし、変更後の状態で再検証する。

**実行結果（2026-10-16 / local working tree）:**
- RED: `tests 11 / pass 7 / fail 4`、exit 1。新4件はSVG chevron、thin native scrollbar、fade root、toolbar gapの意図したassertionで失敗。setup/syntax errorではない。
- GREEN: focused `tests 11 / pass 11 / fail 0`、exit 0。full `pnpm run test`は`tests 34 / pass 34 / fail 0`、exit 0。
- Build: `pnpm run build`は`[build] 1 page(s) built in 2.26s` / `[build] Complete!`、exit 0。`git diff --check`もexit 0。専用lintは存在しないため実行済みとは扱わない。
- Nonvacuity: repo外の現行sourceコピーは11成功／0失敗、exit 0。同コピーのcomponentだけを旧HEADにすると8成功／3失敗、exit 1（SVG / bar / fadeの意図したAssertionError）。page gap契約と既存7件は成功。本体3ファイルのSHA-256はprobe前後で一致。
- 維持条件の機械検証: 既存7 testsとhelperは不変。indexは`.controls`のgap 1行だけ、component scriptはfade属性更新2行だけの差分。plan旧履歴はprefix一致。指定4ファイル以外の差分・新規ファイルなし、HEADは`58323b1d011207df885e988827c2f62371049190`のまま。
- 生ログ: repo外`/Users/kunihiros/.hermes/cache/scratch/kun1181-visual-{red,focused,green,build,nonvacuity}.log`。patchツールの`boundary_note` import errorで未適用を確認したため、localの`git apply --check`→`git apply`を使用した。
- 残る確認: 実ブラウザーでの各幅の見た目、focus outline、続き側fade、native scrollbarのOS/browser差、旧操作の回帰を親エージェントが確認する。本担当は既存previewやbrowserを操作せず、commit/push・外部writeを行っていない。
