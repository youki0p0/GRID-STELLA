/* @ds-bundle: {"format":3,"namespace":"GRIDSTELLADesignSystem_88868c","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Panel","sourcePath":"components/core/Panel.jsx"},{"name":"ItemCard","sourcePath":"components/game/ItemCard.jsx"},{"name":"StatBar","sourcePath":"components/game/StatBar.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"30805716d577","components/core/Button.jsx":"86166ead76dc","components/core/Panel.jsx":"025de1bafab2","components/game/ItemCard.jsx":"e6d83fe1fef6","components/game/StatBar.jsx":"5cbc850ac82a","ui_kits/grid-stella/GameApp.jsx":"538a74e75b02","ui_kits/grid-stella/gameLogic.js":"76ca762917cc"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.GRIDSTELLADesignSystem_88868c = window.GRIDSTELLADesignSystem_88868c || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Badge — a small inlay chip for costs, item types, counts, and status.
 * Pill or square; gold / type-tinted / neutral tones.
 */
function Badge({
  children,
  tone = 'gold',
  shape = 'pill',
  icon = null,
  style = {},
  ...rest
}) {
  const tones = {
    gold: {
      background: 'var(--gold-glow-15)',
      color: 'var(--text-gold)',
      border: '1px solid var(--gold-line-40)'
    },
    neutral: {
      background: 'rgba(255,255,255,0.04)',
      color: 'var(--text-secondary)',
      border: '1px solid var(--stone-600)'
    },
    weapon: {
      background: 'rgba(205,167,54,0.10)',
      color: 'var(--gold-200)',
      border: '1px solid var(--gold-line-40)'
    },
    buff: {
      background: 'rgba(127,166,201,0.10)',
      color: 'var(--state-shield)',
      border: '1px solid rgba(127,166,201,0.4)'
    },
    defense: {
      background: 'rgba(111,174,126,0.10)',
      color: 'var(--state-valid)',
      border: '1px solid rgba(111,174,126,0.4)'
    },
    solid: {
      background: 'linear-gradient(180deg, var(--gold-400), var(--gold-600))',
      color: 'var(--ink-950)',
      border: '1px solid var(--gold-300)'
    }
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: shape === 'pill' ? '3px 10px' : '3px 7px',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-2xs)',
      fontWeight: 'var(--weight-bold)',
      letterSpacing: 'var(--tracking-wide)',
      borderRadius: shape === 'pill' ? 'var(--radius-pill)' : 'var(--radius-xs)',
      lineHeight: 1,
      whiteSpace: 'nowrap',
      ...tones[tone],
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '1.05em'
    }
  }, icon), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Button — the primary action control of the Machina Navigator panel.
 * Engraved gold inlay on ink. Three variants, sharp corners, ceremonial.
 */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  iconLeft = null,
  iconRight = null,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const sizes = {
    sm: {
      padding: '6px 14px',
      fontSize: 'var(--text-2xs)',
      gap: '6px'
    },
    md: {
      padding: '10px 22px',
      fontSize: 'var(--text-xs)',
      gap: '8px'
    },
    lg: {
      padding: '14px 32px',
      fontSize: 'var(--text-sm)',
      gap: '10px'
    }
  };
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sizes[size].gap,
    padding: sizes[size].padding,
    fontFamily: 'var(--font-display)',
    fontSize: sizes[size].fontSize,
    fontWeight: 'var(--weight-semi)',
    letterSpacing: 'var(--tracking-wider)',
    textTransform: 'uppercase',
    borderRadius: 'var(--radius-sm)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all var(--dur-fast) var(--ease-out)',
    transform: press && !disabled ? 'translateY(1px) scale(0.985)' : 'translateY(0)',
    opacity: disabled ? 0.4 : 1,
    userSelect: 'none',
    whiteSpace: 'nowrap'
  };
  const variants = {
    primary: {
      background: hover && !disabled ? 'linear-gradient(180deg, var(--gold-300), var(--gold-500))' : 'linear-gradient(180deg, var(--gold-400), var(--gold-600))',
      color: 'var(--ink-950)',
      border: '1px solid var(--gold-300)',
      boxShadow: hover && !disabled ? 'var(--glow-gold-md), var(--inlay-top)' : 'var(--shadow-sm), var(--inlay-top)'
    },
    secondary: {
      background: hover && !disabled ? 'var(--surface-raised)' : 'var(--surface-card)',
      color: 'var(--text-gold)',
      border: hover && !disabled ? '1px solid var(--gold-line-70)' : '1px solid var(--gold-line-40)',
      boxShadow: hover && !disabled ? 'var(--glow-gold-sm)' : 'none'
    },
    ghost: {
      background: hover && !disabled ? 'var(--gold-glow-08)' : 'transparent',
      color: 'var(--text-secondary)',
      border: '1px solid transparent',
      boxShadow: 'none'
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: disabled,
    style: {
      ...base,
      ...variants[variant],
      ...style
    },
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false)
  }, rest), iconLeft && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '1.1em',
      lineHeight: 1
    }
  }, iconLeft), children, iconRight && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '1.1em',
      lineHeight: 1
    }
  }, iconRight));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Panel.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Panel — the hologram container surface of the Machina Navigator.
 * Ink body with delicate gold hairline, optional engraved corner ticks,
 * and an optional hologram scanline overlay. The base building block for
 * shop cards, info wells, and the board frame.
 */
