import React, { useState } from 'react';
import { CloseIcon } from './Icons';

const EMOJI_CATEGORIES = [
  { name: 'Smileys', emojis: '😀😃😄😁😆😅🤣😂🙂🙃😉😊😇🥰😍🤩😘😗😚😙🥲😋😛😜🤪😝🤑🤗🤭🤫🤔🫣🤐🫡🤨😐😑😶🫥😏😒🙄😬🤥🫨😌😔😪🤤😴😷🤒🤕🤢🤮🤧🥵🥶🥴😵🤯🤠🥳🥸😎🤓🧐😕🫤😟🙁☹️😮😯😲😳🥺🥹😦😧😨😰😥😢😭😱😖😣😞😓😩😫🥱😤😡😠🤬😈👿' },
  { name: 'Gestures', emojis: '👋🤚🖐️✋🖖👌🤌🤏✌️🤞🫰🤟🤘🤙🫵🫱🫲🫳🫴👈👉👆🖕👇☝️👍👎✊👊🤛🤜👏🫶🙌👐🤲🤝🙏' },
  { name: 'Hearts', emojis: '❤️🧡💛💚💙💜🖤🤍🤎💔❤️‍🔥❤️‍🩹💕💞💓💗💖💘💝💟' },
  { name: 'Animals', emojis: '🐶🐱🐭🐹🐰🦊🐻🐼🐻‍❄️🐨🐯🦁🐮🐷🐸🐵🙈🙉🙊🐒🐔🐧🐦🐤🦆🦅🦉🦇🐝🪱🐛🦋🐌🐞🐜🪰🪲🪳🦟🦗🕷️🦂🐢🐍🦎🦖🦕🐙🦑🦐🦞🦀🐡🐠🐟🐬🐳🐋🦈🦭🐊' },
  { name: 'Food', emojis: '🍎🍐🍊🍋🍌🍉🍇🍓🫐🍈🍒🍑🥭🍍🥥🥝🍅🍆🥑🥦🥬🥒🌶️🫑🌽🥕🫒🧄🧅🥔🍠🥐🥯🍞🥖🥨🧀🥚🍳🧈🥞🧇🥓🥩🍗🍖🦴🌭🍔🍟🍕🫓🥪🥙🧆🌮🌯🫔🥗🥘🫕🍝🍜🍲🍛🍣🍱🥟🦪🍤🍙🍚🍘🍥🥠🥮🍢🍡🍧🍨🍦🥧🧁🍰🎂🍮🍭🍬🍫🍿🍩🍪🌰🥜' },
  { name: 'Activities', emojis: '⚽🏀🏈⚾🥎🎾🏐🏉🥏🎱🪀🏓🏸🏒🏑🥍🏏🪃🥅⛳🪁🏹🎣🤿🥊🥋🎽🛹🛼🛷⛸️🥌🎿⛷️🏂🪂🏋️🤸🤺⛹️🤾🏌️🏇🧘🏄🏊🤽🚣🧗🚵🚴🏆🥇🥈🥉🏅🎖️🏵️🎗️🎪🎭🎨🎬🎤🎧🎼🎹🥁🪘🎷🎺🎸🪕🎻🎲♟️🎯🎳🎮🎰🧩' },
  { name: 'Travel', emojis: '🚗🚕🚙🚌🚎🏎️🚓🚑🚒🚐🛻🚚🚛🚜🦯🦽🦼🛴🚲🛵🏍️🛺🚨🚔🚍🚘🚖🚡🚠🚟🚃🚋🚞🚝🚄🚅🚈🚂🚆🚇🚊🚉✈️🛫🛬🛩️💺🛰️🚀🛸🚁🛶⛵🚤🛥️🛳️⛴️🚢⚓' },
  { name: 'Objects', emojis: '⌚📱📲💻⌨️🖥️🖨️🖱️🖲️🕹️🗜️💽💾💿📀📼📷📸📹🎥📽️🎞️📞☎️📟📠📺📻🎙️🎚️🎛️🧭⏱️⏲️⏰🕰️⌛⏳📡🔋🪫🔌💡🔦🕯️🪔🧯🗑️🛢️💸💵💴💶💷🪙💰💳💎⚖️🪜🧰🪛🔧🔨⚒️🛠️⛏️🪚🔩⚙️🪤🧲🔫💣🧨🪓🔪🗡️⚔️🛡️🚬⚰️🪦⚱️🏺🔮📿🧿🪬💈⚗️🔭🔬🕳️🩻🩹🩺💊💉🩸🧬🦠🧫🧪🌡️🧹🪠🧺🧻🚰🚿🛁🛀🧼🪥🪒🧽🪣🧴🔑🗝️🚪🪑🛋️🛏️🧸🪆🖼️🪞🪟🛍️🛒🎁🎈🎏🎀🪄🪅🎊🎉🎎🏮🎐🧧✉️📩📨📧💌📥📤📦🏷️🪧📪📫📬📭📮📯📜📃📄📑🧾📊📈📉🗒️🗓️📆📅🗑️📇🗃️🗳️🗄️📋📁📂🗂️🗞️📰📓📔📒📕📗📘📙📚📖🔖🧷🔗📎🖇️📐📏🧮📌📍✂️🖊️🖋️✒️🖌️🖍️📝✏️🔍🔎🔏🔐🔒🔓' },
];

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: Props) {
  const [category, setCategory] = useState(0);

  return (
    <div style={{
      background: 'var(--md-sys-color-surface-container)',
      borderTop: '1px solid var(--md-sys-color-outline-variant)',
      height: 280, display: 'flex', flexDirection: 'column',
    }}>
      {/* Category tabs */}
      <div style={{ display: 'flex', padding: '4px 8px', gap: 2, borderBottom: '1px solid var(--md-sys-color-outline-variant)', alignItems: 'center' }}>
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button key={cat.name} onClick={() => setCategory(i)} style={{
            padding: '6px 10px', border: 'none', cursor: 'pointer', borderRadius: 8,
            background: i === category ? 'var(--md-sys-color-primary-container)' : 'none',
            color: i === category ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface-variant)',
            fontSize: 11, fontFamily: 'var(--font-family)', fontWeight: i === category ? 600 : 400,
            transition: 'background 0.15s',
          }}>
            {cat.name}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <CloseIcon size={18} color="var(--md-sys-color-on-surface-variant)" />
        </button>
      </div>

      {/* Emoji grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {[...EMOJI_CATEGORIES[category].emojis].filter(c => c.trim()).map((emoji, i) => {
            // Handle multi-codepoint emoji — group by grapheme clusters
            return null;
          })}
        </div>
        {/* Use segmenter for proper emoji rendering */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {getEmojiList(EMOJI_CATEGORIES[category].emojis).map((emoji, i) => (
            <button key={i} onClick={() => onSelect(emoji)} style={{
              width: 36, height: 36, border: 'none', cursor: 'pointer', borderRadius: 8,
              background: 'none', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--md-sys-color-surface-container-high)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function getEmojiList(str: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new (Intl as any).Segmenter('en', { granularity: 'grapheme' });
    return [...segmenter.segment(str)].map((s: any) => s.segment).filter((s: string) => s.trim());
  }
  // Fallback
  return [...str].filter(c => c.trim());
}
