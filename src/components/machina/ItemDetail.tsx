'use client';

// 神楽マキナ Ver0.2 UI :: full item-stat detail modal (weapon stats / support text).
import React from 'react';
import { CATEGORY_META, RARITY_META } from '@/lib/machina/data';
import { STATUS_META } from '@/lib/machina/status';
import type { Item } from '@/lib/machina/types';
import { ItemSprite } from '@/components/arena/ItemSprite';

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between rounded-sm px-2 py-1" style={{ background: 'var(--ink-900)', border: '1px solid var(--gold-line-20)' }}>
      <span className="text-stone-400" style={{ fontSize: '0.62rem' }}>{label}</span>
      <span className="font-display" style={{ fontSize: '0.74rem', color: tone ?? 'var(--gold-200)' }}>{value}</span>
    </div>
  );
}

export function ItemDetail({ item, onClose }: { item: Item; onClose: () => void }) {
  const tone = RARITY_META[item.rarity].tone;
  const cat = item.category ? CATEGORY_META[item.category] : null;
  const w = item.weapon;
  const s = item.support;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-md p-4" style={{ background: 'var(--surface-panel)', border: `1px solid ${tone}88`, boxShadow: 'var(--glow-gold-sm)', animation: 'gsfade var(--dur-base) var(--ease-out)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-3 items-start">
          <div className="flex-shrink-0 rounded" style={{ background: 'var(--ink-900)', padding: 5, border: `1px solid ${tone}55` }}>
            <ItemSprite id={item.sprite} size={52} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-display text-gold-200" style={{ fontSize: '1.02rem' }}>{item.nameJa}</span>
              <span className="text-stone-500" style={{ fontSize: '0.6rem' }}>{item.nameEn}</span>
            </div>
            <div className="flex gap-1.5 items-center mt-0.5 flex-wrap">
              <span className="rounded-sm px-1.5 py-0.5" style={{ fontSize: '0.55rem', color: tone, border: `1px solid ${tone}66` }}>{RARITY_META[item.rarity].ja}</span>
              {cat && <span className="text-stone-400" style={{ fontSize: '0.6rem' }}>{cat.ja}</span>}
              <span className="text-stone-400" style={{ fontSize: '0.6rem' }}>{item.w}×{item.h}</span>
              <span className="text-gold-300" style={{ fontSize: '0.6rem' }}>{item.cost}G</span>
            </div>
          </div>
        </div>

        <p className="text-stone-300 mt-3" style={{ fontSize: '0.7rem' }}>{item.desc}</p>

        {w && (
          <div className="grid grid-cols-2 gap-1.5 mt-3">
            <Stat label="ダメージ" value={`${w.dmg}`} />
            <Stat label="クールダウン" value={`${w.cd}秒`} />
            <Stat label="消費⚡" value={`${w.energy}`} />
            <Stat label="命中" value={`${Math.round((w.accuracy ?? 1) * 100)}%`} />
            {w.crit ? <Stat label="クリ率" value={`${Math.round(w.crit * 100)}%`} /> : null}
            {w.critMult ? <Stat label="クリ倍率" value={`×${w.critMult}`} /> : null}
            {w.pierce ? <Stat label="貫通" value={`${w.pierce}`} tone="var(--signal-shield)" /> : null}
          </div>
        )}

        {w?.applies && w.applies.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {w.applies.map((a, i) => {
              const m = STATUS_META[a.status];
              return (
                <span key={i} className="rounded-sm px-1.5 py-0.5" style={{ fontSize: '0.58rem', color: m.tone, border: `1px solid ${m.tone}55`, background: 'var(--ink-900)' }}>
                  {m.ja} +{a.amount}{a.chance != null && a.chance < 1 ? ` (${Math.round(a.chance * 100)}%)` : ''}
                </span>
              );
            })}
          </div>
        )}
        {w?.detonate && (
          <p className="mt-2 text-stone-300" style={{ fontSize: '0.64rem' }}>
            <span style={{ color: STATUS_META[w.detonate.status].tone }}>起爆</span>：{STATUS_META[w.detonate.status].ja}を全消費し1スタック{w.detonate.perStack}ダメージ。
          </p>
        )}
        {w?.reference && (
          <p className="mt-2 text-stone-300" style={{ fontSize: '0.64rem' }}>
            <span style={{ color: STATUS_META[w.reference.status].tone }}>参照</span>：敵{STATUS_META[w.reference.status].ja}値×{w.reference.mult}を追加ダメージ。
          </p>
        )}

        {s && (
          <div className="grid grid-cols-2 gap-1.5 mt-3">
            {s.power ? <Stat label="武器ダメージ" value={`+${s.power}`} /> : null}
            {s.hp ? <Stat label="最大HP" value={`+${s.hp}`} /> : null}
            {s.maxEnergy ? <Stat label="最大⚡" value={`+${s.maxEnergy}`} /> : null}
            {s.energyRegen ? <Stat label="⚡回復" value={`+${s.energyRegen}/秒`} /> : null}
            {s.haste ? <Stat label="速度" value={`+${Math.round(s.haste * 100)}%`} /> : null}
            {s.crit ? <Stat label="クリ率" value={`+${Math.round(s.crit * 100)}%`} /> : null}
            {s.critDmg ? <Stat label="クリダメ" value={`+${s.critDmg}`} /> : null}
            {s.accuracy ? <Stat label="命中" value={`+${Math.round(s.accuracy * 100)}%`} /> : null}
            {s.shieldStart ? <Stat label="開始シールド" value={`+${s.shieldStart}`} tone="var(--signal-shield)" /> : null}
            {s.thorns ? <Stat label="トゲ反射" value={`${s.thorns}`} /> : null}
            {s.firewall ? <Stat label="ファイアウォール" value="有" tone="var(--signal-valid)" /> : null}
          </div>
        )}
        {s?.categoryBuffs?.map((b, i) => (
          <p key={`cb${i}`} className="mt-2 text-stone-300" style={{ fontSize: '0.64rem' }}>
            {CATEGORY_META[b.category].ja}：{b.dmg ? `ダメージ+${b.dmg} ` : ''}{b.hastePct ? `速度+${Math.round(b.hastePct * 100)}% ` : ''}{b.crit ? `クリ+${Math.round(b.crit * 100)}%` : ''}
          </p>
        ))}
        {s?.countScaling?.map((cs, i) => (
          <p key={`cs${i}`} className="mt-2 text-stone-300" style={{ fontSize: '0.64rem' }}>
            {CATEGORY_META[cs.category].ja}の数×{cs.shieldPer ? `シールド${cs.shieldPer}` : cs.hpPer ? `HP${cs.hpPer}` : cs.powerPer ? `武器ダメージ${cs.powerPer}` : ''}
          </p>
        ))}

        <button onClick={onClose} className="mt-4 w-full rounded-sm font-display uppercase tracking-wider py-2" style={{ background: 'var(--surface-card)', color: 'var(--gold-300)', border: '1px solid var(--gold-line-40)' }}>閉じる</button>
      </div>
    </div>
  );
}