function Panel({
  children,
  corners = true,
  scanlines = false,
  glow = false,
  as = 'div',
  style = {},
  ...rest
}) {
  const Tag = as;
  const tick = {
    position: 'absolute',
    width: '9px',
    height: '9px',
    borderColor: 'var(--gold-line-70)',
    borderStyle: 'solid',
    pointerEvents: 'none'
  };
  return /*#__PURE__*/React.createElement(Tag, _extends({
    style: {
      position: 'relative',
      background: 'var(--surface-card)',
      border: '1px solid var(--gold-line-40)',
      borderRadius: 'var(--radius-md)',
      boxShadow: glow ? 'var(--shadow-card), var(--glow-gold-sm)' : 'var(--shadow-card)',
      overflow: 'hidden',
      ...style
    }
  }, rest), scanlines && /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--hologram-scan)',
      pointerEvents: 'none',
      opacity: 0.8
    }
  }), corners && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      ...tick,
      top: '5px',
      left: '5px',
      borderWidth: '1px 0 0 1px'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      ...tick,
      top: '5px',
      right: '5px',
      borderWidth: '1px 1px 0 0'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      ...tick,
      bottom: '5px',
      left: '5px',
      borderWidth: '0 0 1px 1px'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      ...tick,
      bottom: '5px',
      right: '5px',
      borderWidth: '0 1px 1px 0'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1
    }
  }, children));
}
Object.assign(__ds_scope, { Panel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Panel.jsx", error: String((e && e.message) || e) }); }

// components/game/ItemCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * ItemCard — a hologram shop card for one mystical instrument.
 * Shows the emoji sigil, bilingual name, footprint, type, key stats, and
 * gold cost. Hovers lift with a scanline shimmer; selected state locks a
 * bright gold edge. Drag this into the Alignment Board.
 */
function ItemCard({
  icon = '📌',
  nameJa = '観測針',
  nameEn = 'Navigator Needle',
  type = 'weapon',
  width = 1,
  height = 1,
  attack = null,
  cooldown = null,
  effect = null,
  cost = 3,
  selected = false,
  affordable = true,
  onSelect,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const lift = (hover || selected) && affordable;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "button",
    tabIndex: 0,
    onClick: onSelect,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      position: 'relative',
      display: 'flex',
      gap: 'var(--space-3)',
      padding: 'var(--space-3)',
      background: selected ? 'var(--surface-raised)' : 'var(--surface-card)',
      border: selected ? '1px solid var(--gold-line-70)' : '1px solid var(--gold-line-20)',
      borderRadius: 'var(--radius-md)',
      boxShadow: selected ? 'var(--glow-gold-md), var(--shadow-card)' : lift ? 'var(--glow-gold-sm), var(--shadow-card)' : 'var(--shadow-card)',
      cursor: affordable ? 'grab' : 'not-allowed',
      opacity: affordable ? 1 : 0.5,
      transform: lift ? 'translateY(-2px)' : 'translateY(0)',
      transition: 'all var(--dur-base) var(--ease-out)',
      overflow: 'hidden',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--hologram-scan)',
      opacity: lift ? 0.9 : 0.5,
      transition: 'opacity var(--dur-base) var(--ease-out)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: '0 0 auto',
      width: '52px',
      height: '52px',
      display: 'grid',
      placeItems: 'center',
      fontSize: '28px',
      background: 'radial-gradient(circle at 50% 40%, var(--gold-glow-15), transparent 70%)',
      border: '1px solid var(--gold-line-20)',
      borderRadius: 'var(--radius-sm)',
      filter: lift ? 'drop-shadow(0 0 8px var(--gold-glow-35))' : 'none',
      transition: 'filter var(--dur-base) var(--ease-out)'
    }
  }, icon), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-ritual)',
      fontSize: 'var(--text-base)',
      fontWeight: 'var(--weight-semi)',
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, nameJa), /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "solid",
    shape: "pill",
    style: {
      flex: '0 0 auto'
    }
  }, "\u25C8 ", cost)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-2xs)',
      letterSpacing: 'var(--tracking-wide)',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      marginTop: '1px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, nameEn), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '5px',
      marginTop: 'var(--space-2)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: type
  }, type.toUpperCase()), /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "neutral",
    shape: "square"
  }, width, "\xD7", height), attack != null && /*#__PURE__*/React.createElement("span", {
    style: readout
  }, "\u2694 ", attack), cooldown != null && /*#__PURE__*/React.createElement("span", {
    style: readout
  }, "\u25D4 ", cooldown.toFixed(1), "s")), effect && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--text-xs)',
      color: 'var(--text-secondary)',
      marginTop: 'var(--space-2)',
      lineHeight: 'var(--leading-snug)'
    }
  }, effect)));
}
const readout = {
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--text-2xs)',
  fontWeight: 'var(--weight-bold)',
  color: 'var(--text-gold)',
  letterSpacing: 'var(--tracking-wide)'
};
Object.assign(__ds_scope, { ItemCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/game/ItemCard.jsx", error: String((e && e.message) || e) }); }

// components/game/StatBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * StatBar — a combat readout bar for HP or Shield. Thin, engraved, with a
 * mono numeric readout. Animates its fill width for the battle playback.
 */
function StatBar({
  label = 'HP',
  value = 100,
  max = 100,
  kind = 'hp',
  showShield = false,
  shield = 0,
  style = {},
  ...rest
}) {
  const pct = Math.max(0, Math.min(100, value / max * 100));
  const shieldPct = Math.max(0, Math.min(100, shield / max * 100));
  const fills = {
    hp: 'linear-gradient(90deg, var(--gold-500), var(--gold-300))',
    enemy: 'linear-gradient(90deg, var(--signal-invalid), #d97a72)',
    shield: 'linear-gradient(90deg, #5d83a3, var(--signal-shield))'
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: '4px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-2xs)',
      letterSpacing: 'var(--tracking-wider)',
      textTransform: 'uppercase',
      color: 'var(--text-muted)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-bold)',
      color: kind === 'enemy' ? '#d98a82' : 'var(--text-gold)'
    }
  }, Math.round(value), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--stone-500)'
    }
  }, " / ", max), showShield && shield > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--state-shield)'
    }
  }, "  \u26E8 ", Math.round(shield)))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: '10px',
      background: 'var(--ink-700)',
      border: '1px solid var(--gold-line-20)',
      borderRadius: 'var(--radius-pill)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      width: `${pct}%`,
      background: fills[kind],
      borderRadius: 'var(--radius-pill)',
      boxShadow: '0 0 8px rgba(205,167,54,0.4)',
      transition: 'width var(--dur-base) var(--ease-out)'
    }
  }), showShield && shield > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: `${pct}%`,
      width: `${shieldPct}%`,
      background: fills.shield,
      opacity: 0.85,
      transition: 'all var(--dur-base) var(--ease-out)'
    }
  })));
}
Object.assign(__ds_scope, { StatBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/game/StatBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/grid-stella/GameApp.jsx
try { (() => {
/* GRID STELLA — interactive dashboard orchestrator.
   Composes DS components (Button, Badge, Panel, ItemCard, StatBar)
   with GS_LOGIC. Exposed as window.GameApp. */
(function () {
  const {
    useState,
    useEffect,
    useRef,
    useCallback
  } = React;
  const DS = window.GRIDSTELLADesignSystem_88868c;
  const {
    Button,
    Badge,
    Panel,
    StatBar
  } = DS;
  const L = window.GS_LOGIC;
  const CELL = 76,
    GAP = 6,
    PAD = 14;
  const pos = i => PAD + i * (CELL + GAP);
  const ckey = (x, y) => x + ',' + y;
  let _uid = 0;
  const uid = () => 'pi_' + ++_uid + '_' + Date.now();
  function drawSlots() {
    // 4 slots drawn from the pool, allowing repeats of cheap items
    const pool = L.SHOP_POOL;
    const slots = [];
    for (let i = 0; i < 4; i++) slots.push(pool[Math.floor(Math.random() * pool.length)]);
    return slots.map(it => ({
      slotId: uid(),
      item: it
    }));
  }

  // ---- Star-chart backdrop (geometric astrolabe overlay) -------
  function StarChart() {
    return /*#__PURE__*/React.createElement("svg", {
      viewBox: "0 0 460 460",
      width: "100%",
      height: "100%",
      "aria-hidden": "true",
      style: {
        position: 'absolute',
        inset: 0,
        opacity: 0.5,
        pointerEvents: 'none'
      }
    }, /*#__PURE__*/React.createElement("g", {
      fill: "none",
      stroke: "rgba(218,185,79,0.22)",
      strokeWidth: "1"
    }, /*#__PURE__*/React.createElement("circle", {
      cx: "230",
      cy: "230",
      r: "210"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "230",
      cy: "230",
      r: "150"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "230",
      cy: "230",
      r: "92",
      strokeDasharray: "3 5"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "230",
      cy: "230",
      r: "34"
    }), Array.from({
      length: 24
    }).map((_, i) => {
      const a = i / 24 * Math.PI * 2;
      const r1 = i % 6 === 0 ? 150 : 196;
      return /*#__PURE__*/React.createElement("line", {
        key: i,
        x1: 230 + Math.cos(a) * r1,
        y1: 230 + Math.sin(a) * r1,
        x2: 230 + Math.cos(a) * 210,
        y2: 230 + Math.sin(a) * 210
      });
    }), /*#__PURE__*/React.createElement("line", {
      x1: "20",
      y1: "230",
      x2: "440",
      y2: "230",
      strokeDasharray: "2 6"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "230",
      y1: "20",
      x2: "230",
      y2: "440",
      strokeDasharray: "2 6"
    })), /*#__PURE__*/React.createElement("g", {
      fill: "rgba(247,243,218,0.55)"
    }, [[120, 90], [330, 140], [380, 300], [150, 340], [260, 80], [90, 260], [300, 360], [210, 200], [160, 160], [340, 230]].map((p, i) => /*#__PURE__*/React.createElement("circle", {
      key: i,
      cx: p[0],
      cy: p[1],
      r: i % 3 === 0 ? 1.8 : 1.1
    }))), /*#__PURE__*/React.createElement("g", {
      stroke: "rgba(218,185,79,0.30)",
      strokeWidth: "0.8",
      fill: "none"
    }, /*#__PURE__*/React.createElement("polyline", {
      points: "120,90 260,80 340,230 300,360"
    }), /*#__PURE__*/React.createElement("polyline", {
      points: "90,260 150,340 210,200"
    })));
  }
  function App() {
    const [gold, setGold] = useState(20);
    const [stage, setStage] = useState(0);
    const [slots, setSlots] = useState(drawSlots);
    const [placed, setPlaced] = useState([]);
    const [dragging, setDragging] = useState(null); // {item, rot, fromId?}
    const [hoverCell, setHoverCell] = useState(null); // {x,y}
    const [selectedId, setSelectedId] = useState(null);
    const [hoverPlacedId, setHoverPlacedId] = useState(null);
    const [pulse, setPulse] = useState({}); // {placedId: true} during attack
    const [battle, setBattle] = useState(null); // {result?, logs, history, idx, playing}
    const [toast, setToast] = useState(null);
    const draggingRef = useRef(dragging);
    draggingRef.current = dragging;
    const stats = L.calculateStats(placed);

    // ---- rotation via R ----
    useEffect(() => {
      const onKey = e => {
        if (e.key !== 'r' && e.key !== 'R') return;
        if (draggingRef.current) {
          setDragging(d => d ? {
            ...d,
            rot: ((d.rot || 0) + 1) % 4
          } : d);
        } else if (selectedId) {
          setPlaced(prev => prev.map(p => {
            if (p.id !== selectedId) return p;
            const nextRot = ((p.rot || 0) + 1) % 4;
            const others = prev.filter(o => o.id !== p.id);
            if (L.canPlace(p.item, p.x, p.y, nextRot, others, p.id)) return {
              ...p,
              rot: nextRot
            };
            flash('この座標では回転できない');
            return p;
          }));
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [selectedId]);
    const flash = msg => {
      setToast(msg);
      clearTimeout(flash._t);
      flash._t = setTimeout(() => setToast(null), 1800);
    };

    // ---- preview + synergy sets for current hover ----
    const preview = computePreview();
    function computePreview() {
      const out = {
        foot: new Map(),
        synergy: new Set()
      };
      // hovering a placed buff → show its synergy
      if (hoverPlacedId && !dragging) {
        const p = placed.find(x => x.id === hoverPlacedId);
        if (p && (p.item.key === 'compass' || p.item.key === 'plumb')) L.synergyCells(p).forEach(([x, y]) => out.synergy.add(ckey(x, y)));
      }
      // dragging over board
      if (dragging && hoverCell) {
        const {
          item,
          rot,
          fromId
        } = dragging;
        const {
          w,
          h
        } = L.dims(item, rot || 0);
        const ok = L.canPlace(item, hoverCell.x, hoverCell.y, rot || 0, placed, fromId);
        for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
          const cx = hoverCell.x + dx,
            cy = hoverCell.y + dy;
          if (cx < L.GRID && cy < L.GRID) out.foot.set(ckey(cx, cy), ok);
        }
        if (item.key === 'compass' || item.key === 'plumb') {
          const ghost = {
            item,
            x: hoverCell.x,
            y: hoverCell.y,
            rot: rot || 0
          };
          L.synergyCells(ghost).forEach(([x, y]) => out.synergy.add(ckey(x, y)));
        }
      }
      return out;
    }

    // ---- buy / place from shop ----
    function handleDrop(x, y) {
      const d = draggingRef.current;
      if (!d) return;
      const {
        item,
        rot,
        fromId,
        slotId
      } = d;
      if (!L.canPlace(item, x, y, rot || 0, placed, fromId)) {
        flash('配置できない座標');
        reset();
        return;
      }
      if (fromId) {
        setPlaced(prev => prev.map(p => p.id === fromId ? {
          ...p,
          x,
          y,
          rot: rot || 0
        } : p));
      } else {
        if (gold < item.cost) {
          flash('ゴールドが足りない');
          reset();
          return;
        }
        setGold(g => g - item.cost);
        const id = uid();
        setPlaced(prev => [...prev, {
          id,
          item,
          x,
          y,
          rot: rot || 0
        }]);
        setSlots(prev => prev.filter(s => s.slotId !== slotId));
        setSelectedId(id);
      }
      reset();
    }
    function reset() {
      setDragging(null);
      setHoverCell(null);
    }
    function removePlaced(id) {
      const p = placed.find(x => x.id === id);
      if (!p) return;
      setPlaced(prev => prev.filter(x => x.id !== id));
      setGold(g => g + Math.floor(p.item.cost / 2)); // salvage
      flash(`${p.item.nameJa} を解除（+${Math.floor(p.item.cost / 2)}G）`);
      if (selectedId === id) setSelectedId(null);
    }
    function reroll() {
      if (gold < 1) {
        flash('ゴールドが足りない');
        return;
      }
      setGold(g => g - 1);
      setSlots(drawSlots());
    }

    // ---- battle ----
    function startBattle() {
      if (stats.weapons.length === 0) {
        flash('武器を1つ以上配置せよ');
        return;
      }
      const enemy = L.ENEMY_PRESETS[Math.min(stage, L.ENEMY_PRESETS.length - 1)];
      const sim = L.simulateBattle(stats, enemy);
      setSelectedId(null);
      setBattle({
        ...sim,
        enemy,
        idx: 0,
        playing: true
      });
    }
    useEffect(() => {
      if (!battle || !battle.playing) return;
      if (battle.idx >= battle.history.length - 1) {
        const t = setTimeout(() => setBattle(b => b ? {
          ...b,
          playing: false,
          done: true
        } : b), 400);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => {
        setBattle(b => {
          if (!b) return b;
          const nextIdx = Math.min(b.idx + 1, b.history.length - 1);
          // pulse a random weapon when a player attack log appears near this step
          return {
            ...b,
            idx: nextIdx
          };
        });
      }, 55);
      return () => clearTimeout(t);
    }, [battle]);

    // pulse weapons roughly in time with their cooldown during playback
    useEffect(() => {
      if (!battle) {
        setPulse({});
        return;
      }
      const t = battle.history[battle.idx] ? battle.history[battle.idx].t : 0;
      const next = {};
      stats.weapons.forEach(w => {
        if (w.finalCooldown > 0 && Math.abs(t % w.finalCooldown) < 0.06) next[w.id] = true;
      });
      setPulse(next);
    }, [battle && battle.idx]);
    function closeBattle(advance) {
      if (advance) {
        setGold(g => g + 10);
        setStage(s => Math.min(s + 1, L.ENEMY_PRESETS.length - 1));
        flash('座標調律完了 — 報酬 +10G');
      }
      setBattle(null);
      setPulse({});
    }
    const snap = battle ? battle.history[battle.idx] : null;
    const enemy = battle ? battle.enemy : L.ENEMY_PRESETS[Math.min(stage, L.ENEMY_PRESETS.length - 1)];
    const recentLogs = battle ? battle.logs.slice(0, 0).concat(battle.logs.filter((_, i) => true)).slice(Math.max(0, logIndex(battle) - 6), logIndex(battle)) : [];
    function logIndex(b) {
      // approximate: count logs whose timestamp <= current time
      const t = b.history[b.idx] ? b.history[b.idx].t : 0;
      let c = 0;
      for (const lg of b.logs) {
        const m = /\[(\d+\.\d)s\]/.exec(lg);
        if (m && parseFloat(m[1]) <= t) c++;else if (!m) c++;
      }
      return c;
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }
    }, /*#__PURE__*/React.createElement(Header, {
      gold: gold,
      stage: stage
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '380px 1fr',
        gap: 'var(--space-6)',
        padding: 'var(--space-6)',
        alignItems: 'start',
        maxWidth: 1280,
        margin: '0 auto',
        width: '100%'
      }
    }, /*#__PURE__*/React.createElement(Shop, {
      slots: slots,
      gold: gold,
      onReroll: reroll,
      onDragStart: s => setDragging({
        item: s.item,
        rot: 0,
        slotId: s.slotId
      }),
      onDragEnd: reset,
      disabled: !!battle
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5)'
      }
    }, /*#__PURE__*/React.createElement(Board, {
      placed: placed,
      preview: preview,
      dragging: dragging,
      selectedId: selectedId,
      hoverPlacedId: hoverPlacedId,
      pulse: pulse,
      locked: !!battle,
      onCellEnter: (x, y) => setHoverCell({
        x,
        y
      }),
      onCellDrop: handleDrop,
      onSelect: id => setSelectedId(s => s === id ? null : id),
      onHoverPlaced: setHoverPlacedId,
      onRemove: removePlaced,
      onDragPlaced: p => setDragging({
        item: p.item,
        rot: p.rot || 0,
        fromId: p.id
      }),
      onDragEnd: reset
    }), /*#__PURE__*/React.createElement(ControlBar, {
      stats: stats,
      enemy: enemy,
      onStart: startBattle,
      battle: battle,
      snap: snap,
      locked: !!battle
    }))), battle && /*#__PURE__*/React.createElement(BattleLog, {
      logs: recentLogs
    }), battle && battle.done && /*#__PURE__*/React.createElement(ResultModal, {
      battle: battle,
      onClose: closeBattle
    }), toast && /*#__PURE__*/React.createElement(Toast, {
      msg: toast
    }), /*#__PURE__*/React.createElement(HelpHint, null));
  }

  // ============ sub-components ============
  function Header({
    gold,
    stage
  }) {
    return /*#__PURE__*/React.createElement("header", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 28px',
        borderBottom: '1px solid var(--gold-line-20)',
        background: 'linear-gradient(180deg, rgba(11,11,13,0.9), rgba(6,6,7,0.6))',
        backdropFilter: 'var(--blur-panel)'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "gs-eyebrow"
    }, "\u65B9\u4F4D\u89B3\u5BDF\u5B98 \xB7 Machina Navigator"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        gap: 14,
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 26,
        fontWeight: 700,
        letterSpacing: '0.14em',
        color: 'var(--text-primary)',
        textShadow: '0 0 20px rgba(205,167,54,0.25)'
      }
    }, "GRID STELLA"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ritual)',
        fontSize: 15,
        color: 'var(--text-gold)'
      }
    }, "\u5929\u4F53\u8ABF\u5F8B\u76E4"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 22
      }
    }, /*#__PURE__*/React.createElement(Readout, {
      label: "STAGE",
      value: String(stage + 1).padStart(2, '0')
    }), /*#__PURE__*/React.createElement(Readout, {
      label: "GOLD",
      value: '◈ ' + gold,
      accent: true
    })));
  }
  function Readout({
    label,
    value,
    accent
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'right'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 10,
        letterSpacing: '0.22em',
        color: 'var(--text-muted)',
        textTransform: 'uppercase'
      }
    }, label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 20,
        fontWeight: 700,
        color: accent ? 'var(--text-gold)' : 'var(--text-primary)',
        marginTop: 2
      }
    }, value));
  }
  function Shop({
    slots,
    gold,
    onReroll,
    onDragStart,
    onDragEnd,
    disabled
  }) {
    return /*#__PURE__*/React.createElement(Panel, {
      scanlines: true,
      style: {
        padding: 'var(--space-5)',
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        transition: 'opacity var(--dur-base)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-4)'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "gs-eyebrow"
    }, "\u89B3\u6E2C\u6A5F\u306E\u5E02"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ritual)',
        fontSize: 18,
        color: 'var(--text-primary)',
        marginTop: 2
      }
    }, "\u5668\u5177\u5EAB \xB7 The Shop")), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm",
      iconLeft: "\u21BB",
      onClick: onReroll
    }, "Reroll \xB7 1\u25C8")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)'
      }
    }, slots.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--text-muted)',
        textAlign: 'center',
        padding: '24px 0'
      }
    }, "\u5668\u5177\u5EAB\u306F\u7A7A\u3002Reroll \u3067\u518D\u69CB\u6210\u305B\u3088\u3002"), slots.map(s => /*#__PURE__*/React.createElement(ShopCard, {
      key: s.slotId,
      slot: s,
      affordable: gold >= s.item.cost,
      onDragStart: onDragStart,
      onDragEnd: onDragEnd
    }))));
  }
  function ShopCard({
    slot,
    affordable,
    onDragStart,
    onDragEnd
  }) {
    const it = slot.item;
    return /*#__PURE__*/React.createElement("div", {
      draggable: affordable,
      onDragStart: e => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(slot);
      },
      onDragEnd: onDragEnd
    }, /*#__PURE__*/React.createElement(DS.ItemCard, {
      icon: it.icon,
      nameJa: it.nameJa,
      nameEn: it.nameEn,
      type: it.type,
      width: it.w,
      height: it.h,
      attack: it.attack != null ? it.attack : null,
      cooldown: it.cooldown != null ? it.cooldown : null,
      effect: it.type !== 'weapon' ? it.effect : null,
      cost: it.cost,
      affordable: affordable
    }));
  }
  function Board({
    placed,
    preview,
    dragging,
    selectedId,
    hoverPlacedId,
    pulse,
    locked,
    onCellEnter,
    onCellDrop,
    onSelect,
    onHoverPlaced,
    onRemove,
    onDragPlaced,
    onDragEnd
  }) {
    const size = 5 * CELL + 4 * GAP + 2 * PAD;
    return /*#__PURE__*/React.createElement(Panel, {
      glow: true,
      style: {
        padding: 'var(--space-5)',
        width: 'fit-content',
        margin: '0 auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-4)'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "gs-eyebrow"
    }, "\u8ABF\u5F8B\u76E4 \xB7 Alignment Board"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ritual)',
        fontSize: 18,
        color: 'var(--text-primary)',
        marginTop: 2
      }
    }, "\u5EA7\u6A19\u3092\u6574\u5217\u305B\u3088")), /*#__PURE__*/React.createElement(Badge, {
      tone: "gold"
    }, "5 \xD7 5")), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: size,
        height: size,
        background: 'radial-gradient(circle at 50% 45%, rgba(20,20,24,0.6), var(--ink-pure))',
        border: '1px solid var(--gold-line-40)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.7)'
      }
    }, /*#__PURE__*/React.createElement(StarChart, null), Array.from({
      length: 25
    }).map((_, i) => {
      const x = i % 5,
        y = Math.floor(i / 5);
      const k = ckey(x, y);
      const footOk = preview.foot.get(k);
      const inFoot = preview.foot.has(k);
      const inSyn = preview.synergy.has(k);
      let bg = 'rgba(255,255,255,0.012)';
      let border = '1px solid rgba(218,185,79,0.12)';
      if (inSyn) {
        bg = 'var(--gold-glow-20)';
        border = '1px solid var(--gold-line-70)';
      }
      if (inFoot) {
        bg = footOk ? 'rgba(111,174,126,0.22)' : 'rgba(192,82,74,0.22)';
        border = footOk ? '1px solid rgba(111,174,126,0.7)' : '1px solid rgba(192,82,74,0.7)';
      }
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        onDragEnter: e => {
          e.preventDefault();
          onCellEnter(x, y);
        },
        onDragOver: e => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          onCellEnter(x, y);
        },
        onDrop: e => {
          e.preventDefault();
          onCellDrop(x, y);
        },
        style: {
          position: 'absolute',
          left: pos(x),
          top: pos(y),
          width: CELL,
          height: CELL,
          background: bg,
          border,
          borderRadius: 'var(--radius-xs)',
          boxShadow: inSyn && !inFoot ? 'inset 0 0 14px var(--gold-glow-35)' : 'none',
          transition: 'background var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast)'
        }
      });
    }), placed.map(p => {
      const {
        w,
        h
      } = L.dims(p.item, p.rot || 0);
      const sel = selectedId === p.id;
      const pulsing = pulse[p.id];
      return /*#__PURE__*/React.createElement("div", {
        key: p.id,
        draggable: !locked,
        onDragStart: e => {
          e.dataTransfer.effectAllowed = 'move';
          onDragPlaced(p);
        },
        onDragEnd: onDragEnd,
        onClick: () => !locked && onSelect(p.id),
        onMouseEnter: () => onHoverPlaced(p.id),
        onMouseLeave: () => onHoverPlaced(null),
        onDoubleClick: () => !locked && onRemove(p.id),
        title: p.item.nameJa + ' — クリックで選択 / ダブルクリックで解除 / 選択中Rで回転',
        style: {
          position: 'absolute',
          left: pos(p.x),
          top: pos(p.y),
          width: w * CELL + (w - 1) * GAP,
          height: h * CELL + (h - 1) * GAP,
          display: 'grid',
          placeItems: 'center',
          fontSize: Math.min(w, h) >= 2 ? 40 : 28,
          background: p.item.type === 'weapon' ? 'linear-gradient(160deg, rgba(40,34,18,0.95), rgba(20,18,12,0.95))' : p.item.type === 'buff' ? 'linear-gradient(160deg, rgba(24,30,38,0.95), rgba(14,16,20,0.95))' : 'linear-gradient(160deg, rgba(20,32,24,0.95), rgba(12,16,13,0.95))',
          border: sel ? '1px solid var(--gold-line-70)' : '1px solid var(--gold-line-40)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: sel ? 'var(--glow-gold-md)' : pulsing ? 'var(--glow-gold-lg)' : 'var(--shadow-md)',
          cursor: locked ? 'default' : 'grab',
          pointerEvents: dragging ? 'none' : 'auto',
          transform: pulsing ? 'scale(1.1)' : sel ? 'scale(1.02)' : 'scale(1)',
          transition: pulsing ? 'transform var(--dur-instant) var(--ease-snap), box-shadow var(--dur-instant)' : 'transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base), left var(--dur-base) var(--ease-out), top var(--dur-base) var(--ease-out)',
          zIndex: sel ? 5 : 2
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))'
        }
      }, p.item.icon), sel && /*#__PURE__*/React.createElement("span", {
        style: {
          position: 'absolute',
          top: 3,
          right: 5,
          fontFamily: 'var(--font-mono)',
          fontSize: 8,
          color: 'var(--text-gold)',
          letterSpacing: '0.1em'
        }
      }, "R\u21BB"));
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 16,
        marginTop: 'var(--space-4)',
        fontFamily: 'var(--font-ui)',
        fontSize: 11,
        color: 'var(--text-muted)',
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(Legend, {
      swatch: "rgba(111,174,126,0.7)",
      label: "\u914D\u7F6E\u53EF"
    }), /*#__PURE__*/React.createElement(Legend, {
      swatch: "rgba(192,82,74,0.7)",
      label: "\u914D\u7F6E\u4E0D\u53EF"
    }), /*#__PURE__*/React.createElement(Legend, {
      swatch: "var(--gold-line-70)",
      label: "\u30B7\u30CA\u30B8\u30FC\u7BC4\u56F2"
    })));
  }
  function Legend({
    swatch,
    label
  }) {
    return /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 11,
        height: 11,
        background: swatch,
        borderRadius: 2,
        display: 'inline-block'
      }
    }), label);
  }
  function ControlBar({
    stats,
    enemy,
    onStart,
    battle,
    snap,
    locked
  }) {
    const totalAtk = stats.weapons.reduce((a, w) => a + w.finalAttack, 0);
    return /*#__PURE__*/React.createElement(Panel, {
      style: {
        padding: 'var(--space-5)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--space-5)',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(StatBar, {
      label: "\u8ABF\u5F8B\u8005 / HP",
      value: snap ? snap.pHp : stats.maxHp,
      max: stats.maxHp,
      kind: "hp",
      showShield: true,
      shield: snap ? snap.pShield : 0
    }), /*#__PURE__*/React.createElement(StatBar, {
      label: `${enemy.nameJa} / ${enemy.nameEn}`,
      value: snap ? snap.eHp : enemy.hp,
      max: enemy.hp,
      kind: "enemy",
      showShield: true,
      shield: snap ? snap.eShield : enemy.shield
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 20
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'right'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 10,
        letterSpacing: '0.2em',
        color: 'var(--text-muted)',
        textTransform: 'uppercase'
      }
    }, "\u6B66\u5668 ", stats.weapons.length, " \xB7 \u7DCF\u653B\u6483"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 22,
        fontWeight: 700,
        color: 'var(--text-gold)'
      }
    }, "\u2694 ", totalAtk)), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      iconLeft: "\u2699",
      onClick: onStart,
      disabled: locked
    }, "\u6642\u7A7A\u8ABF\u5F8B"))));
  }
  function BattleLog({
    logs
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'fixed',
        right: 20,
        bottom: 20,
        width: 320,
        zIndex: 40
      }
    }, /*#__PURE__*/React.createElement(Panel, {
      corners: false,
      style: {
        padding: '12px 14px',
        background: 'rgba(11,11,13,0.92)',
        backdropFilter: 'var(--blur-panel)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "gs-eyebrow",
      style: {
        marginBottom: 8
      }
    }, "\u8ABF\u5F8B\u8A18\u9332 \xB7 Battle Log"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }
    }, logs.map((lg, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: i === logs.length - 1 ? 'var(--text-gold)' : 'var(--text-secondary)',
        opacity: 0.4 + 0.6 * (i / Math.max(1, logs.length - 1))
      }
    }, lg)))));
  }
  function ResultModal({
    battle,
    onClose
  }) {
    const win = battle.result === 'win';
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'var(--blur-modal)',
        animation: 'gsfade var(--dur-slow) var(--ease-out)'
      }
    }, /*#__PURE__*/React.createElement(Panel, {
      scanlines: true,
      glow: true,
      corners: true,
      style: {
        padding: '40px 56px',
        textAlign: 'center',
        minWidth: 420
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "gs-eyebrow"
    }, win ? 'Alignment Complete' : 'Observation Lost'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ritual)',
        fontSize: 42,
        fontWeight: 700,
        marginTop: 12,
        color: win ? 'var(--text-gold)' : 'var(--signal-invalid)',
        textShadow: win ? '0 0 30px rgba(205,167,54,0.4)' : 'none'
      }
    }, win ? '座標調律完了' : '観測不能'), /*#__PURE__*/React.createElement("div", {
      className: "gs-rule",
      style: {
        margin: '22px auto',
        maxWidth: 220
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 14,
        color: 'var(--text-secondary)',
        marginBottom: 26
      }
    }, win ? '極星の座標が整った。次なる歪みへ進む。' : '座標が乱れた。器具を組み直せ。'), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12,
        justifyContent: 'center'
      }
    }, win ? /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      iconRight: "\u2192",
      onClick: () => onClose(true)
    }, "\u6B21\u306E\u89B3\u6E2C\u3078 \xB7 +10\u25C8") : /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "lg",
      onClick: () => onClose(false)
    }, "\u5668\u5177\u3092\u7D44\u307F\u76F4\u3059"))));
  }
  function Toast({
    msg
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'fixed',
        top: 88,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 70,
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--text-primary)',
        background: 'rgba(11,11,13,0.95)',
        border: '1px solid var(--gold-line-40)',
        borderRadius: 'var(--radius-sm)',
        padding: '10px 18px',
        boxShadow: 'var(--glow-gold-sm)',
        animation: 'gsfade var(--dur-base) var(--ease-out)'
      }
    }, msg);
  }
  function HelpHint() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'fixed',
        left: 20,
        bottom: 20,
        zIndex: 30,
        maxWidth: 300,
        fontFamily: 'var(--font-ui)',
        fontSize: 11.5,
        color: 'var(--text-muted)',
        lineHeight: 1.6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-gold)'
      }
    }, "\u30C9\u30E9\u30C3\u30B0"), " \u3067\u5668\u5177\u3092\u76E4\u3078\u914D\u7F6E \xB7", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-gold)'
      }
    }, " R"), " \u3067\u56DE\u8EE2 \xB7", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-gold)'
      }
    }, " \u30C0\u30D6\u30EB\u30AF\u30EA\u30C3\u30AF"), " \u3067\u89E3\u9664 \xB7 \uD83E\uDDED \u306B\u30DB\u30D0\u30FC\u3067\u96A3\u63A5\u30B7\u30CA\u30B8\u30FC\u304C\u8F1D\u304F");
  }
  window.GameApp = App;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/grid-stella/GameApp.jsx", error: String((e && e.message) || e) }); }

