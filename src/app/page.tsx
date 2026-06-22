import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'GRID STELLA — 方位観察官の天体調律盤',
  description:
    'マージ × ループディフェンス × ローグライク。世界の座標を観測し、その誤差を補正する天体戦略パズル。',
};

const FEATURES = [
  '回路構築型オートバトラー「神楽マキナ」',
  'コアから電力を引き、武器と装置を回路に組む',
  'エネルギー経済 — 強装置ほど消費が重い',
  '3系統＝状態異常の 起爆 / 蓄積 / 参照',
  '共通の状態異常6種で初心者にも明快',
  'GPT生成→ドット絵化した完全オリジナル素材',
];

export default function LandingPage() {
  return (
    <main
      className="gs-starfield min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center"
      style={{ fontFamily: 'var(--font-ui)' }}
    >
      {/* ── Eyebrow ── */}
      <p className="gs-eyebrow mb-6 tracking-widest text-gold-300 opacity-80">
        BUREAU OF CARDINAL OBSERVATION
      </p>

      {/* ── Title block ── */}
      <h1
        className="font-display font-bold uppercase tracking-widest leading-none mb-3"
        style={{ fontSize: 'clamp(2.5rem, 10vw, 5rem)' }}
      >
        <span
          className="bg-gradient-to-b from-amber-200 via-gold-300 to-gold-500 bg-clip-text text-transparent"
        >
          GRID STELLA
        </span>
      </h1>

      <p
        className="font-ritual text-gold-300 mb-8 opacity-90"
        style={{ fontSize: 'clamp(0.9rem, 3vw, 1.25rem)', letterSpacing: '0.18em' }}
      >
        方位観察官の天体調律盤
      </p>

      {/* ── Gold rule ── */}
      <div className="gs-rule w-64 mx-auto mb-8" />

      {/* ── Flavor line ── */}
      <p
        className="text-stone-400 mb-12 max-w-sm leading-relaxed"
        style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.95rem)', letterSpacing: '0.06em' }}
      >
        世界の座標を観測し、その誤差を補正する者。
      </p>

      {/* ── CTA ── */}
      <Link
        href="/game"
        className="
          inline-flex items-center gap-3
          px-10 py-4 mb-16
          font-display font-semibold uppercase tracking-widest
          text-ink-950 bg-gold-400
          border border-gold-300
          rounded-sm
          shadow-[0_0_18px_rgba(205,167,54,0.35)]
          transition-all duration-300 ease-out
          hover:bg-gold-300 hover:shadow-[0_0_32px_rgba(218,185,79,0.55)] hover:scale-105
          active:scale-100 active:bg-gold-500
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-300
        "
        style={{ fontSize: 'clamp(0.85rem, 2.5vw, 1rem)' }}
      >
回路を起動 ▶
      </Link>

      {/* ── Feature list ── */}
      <ul className="mb-16 space-y-3 text-left max-w-xs w-full mx-auto">
        {FEATURES.map((feat) => (
          <li
            key={feat}
            className="flex items-start gap-3 text-stone-200"
            style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', letterSpacing: '0.04em' }}
          >
            <span className="mt-[0.2em] text-gold-400 select-none flex-shrink-0">◈</span>
            <span>{feat}</span>
          </li>
        ))}
      </ul>

      {/* ── Subtle note ── */}
      <p
        className="text-stone-500 mb-12"
        style={{ fontSize: '0.75rem', letterSpacing: '0.08em' }}
      >
        スマホ縦持ち推奨 ・ タップ配置操作
      </p>

      <div className="flex flex-col items-center gap-2 mb-12">
        <Link
          href="/arena"
          className="text-stone-500 hover:text-gold-300 transition-colors underline decoration-dotted"
          style={{ fontSize: '0.7rem', letterSpacing: '0.08em' }}
        >
          ARENA（バッグ構築・非同期PvP）を遊ぶ →
        </Link>
        <Link
          href="/classic"
          className="text-stone-500 hover:text-gold-300 transition-colors underline decoration-dotted"
          style={{ fontSize: '0.7rem', letterSpacing: '0.08em' }}
        >
          旧版（ループディフェンス）を遊ぶ →
        </Link>
      </div>

      {/* ── Gold rule footer ── */}
      <div className="gs-rule w-48 mx-auto mb-6" />

      <p
        className="text-stone-600"
        style={{ fontSize: '0.6875rem', letterSpacing: '0.18em', fontFamily: 'var(--font-mono)' }}
      >
        GRID STELLA &copy; BUREAU OF CARDINAL OBSERVATION
      </p>
    </main>
  );
}