// ui_kits/grid-stella/gameLogic.js
try { (() => {
/* ============================================================
   GRID STELLA — game logic & master data (client-side, pure).
   Exposed on window for the babel-transpiled app scripts.
   ============================================================ */
(function () {
  const GRID = 5;

  // ---- Master data: the five instruments ----------------------
  const SHOP_POOL = [{
    key: 'needle',
    icon: '📌',
    nameJa: '観測針',
    nameEn: 'Navigator Needle',
    type: 'weapon',
    w: 1,
    h: 1,
    attack: 4,
    cooldown: 2.0,
    cost: 3,
    effect: '基礎の調律針。安定した攻撃を刻む。'
  }, {
    key: 'globe',
    icon: '🌐',
    nameJa: '天球儀',
    nameEn: 'Celestial Globe',
    type: 'weapon',
    w: 2,
    h: 2,
    attack: 16,
    cooldown: 4.5,
    cost: 8,
    effect: '重く強大な一撃。広い座標を占有する。'
  }, {
    key: 'compass',
    icon: '🧭',
    nameJa: '羅針盤の刻印',
    nameEn: 'Compass Rose',
    type: 'buff',
    w: 1,
    h: 1,
    cost: 4,
    effect: '上下左右に隣接する武器のクールダウンを20%短縮。'
  }, {
    key: 'plumb',
    icon: '⚱️',
    nameJa: '均衡の分銅',
    nameEn: 'Plumb Bob',
    type: 'buff',
    w: 1,
    h: 1,
    cost: 3,
    effect: '左右に隣接する武器の攻撃力を+2する。'
  }, {
    key: 'coat',
    icon: '🧥',
    nameJa: '方位外套',
    nameEn: 'Navigator Coat',
    type: 'defense',
    w: 2,
    h: 1,
    cost: 5,
    effect: '戦闘中、3秒ごとにシールドを+4生成する。'
  }];
  const ENEMY_PRESETS = [{
    nameJa: '歪んだ座標',
    nameEn: 'TYPE-A',
    hp: 70,
    attack: 6,
    cooldown: 2.5,
    shield: 0
  }, {
    nameJa: '暴走した観測機',
    nameEn: 'RUNAWAY',
    hp: 120,
    attack: 9,
    cooldown: 2.0,
    shield: 8
  }, {
    nameJa: '反転せし極星',
    nameEn: 'NULL-POLE',
    hp: 180,
    attack: 13,
    cooldown: 1.8,
    shield: 16
  }];

  // ---- Geometry helpers ---------------------------------------
  // effective footprint given rotation (rot 0-3; odd swaps w/h)
  function dims(item, rot) {
    return rot % 2 === 1 ? {
      w: item.h,
      h: item.w
    } : {
      w: item.w,
      h: item.h
    };
  }
  function cellsOf(placed) {
    const {
      w,
      h
    } = dims(placed.item, placed.rot || 0);
    const out = [];
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) out.push([placed.x + dx, placed.y + dy]);
    return out;
  }
  function inBounds(x, y) {
    return x >= 0 && y >= 0 && x < GRID && y < GRID;
  }
  function canPlace(item, x, y, rot, placed, ignoreId) {
    const {
      w,
      h
    } = dims(item, rot);
    if (x < 0 || y < 0 || x + w > GRID || y + h > GRID) return false;
    const occupied = new Set();
    placed.forEach(p => {
      if (p.id === ignoreId) return;
      cellsOf(p).forEach(([cx, cy]) => occupied.add(cx + ',' + cy));
    });
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) if (occupied.has(x + dx + ',' + (y + dy))) return false;
    return true;
  }

  // synergy target cells for a buff, with rotation applied
  function synergyCells(placed) {
    const base = placed.item.key === 'compass' ? [[0, -1], [0, 1], [-1, 0], [1, 0]] // all 4 neighbours
    : placed.item.key === 'plumb' ? [[-1, 0], [1, 0]] // left / right only
    : [];
    const rot = (placed.rot || 0) % 4;
    const rotate = ([dx, dy]) => {
      let p = [dx, dy];
      for (let i = 0; i < rot; i++) p = [-p[1], p[0]]; // 90° CW
      return p;
    };
    return base.map(rotate).map(([dx, dy]) => [placed.x + dx, placed.y + dy]).filter(([cx, cy]) => inBounds(cx, cy));
  }
  function calculateStats(placed) {
    const weapons = placed.filter(p => p.item.type === 'weapon');
    const compasses = placed.filter(p => p.item.key === 'compass');
    const plumbs = placed.filter(p => p.item.key === 'plumb');
    const coats = placed.filter(p => p.item.key === 'coat');
    const occ = p => new Set(cellsOf(p).map(([x, y]) => x + ',' + y));
    const out = weapons.map(wp => {
      const wCells = occ(wp);
      let attack = wp.item.attack;
      let cdMult = 1;
      plumbs.forEach(pb => {
        if (synergyCells(pb).some(([x, y]) => wCells.has(x + ',' + y))) attack += 2;
      });
      compasses.forEach(cp => {
        if (synergyCells(cp).some(([x, y]) => wCells.has(x + ',' + y))) cdMult *= 0.8;
      });
      return {
        id: wp.id,
        key: wp.item.key,
        icon: wp.item.icon,
        nameJa: wp.item.nameJa,
        finalAttack: attack,
        finalCooldown: +(wp.item.cooldown * cdMult).toFixed(2),
        buffed: cdMult < 1 || attack > wp.item.attack
      };
    });
    return {
      maxHp: 100,
      shieldPerTick: coats.length * 4,
      weapons: out
    };
  }

  // ---- Lightweight realtime battle ----------------------------
  function simulateBattle(stats, enemy) {
    const dt = 0.1,
      maxT = 30;
    let pHp = stats.maxHp,
      pShield = 0;
    let eHp = enemy.hp,
      eShield = enemy.shield;
    const wTimers = stats.weapons.map(() => 0);
    let coatTimer = 0,
      eTimer = 0;
    const logs = [],
      history = [];
    const dealToEnemy = dmg => {
      let d = dmg;
      if (eShield > 0) {
        const a = Math.min(eShield, d);
        eShield -= a;
        d -= a;
      }
      eHp = Math.max(0, eHp - d);
    };
    const dealToPlayer = dmg => {
      let d = dmg;
      if (pShield > 0) {
        const a = Math.min(pShield, d);
        pShield -= a;
        d -= a;
      }
      pHp = Math.max(0, pHp - d);
    };
    for (let t = 0; t <= maxT + 0.0001; t += dt) {
      const ts = t.toFixed(1);
      // coat shield regen
      if (stats.shieldPerTick > 0) {
        coatTimer += dt;
        if (coatTimer >= 3) {
          coatTimer -= 3;
          pShield += stats.shieldPerTick;
          logs.push(`[${ts}s] 方位外套がシールドを+${stats.shieldPerTick}生成。`);
        }
      }
      // weapons
      stats.weapons.forEach((w, i) => {
        if (w.finalCooldown <= 0) return;
        wTimers[i] += dt;
        if (wTimers[i] >= w.finalCooldown) {
          wTimers[i] -= w.finalCooldown;
          const dmg = Math.max(1, w.finalAttack - eShield);
          dealToEnemy(w.finalAttack);
          logs.push(`[${ts}s] ${w.icon} ${w.nameJa}の調律攻撃！${Math.max(1, dmg)} DMG`);
        }
      });
      // enemy
      eTimer += dt;
      if (eTimer >= enemy.cooldown) {
        eTimer -= enemy.cooldown;
        const dmg = Math.max(1, enemy.attack - pShield);
        dealToPlayer(enemy.attack);
        logs.push(`[${ts}s] 敵の干渉波！${Math.max(1, dmg)} DMG を受けた。`);
      }
      history.push({
        t: +ts,
        pHp,
        pShield,
        eHp,
        eShield
      });
      if (pHp <= 0 || eHp <= 0) break;
    }
    let result = 'draw';
    if (eHp <= 0 && pHp > 0) result = 'win';else if (pHp <= 0) result = 'lose';else result = pHp / stats.maxHp >= eHp / enemy.hp ? 'win' : 'lose';
    return {
      result,
      logs,
      history
    };
  }
  window.GS_LOGIC = {
    GRID,
    SHOP_POOL,
    ENEMY_PRESETS,
    dims,
    cellsOf,
    canPlace,
    synergyCells,
    calculateStats,
    simulateBattle
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/grid-stella/gameLogic.js", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Panel = __ds_scope.Panel;

__ds_ns.ItemCard = __ds_scope.ItemCard;

__ds_ns.StatBar = __ds_scope.StatBar;

})();
